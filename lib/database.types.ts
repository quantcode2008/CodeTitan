export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type WorkspaceRole = "admin" | "creator" | "reviewer";
export type BrandSourceType =
  | "guideline"
  | "fact"
  | "claim_policy"
  | "terminology"
  | "tone_example"
  | "asset_rule";
export type BrandSourceStatus = "active" | "archived";
export type BrandTermKind = "prohibited" | "preferred" | "required_phrase";
export type SeverityLevel = "critical" | "major" | "minor" | "advisory";
export type ContentChannel = "social" | "web" | "email" | "press" | "ad" | "other";
export type ContentType = "text" | "document";
export type ReviewStatus =
  | "draft"
  | "needs_attention"
  | "ready_for_review"
  | "approved"
  | "changes_requested"
  | "rejected";
export type FindingLane = "rule" | "llm";
export type FindingCategory =
  | "tone"
  | "terminology"
  | "messaging"
  | "claim"
  | "fact"
  | "accessibility"
  | "visual"
  | "other";
export type EvidenceStatus = "verified" | "unverified" | "needs_human_judgement";
export type FindingStatus = "open" | "accepted" | "edited" | "dismissed" | "explained";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      workspaces: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      workspace_members: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          role: WorkspaceRole;
          is_designated_reviewer: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          role?: WorkspaceRole;
          is_designated_reviewer?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          role?: WorkspaceRole;
          is_designated_reviewer?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      brand_sources: {
        Row: {
          id: string;
          workspace_id: string;
          source_key: string;
          type: BrandSourceType;
          title: string;
          body: string;
          owner_id: string | null;
          review_by: string | null;
          status: BrandSourceStatus;
          current_version: number;
          tags: string[];
          search: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          source_key: string;
          type: BrandSourceType;
          title: string;
          body: string;
          owner_id?: string | null;
          review_by?: string | null;
          status?: BrandSourceStatus;
          current_version?: number;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          source_key?: string;
          type?: BrandSourceType;
          title?: string;
          body?: string;
          owner_id?: string | null;
          review_by?: string | null;
          status?: BrandSourceStatus;
          current_version?: number;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
      brand_source_versions: {
        Row: {
          id: string;
          source_id: string;
          version: number;
          title: string;
          body: string;
          changed_by: string | null;
          change_note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          source_id: string;
          version: number;
          title: string;
          body: string;
          changed_by?: string | null;
          change_note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          source_id?: string;
          version?: number;
          title?: string;
          body?: string;
          changed_by?: string | null;
          change_note?: string | null;
          created_at?: string;
        };
      };
      brand_terms: {
        Row: {
          id: string;
          workspace_id: string;
          term: string;
          kind: BrandTermKind;
          replacement: string | null;
          severity: SeverityLevel;
          source_id: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          term: string;
          kind: BrandTermKind;
          replacement?: string | null;
          severity?: SeverityLevel;
          source_id?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          term?: string;
          kind?: BrandTermKind;
          replacement?: string | null;
          severity?: SeverityLevel;
          source_id?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      brand_facts: {
        Row: {
          id: string;
          workspace_id: string;
          key: string;
          value: string;
          unit: string | null;
          valid_from: string | null;
          valid_until: string | null;
          source_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          key: string;
          value: string;
          unit?: string | null;
          valid_from?: string | null;
          valid_until?: string | null;
          source_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          key?: string;
          value?: string;
          unit?: string | null;
          valid_from?: string | null;
          valid_until?: string | null;
          source_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      brand_assets: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          storage_path: string;
          alt_text_required: boolean;
          usage_rule: string | null;
          source_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          storage_path: string;
          alt_text_required?: boolean;
          usage_rule?: string | null;
          source_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          storage_path?: string;
          alt_text_required?: boolean;
          usage_rule?: string | null;
          source_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      content_items: {
        Row: {
          id: string;
          workspace_id: string;
          title: string;
          channel: ContentChannel;
          content_type: ContentType;
          intended_message: string | null;
          campaign_context: string | null;
          created_by: string | null;
          current_revision_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          title: string;
          channel?: ContentChannel;
          content_type?: ContentType;
          intended_message?: string | null;
          campaign_context?: string | null;
          created_by?: string | null;
          current_revision_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          title?: string;
          channel?: ContentChannel;
          content_type?: ContentType;
          intended_message?: string | null;
          campaign_context?: string | null;
          created_by?: string | null;
          current_revision_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      revisions: {
        Row: {
          id: string;
          content_item_id: string;
          version: number;
          body: string;
          original_file_path: string | null;
          created_by: string | null;
          source_versions_snapshot: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          content_item_id: string;
          version?: number;
          body: string;
          original_file_path?: string | null;
          created_by?: string | null;
          source_versions_snapshot?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          content_item_id?: string;
          version?: number;
          body?: string;
          original_file_path?: string | null;
          created_by?: string | null;
          source_versions_snapshot?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      reviews: {
        Row: {
          id: string;
          content_item_id: string;
          revision_id: string;
          status: ReviewStatus;
          assigned_reviewer_id: string | null;
          decided_by: string | null;
          decision_reason: string | null;
          decided_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          content_item_id: string;
          revision_id: string;
          status?: ReviewStatus;
          assigned_reviewer_id?: string | null;
          decided_by?: string | null;
          decision_reason?: string | null;
          decided_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          content_item_id?: string;
          revision_id?: string;
          status?: ReviewStatus;
          assigned_reviewer_id?: string | null;
          decided_by?: string | null;
          decision_reason?: string | null;
          decided_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      findings: {
        Row: {
          id: string;
          review_id: string;
          lane: FindingLane;
          category: FindingCategory;
          severity: SeverityLevel;
          span_start: number;
          span_end: number;
          span_text: string;
          explanation: string;
          source_id: string | null;
          source_key: string | null;
          evidence_status: EvidenceStatus;
          confidence: number | null;
          suggestion: string | null;
          status: FindingStatus;
          resolution_note: string | null;
          resolved_by: string | null;
          resolved_at: string | null;
          requires_designated_reviewer: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          review_id: string;
          lane: FindingLane;
          category: FindingCategory;
          severity: SeverityLevel;
          span_start?: number;
          span_end?: number;
          span_text: string;
          explanation: string;
          source_id?: string | null;
          source_key?: string | null;
          evidence_status?: EvidenceStatus;
          confidence?: number | null;
          suggestion?: string | null;
          status?: FindingStatus;
          resolution_note?: string | null;
          resolved_by?: string | null;
          resolved_at?: string | null;
          requires_designated_reviewer?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          review_id?: string;
          lane?: FindingLane;
          category?: FindingCategory;
          severity?: SeverityLevel;
          span_start?: number;
          span_end?: number;
          span_text?: string;
          explanation?: string;
          source_id?: string | null;
          source_key?: string | null;
          evidence_status?: EvidenceStatus;
          confidence?: number | null;
          suggestion?: string | null;
          status?: FindingStatus;
          resolution_note?: string | null;
          resolved_by?: string | null;
          resolved_at?: string | null;
          requires_designated_reviewer?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      comments: {
        Row: {
          id: string;
          review_id: string;
          finding_id: string | null;
          author_id: string | null;
          body: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          review_id: string;
          finding_id?: string | null;
          author_id?: string | null;
          body: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          review_id?: string;
          finding_id?: string | null;
          author_id?: string | null;
          body?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      audit_events: {
        Row: {
          id: string;
          workspace_id: string;
          actor_id: string | null;
          event_type: string;
          entity_type: string;
          entity_id: string | null;
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          actor_id?: string | null;
          event_type: string;
          entity_type: string;
          entity_id?: string | null;
          payload?: Json;
          created_at?: string;
        };
        Update: never; // Append-only ledger
      };
    };
    Functions: {
      search_sources: {
        Args: {
          lookup_workspace_id: string;
          query_text: string;
          result_limit?: number;
        };
        Returns: {
          source_id: string;
          source_key: string;
          title: string;
          snippet: string;
          rank: number;
        }[];
      };
      is_member: {
        Args: {
          lookup_workspace_id: string;
        };
        Returns: boolean;
      };
      has_role: {
        Args: {
          lookup_workspace_id: string;
          required_role: WorkspaceRole;
        };
        Returns: boolean;
      };
      has_any_role: {
        Args: {
          lookup_workspace_id: string;
          required_roles: WorkspaceRole[];
        };
        Returns: boolean;
      };
    };
    Enums: {
      workspace_role: WorkspaceRole;
      brand_source_type: BrandSourceType;
      brand_source_status: BrandSourceStatus;
      brand_term_kind: BrandTermKind;
      severity_level: SeverityLevel;
      content_channel: ContentChannel;
      content_type: ContentType;
      review_status: ReviewStatus;
      finding_lane: FindingLane;
      finding_category: FindingCategory;
      evidence_status: EvidenceStatus;
      finding_status: FindingStatus;
    };
  };
}

