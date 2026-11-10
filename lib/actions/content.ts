"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, requireRole, recordAuditEvent } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ContentChannel, ContentType } from "@/lib/database.types";
import {
  extractTextFromBuffer,
  validateUploadFile,
  ExtractionResult,
} from "@/lib/content/extract";

export interface ParseDocumentResult {
  success: boolean;
  text?: string;
  wordCount?: number;
  format?: string;
  fileName?: string;
  error?: string;
  isUnsupportedPdf?: boolean;
}

export interface SubmissionResult {
  success: boolean;
  contentItemId?: string;
  revisionId?: string;
  reviewId?: string;
  error?: string;
}

/**
 * Server action to parse an uploaded document (.txt, .md, .docx)
 * and return extracted plain text for user confirmation.
 */
export async function parseUploadedDocumentAction(
  formData: FormData
): Promise<ParseDocumentResult> {
  try {
    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "No file was provided." };
    }

    // 1. Validate file size and extension
    const validation = validateUploadFile({
      name: file.name,
      size: file.size,
      type: file.type,
    });

    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        isUnsupportedPdf: validation.isUnsupportedPdf,
      };
    }

    // 2. Read file buffer and extract text
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const extraction: ExtractionResult = await extractTextFromBuffer(
      buffer,
      file.name
    );

    if (!extraction.success) {
      return {
        success: false,
        error: extraction.error,
        isUnsupportedPdf: extraction.isUnsupportedPdf,
      };
    }

    return {
      success: true,
      text: extraction.text,
      wordCount: extraction.wordCount,
      format: extraction.format,
      fileName: file.name,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Failed to process document: ${err?.message || "Unknown error"}`,
    };
  }
}

/**
 * Server action to create a new content item submission:
 * 1. Validates role and inputs
 * 2. Uploads original document to private content-uploads bucket
 * 3. Creates content_item row
 * 4. Creates revision v1 row
 * 5. Creates initial review in 'draft' status
 * 6. Records audit event
 */
export async function createContentSubmissionAction(
  formData: FormData
): Promise<SubmissionResult> {
  try {
    const workspaceId = formData.get("workspaceId")?.toString().trim();
    const title = formData.get("title")?.toString().trim();
    const channel = (formData.get("channel")?.toString().trim() || "web") as ContentChannel;
    const contentType = (formData.get("contentType")?.toString().trim() || "text") as ContentType;
    const intendedMessage = formData.get("intendedMessage")?.toString().trim();
    const campaignContext = formData.get("campaignContext")?.toString().trim() || null;
    const draftText = formData.get("draftText")?.toString().trim();
    const originalFile = formData.get("originalFile") as File | null;

    if (!workspaceId) {
      return { success: false, error: "Workspace ID is required." };
    }
    if (!title) {
      return { success: false, error: "Submission title is required." };
    }
    if (!intendedMessage) {
      return {
        success: false,
        error: "Intended message is required. Provide a one-sentence summary of what this copy communicates.",
      };
    }
    if (!draftText) {
      return {
        success: false,
        error: "Draft copy cannot be empty. Please paste your draft or upload a document.",
      };
    }

    // Role check: Creators and Admins can submit drafts
    const { user } = await requireRole(workspaceId, ["creator", "admin"]);
    const adminSb = createAdminClient();

    // 1. Create content item
    const { data: contentItem, error: itemErr } = await adminSb
      .from("content_items")
      .insert({
        workspace_id: workspaceId,
        title,
        channel,
        content_type: contentType,
        intended_message: intendedMessage,
        campaign_context: campaignContext,
        created_by: user.id,
      })
      .select()
      .single();

    if (itemErr || !contentItem) {
      return {
        success: false,
        error: `Failed to create content item: ${itemErr?.message}`,
      };
    }

    // 2. If original file exists, upload to private bucket: {workspace_id}/{content_item_id}/{filename}
    let storagePath: string | null = null;
    if (originalFile && originalFile.size > 0) {
      const cleanFileName = originalFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      storagePath = `${workspaceId}/${contentItem.id}/${cleanFileName}`;

      const arrayBuffer = await originalFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadErr } = await adminSb.storage
        .from("content-uploads")
        .upload(storagePath, buffer, {
          contentType: originalFile.type || "application/octet-stream",
          upsert: true,
        });

      if (uploadErr) {
        console.warn("Could not archive original file in content-uploads:", uploadErr.message);
      }
    }

    // 3. Create Revision v1
    const { data: revision, error: revErr } = await adminSb
      .from("revisions")
      .insert({
        content_item_id: contentItem.id,
        version: 1,
        body: draftText,
        original_file_path: storagePath,
        created_by: user.id,
        source_versions_snapshot: {},
      })
      .select()
      .single();

    if (revErr || !revision) {
      return {
        success: false,
        error: `Failed to create revision: ${revErr?.message}`,
      };
    }

    // Update content_item's current_revision_id
    await adminSb
      .from("content_items")
      .update({ current_revision_id: revision.id })
      .eq("id", contentItem.id);

    // 4. Create initial Review in 'draft' status
    const { data: review, error: rewErr } = await adminSb
      .from("reviews")
      .insert({
        content_item_id: contentItem.id,
        revision_id: revision.id,
        status: "draft",
      })
      .select()
      .single();

    if (rewErr || !review) {
      return {
        success: false,
        error: `Failed to create review: ${rewErr?.message}`,
      };
    }

    // 5. Record Audit Event
    await recordAuditEvent({
      workspaceId,
      actorId: user.id,
      eventType: "content_item_created",
      entityType: "content_item",
      entityId: contentItem.id,
      payload: {
        title: contentItem.title,
        channel: contentItem.channel,
        version: 1,
        word_count: draftText.split(/\s+/).filter(Boolean).length,
        has_original_file: Boolean(storagePath),
      },
      injectedClient: adminSb,
    });

    revalidatePath("/reviews");

    return {
      success: true,
      contentItemId: contentItem.id,
      revisionId: revision.id,
      reviewId: review.id,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to create content submission.",
    };
  }
}

