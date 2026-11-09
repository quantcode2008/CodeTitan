-- =============================================================================
-- BrandProof Database Schema Migration 001: Initial Tables, Enums, Indexes, Triggers
-- Architecture: Inkloom AI Brand Governance Workspace
-- =============================================================================

-- Ensure necessary extensions exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. Custom ENUM Types
-- -----------------------------------------------------------------------------
CREATE TYPE workspace_role AS ENUM (
  'admin',
  'creator',
  'reviewer'
);

CREATE TYPE brand_source_type AS ENUM (
  'guideline',
  'fact',
  'claim_policy',
  'terminology',
  'tone_example',
  'asset_rule'
);

CREATE TYPE brand_source_status AS ENUM (
  'active',
  'archived'
);

CREATE TYPE brand_term_kind AS ENUM (
  'prohibited',
  'preferred',
  'required_phrase'
);

CREATE TYPE severity_level AS ENUM (
  'critical',
  'major',
  'minor',
  'advisory'
);

CREATE TYPE content_channel AS ENUM (
  'social',
  'web',
  'email',
  'press',
  'ad',
  'other'
);

CREATE TYPE content_type AS ENUM (
  'text',
  'document'
);

CREATE TYPE review_status AS ENUM (
  'draft',
  'needs_attention',
  'ready_for_review',
  'approved',
  'changes_requested',
  'rejected'
);

CREATE TYPE finding_lane AS ENUM (
  'rule',
  'llm'
);

CREATE TYPE finding_category AS ENUM (
  'tone',
  'terminology',
  'messaging',
  'claim',
  'fact',
  'accessibility',
  'visual',
  'other'
);

CREATE TYPE evidence_status AS ENUM (
  'verified',
  'unverified',
  'needs_human_judgement'
);

CREATE TYPE finding_status AS ENUM (
  'open',
  'accepted',
  'edited',
  'dismissed',
  'explained'
);

-- -----------------------------------------------------------------------------
-- 2. Core Tables
-- -----------------------------------------------------------------------------

-- 2.1 User Profiles (linked 1:1 to auth.users)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.2 Workspaces
CREATE TABLE workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.3 Workspace Members (RBAC: admin, creator, reviewer)
CREATE TABLE workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role workspace_role NOT NULL DEFAULT 'creator',
  is_designated_reviewer boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (workspace_id, user_id)
);

-- 2.4 Brand Sources (Controlled Brand Knowledge Base)
CREATE TABLE brand_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  source_key text NOT NULL, -- e.g. 'S-014'
  type brand_source_type NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  review_by date,
  status brand_source_status NOT NULL DEFAULT 'active',
  current_version integer NOT NULL DEFAULT 1,
  tags text[] DEFAULT '{}'::text[] NOT NULL,
  search tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(source_key, '') || ' ' || coalesce(title, '') || ' ' || coalesce(body, ''))
  ) STORED,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (workspace_id, source_key)
);

-- 2.5 Brand Source Versions (Immutable History)
CREATE TABLE brand_source_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES brand_sources(id) ON DELETE CASCADE,
  version integer NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  changed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  change_note text,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (source_id, version)
);

