-- =============================================================================
-- BrandProof Database Schema Migration 002: Row Level Security (RLS) & Storage
-- Architecture: Inkloom AI Brand Governance Workspace
-- Security Rule: Every single table has RLS enabled. Strict workspace isolation.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Security Definer Helper Functions (Fixed Search Path)
-- -----------------------------------------------------------------------------

-- 1.1 Check if authenticated user is a member of the workspace
CREATE OR REPLACE FUNCTION is_member(lookup_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = lookup_workspace_id
      AND user_id = auth.uid()
  );
$$;

-- 1.2 Check if authenticated user holds a specific role in the workspace
CREATE OR REPLACE FUNCTION has_role(lookup_workspace_id uuid, required_role workspace_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = lookup_workspace_id
      AND user_id = auth.uid()
      AND role = required_role
  );
$$;

-- 1.3 Check if authenticated user holds any of the listed roles in the workspace
CREATE OR REPLACE FUNCTION has_any_role(lookup_workspace_id uuid, required_roles workspace_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = lookup_workspace_id
      AND user_id = auth.uid()
      AND role = ANY(required_roles)
  );
$$;

-- -----------------------------------------------------------------------------
-- 2. Enable RLS on All Tables
-- -----------------------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_source_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 3. Row Level Security Policies
-- -----------------------------------------------------------------------------

-- 3.1 Profiles Policies
CREATE POLICY "Profiles viewable by authenticated users"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- 3.2 Workspaces Policies
CREATE POLICY "Workspaces viewable by members only"
  ON workspaces FOR SELECT
  TO authenticated
  USING (is_member(id));

CREATE POLICY "Authenticated users can create workspaces"
  ON workspaces FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update workspace"
  ON workspaces FOR UPDATE
  TO authenticated
  USING (has_role(id, 'admin'))
  WITH CHECK (has_role(id, 'admin'));

CREATE POLICY "Admins can delete workspace"
  ON workspaces FOR DELETE
  TO authenticated
  USING (has_role(id, 'admin'));

-- 3.3 Workspace Members Policies
CREATE POLICY "Workspace members viewable by workspace peers"
  ON workspace_members FOR SELECT
  TO authenticated
  USING (is_member(workspace_id));

CREATE POLICY "Admins can add workspace members or self-bootstrap"
  ON workspace_members FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(workspace_id, 'admin')
    OR (
      -- Initial self-bootstrap when creating a fresh workspace
      user_id = auth.uid()
      AND NOT EXISTS (
        SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = workspace_members.workspace_id
      )
    )
  );

CREATE POLICY "Admins can update workspace member roles"
  ON workspace_members FOR UPDATE
  TO authenticated
  USING (has_role(workspace_id, 'admin'))
  WITH CHECK (has_role(workspace_id, 'admin'));

CREATE POLICY "Admins can remove workspace members"
  ON workspace_members FOR DELETE
  TO authenticated
  USING (has_role(workspace_id, 'admin'));

-- 3.4 Brand Sources Policies (Knowledge Base: Members read, Admins write)
CREATE POLICY "Brand sources viewable by workspace members"
  ON brand_sources FOR SELECT
  TO authenticated
  USING (is_member(workspace_id));

CREATE POLICY "Only admins can insert brand sources"
  ON brand_sources FOR INSERT
  TO authenticated
  WITH CHECK (has_role(workspace_id, 'admin'));

CREATE POLICY "Only admins can update brand sources"
  ON brand_sources FOR UPDATE
  TO authenticated
  USING (has_role(workspace_id, 'admin'))
  WITH CHECK (has_role(workspace_id, 'admin'));

CREATE POLICY "Only admins can delete brand sources"
  ON brand_sources FOR DELETE
  TO authenticated
  USING (has_role(workspace_id, 'admin'));

-- 3.5 Brand Source Versions Policies (Immutable history)
CREATE POLICY "Brand source versions viewable by workspace members"
  ON brand_source_versions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM brand_sources bs
      WHERE bs.id = brand_source_versions.source_id
        AND is_member(bs.workspace_id)
    )
  );

CREATE POLICY "Only admins can write brand source versions directly"
  ON brand_source_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(
      (SELECT workspace_id FROM brand_sources WHERE id = brand_source_versions.source_id),
      'admin'
    )
  );

-- 3.6 Brand Terms Policies
CREATE POLICY "Brand terms viewable by workspace members"
  ON brand_terms FOR SELECT
  TO authenticated
  USING (is_member(workspace_id));

CREATE POLICY "Only admins can modify brand terms"
  ON brand_terms FOR ALL
  TO authenticated
  USING (has_role(workspace_id, 'admin'))
  WITH CHECK (has_role(workspace_id, 'admin'));

-- 3.7 Brand Facts Policies
CREATE POLICY "Brand facts viewable by workspace members"
  ON brand_facts FOR SELECT
  TO authenticated
  USING (is_member(workspace_id));

