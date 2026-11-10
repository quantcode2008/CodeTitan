"use server";

import { requireRole, recordAuditEvent } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { generateNextSourceKey } from "@/lib/brand/source-key";
import {
  CreateBrandSourceSchema,
  UpdateBrandSourceSchema,
  CreateBrandTermSchema,
  UpdateBrandTermSchema,
  CreateBrandFactSchema,
  UpdateBrandFactSchema,
  CreateBrandAssetSchema,
  BatchImportSchema,
} from "@/lib/brand/schema";
import { revalidatePath } from "next/cache";

export interface BrandActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// =============================================================================
// BRAND SOURCES ACTIONS
// =============================================================================

export async function createBrandSourceAction(
  workspaceId: string,
  rawData: unknown
): Promise<BrandActionResult> {
  try {
    const { user } = await requireRole(workspaceId, ["admin"]);
    const parsed = CreateBrandSourceSchema.parse(rawData);

    const adminSb = createAdminClient();

    // 1. Fetch existing keys to determine next sequential key
    const { data: existingRecords } = await adminSb
      .from("brand_sources")
      .select("source_key")
      .eq("workspace_id", workspaceId);

    const existingKeys = (existingRecords || []).map((r) => r.source_key);
    const nextKey = generateNextSourceKey(existingKeys);

    // 2. Insert new source
    const { data: newSource, error: insertError } = await adminSb
      .from("brand_sources")
      .insert({
        workspace_id: workspaceId,
        source_key: nextKey,
        type: parsed.type,
        title: parsed.title,
        body: parsed.body,
        owner_id: parsed.owner_id || user.id,
        review_by: parsed.review_by || null,
        status: "active",
        current_version: 1,
        tags: parsed.tags,
      })
      .select()
      .single();

    if (insertError || !newSource) {
      return { success: false, error: insertError?.message || "Failed to create source." };
    }

    // 3. Create initial immutable version snapshot
    await adminSb.from("brand_source_versions").insert({
      source_id: newSource.id,
      version: 1,
      title: newSource.title,
      body: newSource.body,
      changed_by: user.id,
      change_note: "Initial source creation",
    });

    // 4. Record audit event
    await recordAuditEvent({
      workspaceId,
      actorId: user.id,
      eventType: "source_created",
      entityType: "brand_source",
      entityId: newSource.id,
      payload: {
        source_key: nextKey,
        title: newSource.title,
        type: newSource.type,
      },
      injectedClient: adminSb,
    });

    revalidatePath("/brand");
    revalidatePath("/brand/sources");
    return { success: true, data: newSource };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create brand source." };
  }
}

export async function updateBrandSourceAction(
  workspaceId: string,
  rawData: unknown
): Promise<BrandActionResult> {
  try {
    const { user } = await requireRole(workspaceId, ["admin"]);
    const parsed = UpdateBrandSourceSchema.parse(rawData);

    const adminSb = createAdminClient();

    // Fetch current record
    const { data: existing, error: fetchError } = await adminSb
      .from("brand_sources")
      .select("id, current_version, title, body, source_key")
      .eq("id", parsed.id)
      .eq("workspace_id", workspaceId)
      .single();

    if (fetchError || !existing) {
      return { success: false, error: "Brand source not found." };
    }

    // 1. Update source record (DB trigger will snapshot old version into brand_source_versions)
    const { data: updated, error: updateError } = await adminSb
      .from("brand_sources")
      .update({
        title: parsed.title,
        body: parsed.body,
        type: parsed.type,
        review_by: parsed.review_by || null,
        status: parsed.status,
        tags: parsed.tags,
      })
      .eq("id", parsed.id)
      .select()
      .single();

    if (updateError || !updated) {
      return { success: false, error: updateError?.message || "Failed to update source." };
    }

    // 2. Attach user's required change note to the newly snapshotted version
    await adminSb
      .from("brand_source_versions")
      .update({
        change_note: parsed.change_note,
        changed_by: user.id,
      })
      .eq("source_id", parsed.id)
      .eq("version", existing.current_version);

    // 3. Record audit event
    await recordAuditEvent({
      workspaceId,
      actorId: user.id,
      eventType: "source_updated",
      entityType: "brand_source",
      entityId: parsed.id,
      payload: {
        source_key: existing.source_key,
        new_version: updated.current_version,
        change_note: parsed.change_note,
      },
      injectedClient: adminSb,
    });

    revalidatePath("/brand");
    revalidatePath("/brand/sources");
    revalidatePath(`/brand/sources/${parsed.id}`);
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update brand source." };
  }
}