-- 2.6 Brand Terms (Prohibited, Preferred, Required Phrases)
CREATE TABLE brand_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  term text NOT NULL,
  kind brand_term_kind NOT NULL,
  replacement text,
  severity severity_level NOT NULL DEFAULT 'major',
  source_id uuid REFERENCES brand_sources(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.7 Brand Facts (Stale-Stat & Fact Matching)
CREATE TABLE brand_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text NOT NULL,
  unit text,
  valid_from date,
  valid_until date,
  source_id uuid REFERENCES brand_sources(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.8 Brand Assets (Logos, Badges, Typography Assets)
CREATE TABLE brand_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  storage_path text NOT NULL,
  alt_text_required boolean NOT NULL DEFAULT true,
  usage_rule text,
  source_id uuid REFERENCES brand_sources(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.9 Content Items (Parent container for copy/documents)
CREATE TABLE content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  channel content_channel NOT NULL DEFAULT 'web',
  content_type content_type NOT NULL DEFAULT 'text',
  intended_message text,
  campaign_context text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  current_revision_id uuid, -- referenced circularly to revisions(id) below
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.10 Revisions (Draft revisions with source version snapshot)
CREATE TABLE revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id uuid NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  body text NOT NULL,
  original_file_path text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  source_versions_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (content_item_id, version)
);

-- Add foreign key constraint for current_revision_id on content_items
ALTER TABLE content_items
  ADD CONSTRAINT fk_content_items_current_revision
  FOREIGN KEY (current_revision_id)
  REFERENCES revisions(id)
  ON DELETE SET NULL;

-- 2.11 Reviews (Review cycle tied to a specific revision)
CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id uuid NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  revision_id uuid NOT NULL REFERENCES revisions(id) ON DELETE CASCADE,
  status review_status NOT NULL DEFAULT 'draft',
  assigned_reviewer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  decided_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  decision_reason text,
  decided_at timestamptz,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.12 Findings (Atomic brand issues linked to source citations)
CREATE TABLE findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  lane finding_lane NOT NULL,
  category finding_category NOT NULL,
  severity severity_level NOT NULL,
  span_start integer NOT NULL DEFAULT 0,
  span_end integer NOT NULL DEFAULT 0,
  span_text text NOT NULL,
  explanation text NOT NULL,
  source_id uuid REFERENCES brand_sources(id) ON DELETE SET NULL,
  source_key text,
  evidence_status evidence_status NOT NULL DEFAULT 'unverified',
  confidence numeric(4, 3),
  suggestion text,
  status finding_status NOT NULL DEFAULT 'open',
  resolution_note text,
  resolved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  requires_designated_reviewer boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.13 Comments (Reviewer/Creator threaded discussion on findings)
CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  finding_id uuid REFERENCES findings(id) ON DELETE CASCADE,
  author_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  body text NOT NULL,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.14 Audit Events (APPEND-ONLY immutable ledger)
CREATE TABLE audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  payload jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- -----------------------------------------------------------------------------
-- 3. Indexes for High-Velocity Querying
-- -----------------------------------------------------------------------------
CREATE INDEX idx_brand_sources_search ON brand_sources USING GIN (search);
CREATE INDEX idx_brand_sources_workspace ON brand_sources (workspace_id);
CREATE INDEX idx_brand_sources_type ON brand_sources (workspace_id, type);
CREATE INDEX idx_brand_source_versions_source ON brand_source_versions (source_id);
CREATE INDEX idx_brand_terms_workspace ON brand_terms (workspace_id, kind);
CREATE INDEX idx_brand_facts_workspace ON brand_facts (workspace_id, key);
CREATE INDEX idx_brand_assets_workspace ON brand_assets (workspace_id);
CREATE INDEX idx_content_items_workspace ON content_items (workspace_id, created_by);
CREATE INDEX idx_revisions_content_item ON revisions (content_item_id);
CREATE INDEX idx_reviews_content_item ON reviews (content_item_id);
CREATE INDEX idx_reviews_revision ON reviews (revision_id);
CREATE INDEX idx_findings_review_status ON findings (review_id, status);
CREATE INDEX idx_findings_source ON findings (source_id);
CREATE INDEX idx_comments_review ON comments (review_id);
CREATE INDEX idx_comments_finding ON comments (finding_id);
CREATE INDEX idx_audit_events_workspace ON audit_events (workspace_id, created_at DESC);
CREATE INDEX idx_workspace_members_user ON workspace_members (user_id, workspace_id);

-- -----------------------------------------------------------------------------
-- 4. Triggers & Stored Procedures
-- -----------------------------------------------------------------------------

-- 4.1 Block UPDATE and DELETE on audit_events to guarantee append-only immutability
CREATE OR REPLACE FUNCTION block_audit_events_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is an immutable append-only ledger; updates and deletes are strictly prohibited.';
END;
$$;

CREATE TRIGGER trg_audit_events_immutable
BEFORE UPDATE OR DELETE ON audit_events
FOR EACH ROW
EXECUTE FUNCTION block_audit_events_mutation();

-- 4.2 Brand Source Versioning Trigger
CREATE OR REPLACE FUNCTION handle_brand_source_versioning()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Only archive previous revision if body or title changed
  IF (OLD.title IS DISTINCT FROM NEW.title) OR (OLD.body IS DISTINCT FROM NEW.body) THEN
    INSERT INTO brand_source_versions (
      source_id,
      version,
      title,
      body,
      changed_by,
      change_note
    ) VALUES (
      OLD.id,
      OLD.current_version,
      OLD.title,
      OLD.body,
      NEW.owner_id,
      'Automatic version snapshot prior to update'
    );

    NEW.current_version := OLD.current_version + 1;
    NEW.updated_at := timezone('utc'::text, now());
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_brand_source_versioning
BEFORE UPDATE ON brand_sources
FOR EACH ROW
EXECUTE FUNCTION handle_brand_source_versioning();

-- 4.3 Auto-create profiles row on auth signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    coalesce(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
    coalesce(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

-- Connect auth.users to profiles trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 4.4 Search Sources RPC Function using websearch_to_tsquery and ts_rank
CREATE OR REPLACE FUNCTION search_sources(
  lookup_workspace_id uuid,
  query_text text,
  result_limit integer DEFAULT 10
)
RETURNS TABLE (
  source_id uuid,
  source_key text,
  title text,
  snippet text,
  rank real
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  parsed_query tsquery;
BEGIN
  -- Parse user query gracefully
  parsed_query := websearch_to_tsquery('english', query_text);

  RETURN QUERY
  SELECT
    bs.id AS source_id,
    bs.source_key,
    bs.title,
    ts_headline(
      'english',
      bs.body,
      parsed_query,
      'StartSel=<<, StopSel=>>, MaxWords=35, MinWords=15, HighlightAll=FALSE'
    ) AS snippet,
    ts_rank(bs.search, parsed_query) AS rank
  FROM brand_sources bs
  WHERE bs.workspace_id = lookup_workspace_id
    AND bs.status = 'active'
    AND bs.search @@ parsed_query
  ORDER BY rank DESC
  LIMIT result_limit;
END;
$$;