CREATE POLICY "Only admins can modify brand facts"
  ON brand_facts FOR ALL
  TO authenticated
  USING (has_role(workspace_id, 'admin'))
  WITH CHECK (has_role(workspace_id, 'admin'));

-- 3.8 Brand Assets Policies
CREATE POLICY "Brand assets viewable by workspace members"
  ON brand_assets FOR SELECT
  TO authenticated
  USING (is_member(workspace_id));

CREATE POLICY "Only admins can modify brand assets"
  ON brand_assets FOR ALL
  TO authenticated
  USING (has_role(workspace_id, 'admin'))
  WITH CHECK (has_role(workspace_id, 'admin'));

-- 3.9 Content Items Policies (Creators own their drafts; Reviewers & Admins view all)
CREATE POLICY "Content items viewable by author or workspace reviewers/admins"
  ON content_items FOR SELECT
  TO authenticated
  USING (
    is_member(workspace_id)
    AND (
      created_by = auth.uid()
      OR has_any_role(workspace_id, ARRAY['admin'::workspace_role, 'reviewer'::workspace_role])
    )
  );

CREATE POLICY "Creators can create content items"
  ON content_items FOR INSERT
  TO authenticated
  WITH CHECK (
    is_member(workspace_id)
    AND created_by = auth.uid()
  );

CREATE POLICY "Creators can update their own content items, admins can update any"
  ON content_items FOR UPDATE
  TO authenticated
  USING (
    is_member(workspace_id)
    AND (created_by = auth.uid() OR has_role(workspace_id, 'admin'))
  )
  WITH CHECK (
    is_member(workspace_id)
    AND (created_by = auth.uid() OR has_role(workspace_id, 'admin'))
  );

CREATE POLICY "Creators can delete their own content items, admins can delete any"
  ON content_items FOR DELETE
  TO authenticated
  USING (
    is_member(workspace_id)
    AND (created_by = auth.uid() OR has_role(workspace_id, 'admin'))
  );

-- 3.10 Revisions Policies
CREATE POLICY "Revisions viewable if parent content item is viewable"
  ON revisions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM content_items ci
      WHERE ci.id = revisions.content_item_id
        AND is_member(ci.workspace_id)
        AND (
          ci.created_by = auth.uid()
          OR has_any_role(ci.workspace_id, ARRAY['admin'::workspace_role, 'reviewer'::workspace_role])
        )
    )
  );

CREATE POLICY "Creators can insert revisions on their own items"
  ON revisions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM content_items ci
      WHERE ci.id = revisions.content_item_id
        AND is_member(ci.workspace_id)
        AND (ci.created_by = auth.uid() OR has_role(ci.workspace_id, 'admin'))
    )
  );

CREATE POLICY "Admins can update or delete revisions"
  ON revisions FOR ALL
  TO authenticated
  USING (
    has_role(
      (SELECT workspace_id FROM content_items WHERE id = revisions.content_item_id),
      'admin'
    )
  );

-- 3.11 Reviews Policies (Decision authority limited to reviewer and admin)
CREATE POLICY "Reviews viewable by author or reviewers/admins"
  ON reviews FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM content_items ci
      WHERE ci.id = reviews.content_item_id
        AND is_member(ci.workspace_id)
        AND (
          ci.created_by = auth.uid()
          OR has_any_role(ci.workspace_id, ARRAY['admin'::workspace_role, 'reviewer'::workspace_role])
        )
    )
  );

CREATE POLICY "Reviews can be initiated by item creator or reviewer"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM content_items ci
      WHERE ci.id = reviews.content_item_id
        AND is_member(ci.workspace_id)
        AND (
          ci.created_by = auth.uid()
          OR has_any_role(ci.workspace_id, ARRAY['admin'::workspace_role, 'reviewer'::workspace_role])
        )
    )
  );

CREATE POLICY "Review decisions restricted to reviewers and admins"
  ON reviews FOR UPDATE
  TO authenticated
  USING (
    is_member(
      (SELECT workspace_id FROM content_items WHERE id = reviews.content_item_id)
    )
  )
  WITH CHECK (
    -- If decision fields are touched, enforce reviewer or admin role
    (
      status NOT IN ('approved', 'changes_requested', 'rejected')
      OR has_any_role(
        (SELECT workspace_id FROM content_items WHERE id = reviews.content_item_id),
        ARRAY['reviewer'::workspace_role, 'admin'::workspace_role]
      )
    )
  );

-- 3.12 Findings Policies
CREATE POLICY "Findings viewable if parent review is viewable"
  ON findings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reviews r
      JOIN content_items ci ON ci.id = r.content_item_id
      WHERE r.id = findings.review_id
        AND is_member(ci.workspace_id)
        AND (
          ci.created_by = auth.uid()
          OR has_any_role(ci.workspace_id, ARRAY['admin'::workspace_role, 'reviewer'::workspace_role])
        )
    )
  );