export async function archiveBrandSourceAction(
  workspaceId: string,
  sourceId: string
): Promise<BrandActionResult> {
  try {
    const { user } = await requireRole(workspaceId, ["admin"]);
    const adminSb = createAdminClient();

    const { data: updated, error } = await adminSb
      .from("brand_sources")
      .update({ status: "archived" })
      .eq("id", sourceId)
      .eq("workspace_id", workspaceId)
      .select("id, source_key")
      .single();

    if (error || !updated) {
      return { success: false, error: error?.message || "Failed to archive source." };
    }

    await recordAuditEvent({
      workspaceId,
      actorId: user.id,
      eventType: "source_archived",
      entityType: "brand_source",
      entityId: sourceId,
      payload: { source_key: updated.source_key },
      injectedClient: adminSb,
    });

    revalidatePath("/brand");
    revalidatePath("/brand/sources");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to archive source." };
  }
}

// =============================================================================
// BRAND TERMS ACTIONS
// =============================================================================

export async function createBrandTermAction(
  workspaceId: string,
  rawData: unknown
): Promise<BrandActionResult> {
  try {
    const { user } = await requireRole(workspaceId, ["admin"]);
    const parsed = CreateBrandTermSchema.parse(rawData);

    const adminSb = createAdminClient();

    const { data: term, error } = await adminSb
      .from("brand_terms")
      .insert({
        workspace_id: workspaceId,
        term: parsed.term,
        kind: parsed.kind,
        replacement: parsed.replacement || null,
        severity: parsed.severity,
        source_id: parsed.source_id || null,
        notes: parsed.notes || null,
      })
      .select()
      .single();

    if (error || !term) {
      return { success: false, error: error?.message || "Failed to add term." };
    }

    await recordAuditEvent({
      workspaceId,
      actorId: user.id,
      eventType: "term_created",
      entityType: "brand_term",
      entityId: term.id,
      payload: { term: term.term, kind: term.kind, severity: term.severity },
      injectedClient: adminSb,
    });

    revalidatePath("/brand/terms");
    return { success: true, data: term };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to add brand term." };
  }
}

export async function updateBrandTermAction(
  workspaceId: string,
  rawData: unknown
): Promise<BrandActionResult> {
  try {
    const { user } = await requireRole(workspaceId, ["admin"]);
    const parsed = UpdateBrandTermSchema.parse(rawData);

    const adminSb = createAdminClient();

    const { data: term, error } = await adminSb
      .from("brand_terms")
      .update({
        term: parsed.term,
        kind: parsed.kind,
        replacement: parsed.replacement || null,
        severity: parsed.severity,
        source_id: parsed.source_id || null,
        notes: parsed.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.id)
      .eq("workspace_id", workspaceId)
      .select()
      .single();

    if (error || !term) {
      return { success: false, error: error?.message || "Failed to update term." };
    }

    await recordAuditEvent({
      workspaceId,
      actorId: user.id,
      eventType: "term_updated",
      entityType: "brand_term",
      entityId: term.id,
      payload: { term: term.term, kind: term.kind },
      injectedClient: adminSb,
    });

    revalidatePath("/brand/terms");
    return { success: true, data: term };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update brand term." };
  }
}

export async function deleteBrandTermAction(
  workspaceId: string,
  termId: string
): Promise<BrandActionResult> {
  try {
    const { user } = await requireRole(workspaceId, ["admin"]);
    const adminSb = createAdminClient();

    const { error } = await adminSb
      .from("brand_terms")
      .delete()
      .eq("id", termId)
      .eq("workspace_id", workspaceId);

    if (error) {
      return { success: false, error: error.message };
    }

    await recordAuditEvent({
      workspaceId,
      actorId: user.id,
      eventType: "term_deleted",
      entityType: "brand_term",
      entityId: termId,
      injectedClient: adminSb,
    });

    revalidatePath("/brand/terms");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete brand term." };
  }
}

// =============================================================================
// BRAND FACTS ACTIONS
// =============================================================================

export async function createBrandFactAction(
  workspaceId: string,
  rawData: unknown
): Promise<BrandActionResult> {
  try {
    const { user } = await requireRole(workspaceId, ["admin"]);
    const parsed = CreateBrandFactSchema.parse(rawData);

    const adminSb = createAdminClient();

    const { data: fact, error } = await adminSb
      .from("brand_facts")
      .insert({
        workspace_id: workspaceId,
        key: parsed.key,
        value: parsed.value,
        unit: parsed.unit || null,
        valid_from: parsed.valid_from || null,
        valid_until: parsed.valid_until || null,
        source_id: parsed.source_id || null,
      })
      .select()
      .single();

    if (error || !fact) {
      return { success: false, error: error?.message || "Failed to add fact." };
    }

    await recordAuditEvent({
      workspaceId,
      actorId: user.id,
      eventType: "fact_created",
      entityType: "brand_fact",
      entityId: fact.id,
      payload: { key: fact.key, value: fact.value },
      injectedClient: adminSb,
    });

    revalidatePath("/brand/facts");
    return { success: true, data: fact };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to add brand fact." };
  }
}

export async function updateBrandFactAction(
  workspaceId: string,
  rawData: unknown
): Promise<BrandActionResult> {
  try {
    const { user } = await requireRole(workspaceId, ["admin"]);
    const parsed = UpdateBrandFactSchema.parse(rawData);

    const adminSb = createAdminClient();

    const { data: fact, error } = await adminSb
      .from("brand_facts")
      .update({
        key: parsed.key,
        value: parsed.value,
        unit: parsed.unit || null,
        valid_from: parsed.valid_from || null,
        valid_until: parsed.valid_until || null,
        source_id: parsed.source_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.id)
      .eq("workspace_id", workspaceId)
      .select()
      .single();

    if (error || !fact) {
      return { success: false, error: error?.message || "Failed to update fact." };
    }

    await recordAuditEvent({
      workspaceId,
      actorId: user.id,
      eventType: "fact_updated",
      entityType: "brand_fact",
      entityId: fact.id,
      payload: { key: fact.key, value: fact.value },
      injectedClient: adminSb,
    });

    revalidatePath("/brand/facts");
    return { success: true, data: fact };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update brand fact." };
  }
}

export async function deleteBrandFactAction(
  workspaceId: string,
  factId: string
): Promise<BrandActionResult> {
  try {
    const { user } = await requireRole(workspaceId, ["admin"]);
    const adminSb = createAdminClient();

    const { error } = await adminSb
      .from("brand_facts")
      .delete()
      .eq("id", factId)
      .eq("workspace_id", workspaceId);

    if (error) {
      return { success: false, error: error.message };
    }

    await recordAuditEvent({
      workspaceId,
      actorId: user.id,
      eventType: "fact_deleted",
      entityType: "brand_fact",
      entityId: factId,
      injectedClient: adminSb,
    });

    revalidatePath("/brand/facts");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete brand fact." };
  }
}

// =============================================================================
// BRAND ASSETS ACTIONS
// =============================================================================

export async function createBrandAssetAction(
  workspaceId: string,
  rawData: unknown
): Promise<BrandActionResult> {
  try {
    const { user } = await requireRole(workspaceId, ["admin"]);
    const parsed = CreateBrandAssetSchema.parse(rawData);

    const adminSb = createAdminClient();

    const { data: asset, error } = await adminSb
      .from("brand_assets")
      .insert({
        workspace_id: workspaceId,
        name: parsed.name,
        storage_path: parsed.storage_path,
        alt_text_required: parsed.alt_text_required,
        usage_rule: parsed.usage_rule,
        source_id: parsed.source_id || null,
      })
      .select()
      .single();

    if (error || !asset) {
      return { success: false, error: error?.message || "Failed to create asset record." };
    }

    await recordAuditEvent({
      workspaceId,
      actorId: user.id,
      eventType: "asset_created",
      entityType: "brand_asset",
      entityId: asset.id,
      payload: { name: asset.name, storage_path: asset.storage_path },
      injectedClient: adminSb,
    });

    revalidatePath("/brand/assets");
    return { success: true, data: asset };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to register brand asset." };
  }
}

export async function uploadBrandAssetAction(
  workspaceId: string,
  formData: FormData
): Promise<BrandActionResult> {
  try {
    const { user } = await requireRole(workspaceId, ["admin"]);

    const file = formData.get("file") as File | null;
    const name = formData.get("name")?.toString().trim();
    const altTextRequired = formData.get("altTextRequired") === "true";
    const usageRule = formData.get("usageRule")?.toString().trim();
    const sourceId = formData.get("sourceId")?.toString().trim() || null;

    if (!file || file.size === 0) {
      return { success: false, error: "Please select an image file to upload." };
    }
    if (!name) {
      return { success: false, error: "Asset name is required." };
    }
    if (!usageRule) {
      return { success: false, error: "Usage rule is required." };
    }

    const adminSb = createAdminClient();

    // Generate safe storage path in private bucket
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storagePath = `${workspaceId}/${Date.now()}-${cleanFileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to private bucket
    const { error: uploadError } = await adminSb.storage
      .from("brand-assets")
      .upload(storagePath, buffer, {
        contentType: file.type || "image/png",
        upsert: false,
      });

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    // Insert asset row
    const { data: asset, error: dbError } = await adminSb
      .from("brand_assets")
      .insert({
        workspace_id: workspaceId,
        name,
        storage_path: storagePath,
        alt_text_required: altTextRequired,
        usage_rule: usageRule,
        source_id: sourceId || null,
      })
      .select()
      .single();

    if (dbError || !asset) {
      return { success: false, error: dbError?.message || "Failed to record asset." };
    }

    await recordAuditEvent({
      workspaceId,
      actorId: user.id,
      eventType: "asset_uploaded",
      entityType: "brand_asset",
      entityId: asset.id,
      payload: { name, storage_path: storagePath },
      injectedClient: adminSb,
    });

    revalidatePath("/brand/assets");
    return { success: true, data: asset };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to upload asset." };
  }
}

export async function deleteBrandAssetAction(
  workspaceId: string,
  assetId: string
): Promise<BrandActionResult> {
  try {
    const { user } = await requireRole(workspaceId, ["admin"]);
    const adminSb = createAdminClient();

    const { data: existing } = await adminSb
      .from("brand_assets")
      .select("id, storage_path")
      .eq("id", assetId)
      .eq("workspace_id", workspaceId)
      .single();

    if (existing?.storage_path) {
      await adminSb.storage.from("brand-assets").remove([existing.storage_path]);
    }

    const { error } = await adminSb
      .from("brand_assets")
      .delete()
      .eq("id", assetId)
      .eq("workspace_id", workspaceId);

    if (error) {
      return { success: false, error: error.message };
    }

    await recordAuditEvent({
      workspaceId,
      actorId: user.id,
      eventType: "asset_deleted",
      entityType: "brand_asset",
      entityId: assetId,
      injectedClient: adminSb,
    });

    revalidatePath("/brand/assets");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete brand asset." };
  }
}

export async function getSignedAssetUrlAction(
  storagePath: string
): Promise<{ signedUrl: string | null; error?: string }> {
  try {
    const adminSb = createAdminClient();
    const { data, error } = await adminSb.storage
      .from("brand-assets")
      .createSignedUrl(storagePath, 3600); // 1 hour validity

    if (error || !data) {
      return { signedUrl: null, error: error?.message || "Could not generate signed URL" };
    }

    return { signedUrl: data.signedUrl };
  } catch (err: any) {
    return { signedUrl: null, error: err.message };
  }
}

// =============================================================================
// BATCH IMPORT GUIDELINES ACTION
// =============================================================================

export async function batchImportSourcesAction(
  workspaceId: string,
  rawData: unknown
): Promise<BrandActionResult<{ count: number; keys: string[] }>> {
  try {
    const { user } = await requireRole(workspaceId, ["admin"]);
    const parsed = BatchImportSchema.parse(rawData);

    const adminSb = createAdminClient();

    // 1. Fetch current keys
    const { data: existingRecords } = await adminSb
      .from("brand_sources")
      .select("source_key")
      .eq("workspace_id", workspaceId);

    const runningKeys = (existingRecords || []).map((r) => r.source_key);
    const createdKeys: string[] = [];

    // 2. Iterate and create sequentially
    for (const item of parsed.sources) {
      const nextKey = generateNextSourceKey(runningKeys);
      runningKeys.push(nextKey);
      createdKeys.push(nextKey);

      const { data: newSource, error } = await adminSb
        .from("brand_sources")
        .insert({
          workspace_id: workspaceId,
          source_key: nextKey,
          type: item.type,
          title: item.title,
          body: item.body,
          owner_id: user.id,
          review_by: item.review_by || null,
          status: "active",
          current_version: 1,
          tags: item.tags || [],
        })
        .select()
        .single();

      if (error || !newSource) {
        throw new Error(error?.message || `Failed to insert source "${item.title}".`);
      }

      // Initial version
      await adminSb.from("brand_source_versions").insert({
        source_id: newSource.id,
        version: 1,
        title: newSource.title,
        body: newSource.body,
        changed_by: user.id,
        change_note: "Batch imported from guideline documentation",
      });
    }

    // 3. Audit event
    await recordAuditEvent({
      workspaceId,
      actorId: user.id,
      eventType: "sources_batch_imported",
      entityType: "brand_sources",
      entityId: workspaceId,
      payload: {
        imported_count: createdKeys.length,
        created_keys: createdKeys,
      },
      injectedClient: adminSb,
    });

    revalidatePath("/brand");
    revalidatePath("/brand/sources");
    return { success: true, data: { count: createdKeys.length, keys: createdKeys } };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to batch import guidelines." };
  }
}