CREATE POLICY "Findings can be inserted during scanning"
  ON findings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reviews r
      JOIN content_items ci ON ci.id = r.content_item_id
      WHERE r.id = findings.review_id
        AND is_member(ci.workspace_id)
    )
  );

CREATE POLICY "Findings can be accepted, edited, or dismissed by creator or reviewer"
  ON findings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reviews r
      JOIN content_items ci ON ci.id = r.content_item_id
      WHERE r.id = findings.review_id
        AND is_member(ci.workspace_id)
        AND (
          ci.created_by = auth.uid()
          OR has_any_role(ci.workspace_id, ARRAY['admin'::workspace_role, 'reviewer'::workspace_role])
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reviews r
      JOIN content_items ci ON ci.id = r.content_item_id
      WHERE r.id = findings.review_id
        AND is_member(ci.workspace_id)
        AND (
          ci.created_by = auth.uid()
          OR has_any_role(ci.workspace_id, ARRAY['admin'::workspace_role, 'reviewer'::workspace_role])
        )
    )
  );

-- 3.13 Comments Policies
CREATE POLICY "Comments viewable by review audience"
  ON comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reviews r
      JOIN content_items ci ON ci.id = r.content_item_id
      WHERE r.id = comments.review_id
        AND is_member(ci.workspace_id)
        AND (
          ci.created_by = auth.uid()
          OR has_any_role(ci.workspace_id, ARRAY['admin'::workspace_role, 'reviewer'::workspace_role])
        )
    )
  );

CREATE POLICY "Comments can be posted by review audience"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM reviews r
      JOIN content_items ci ON ci.id = r.content_item_id
      WHERE r.id = comments.review_id
        AND is_member(ci.workspace_id)
    )
  );

CREATE POLICY "Authors or admins can update/delete comments"
  ON comments FOR UPDATE
  TO authenticated
  USING (
    author_id = auth.uid()
    OR has_role(
      (SELECT ci.workspace_id FROM reviews r JOIN content_items ci ON ci.id = r.content_item_id WHERE r.id = comments.review_id),
      'admin'
    )
  );

CREATE POLICY "Authors or admins can delete comments"
  ON comments FOR DELETE
  TO authenticated
  USING (
    author_id = auth.uid()
    OR has_role(
      (SELECT ci.workspace_id FROM reviews r JOIN content_items ci ON ci.id = r.content_item_id WHERE r.id = comments.review_id),
      'admin'
    )
  );

-- 3.14 Audit Events Policies (Append-only; readable by admin and reviewer)
CREATE POLICY "Audit events viewable by admins and reviewers only"
  ON audit_events FOR SELECT
  TO authenticated
  USING (
    is_member(workspace_id)
    AND has_any_role(workspace_id, ARRAY['admin'::workspace_role, 'reviewer'::workspace_role])
  );

CREATE POLICY "Audit events insertable by authenticated workspace members"
  ON audit_events FOR INSERT
  TO authenticated
  WITH CHECK (
    is_member(workspace_id)
  );

-- Revoke UPDATE and DELETE on audit_events at database privilege level as well
REVOKE UPDATE, DELETE, TRUNCATE ON audit_events FROM authenticated, anon, public;

-- -----------------------------------------------------------------------------
-- 4. Supabase Storage Configuration (Private Buckets & Scoped RLS)
-- -----------------------------------------------------------------------------

-- 4.1 Ensure private buckets exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('brand-assets', 'brand-assets', false, 20971520, ARRAY['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp']),
  ('content-uploads', 'content-uploads', false, 52428800, ARRAY['text/plain', 'text/markdown', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO UPDATE SET
  public = false;

-- 4.2 Storage RLS: brand-assets (Read: members; Write: admins)
-- Path format: {workspace_id}/{filename}
CREATE POLICY "Brand assets read by workspace members"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'brand-assets'
    AND is_member((storage.foldername(name))[1]::uuid)
  );

CREATE POLICY "Brand assets write by workspace admins only"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'brand-assets'
    AND has_role((storage.foldername(name))[1]::uuid, 'admin')
  );

CREATE POLICY "Brand assets delete by workspace admins only"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'brand-assets'
    AND has_role((storage.foldername(name))[1]::uuid, 'admin')
  );

-- 4.3 Storage RLS: content-uploads (Read/Write: members; Path: {workspace_id}/...)
CREATE POLICY "Content uploads read by workspace members"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'content-uploads'
    AND is_member((storage.foldername(name))[1]::uuid)
  );

CREATE POLICY "Content uploads write by workspace members"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'content-uploads'
    AND is_member((storage.foldername(name))[1]::uuid)
  );

CREATE POLICY "Content uploads delete by workspace admins"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'content-uploads'
    AND has_role((storage.foldername(name))[1]::uuid, 'admin')
  );

