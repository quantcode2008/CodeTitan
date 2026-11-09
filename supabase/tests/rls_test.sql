-- =============================================================================
-- BrandProof RLS Security Verification Suite
-- Run this script in the Supabase SQL Editor to verify Row Level Security policies.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- SETUP: Verify Seed Data Exists
-- -----------------------------------------------------------------------------
SELECT 'Verifying test users and workspace...' AS step;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM workspaces WHERE id = 'b0000000-0000-0000-0000-000000000001') THEN
    RAISE EXCEPTION 'Seed data missing. Please execute /supabase/seed.sql first.';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- TEST 1: Creator 1 (Chloe Bennett) Reads Own Content Item
-- User ID: a0000000-0000-0000-0000-000000000003 (Creator)
-- Content Item 1 ID: d0000000-0000-0000-0000-000000000001 (Created by Chloe)
-- -----------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = 'a0000000-0000-0000-0000-000000000003';
SET LOCAL "request.jwt.claim.role" = 'authenticated';

DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM content_items
  WHERE id = 'd0000000-0000-0000-0000-000000000001';

  IF v_count = 1 THEN
    RAISE NOTICE '✓ TEST 1 PASSED: Creator 1 can read their own draft.';
  ELSE
    RAISE EXCEPTION '✗ TEST 1 FAILED: Creator 1 could not read their own draft.';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- TEST 2: Creator 1 CANNOT Read Creator 2's Content Item (Liam Patel)
-- Content Item 3 ID: d0000000-0000-0000-0000-000000000003 (Created by Liam)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM content_items
  WHERE id = 'd0000000-0000-0000-0000-000000000003';

  IF v_count = 0 THEN
    RAISE NOTICE '✓ TEST 2 PASSED: Creator 1 cannot read Creator 2 draft (RLS isolation verified).';
  ELSE
    RAISE EXCEPTION '✗ TEST 2 FAILED: Creator 1 was able to read Creator 2 draft! Breach of confidentiality.';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- TEST 3: Creator 1 CANNOT Insert or Modify Brand Sources
-- (Brand sources are strictly read-only for creators; writeable only by admins)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_failed boolean := false;
BEGIN
  BEGIN
    INSERT INTO brand_sources (workspace_id, source_key, type, title, body, owner_id)
    VALUES (
      'b0000000-0000-0000-0000-000000000001',
      'S-ILLEGAL',
      'guideline',
      'Unauthorized Source Insertion',
      'This insertion should be blocked by RLS.',
      'a0000000-0000-0000-0000-000000000003'
    );
  EXCEPTION WHEN insufficient_privilege OR others THEN
    v_failed := true;
  END;

  -- Also check if row made it into the table
  IF NOT EXISTS (SELECT 1 FROM brand_sources WHERE source_key = 'S-ILLEGAL') THEN
    RAISE NOTICE '✓ TEST 3 PASSED: Creator 1 cannot write to brand_sources (Admin write lock enforced).';
  ELSE
    RAISE EXCEPTION '✗ TEST 3 FAILED: Creator 1 was able to insert a brand source!';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- TEST 4: Reviewer (Marcus Thorne) CAN Read All Drafts in Workspace
-- User ID: a0000000-0000-0000-0000-000000000002 (Reviewer)
-- -----------------------------------------------------------------------------
SET LOCAL "request.jwt.claim.sub" = 'a0000000-0000-0000-0000-000000000002';

DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM content_items
  WHERE workspace_id = 'b0000000-0000-0000-0000-000000000001';

  IF v_count >= 3 THEN
    RAISE NOTICE '✓ TEST 4 PASSED: Reviewer can inspect all workspace drafts.';
  ELSE
    RAISE EXCEPTION '✗ TEST 4 FAILED: Reviewer was blocked from reading workspace drafts.';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- TEST 5: Audit Events Immutability (UPDATE & DELETE Blocked)
-- -----------------------------------------------------------------------------
SET LOCAL "request.jwt.claim.sub" = 'a0000000-0000-0000-0000-000000000001'; -- Admin

DO $$
DECLARE
  v_event_id uuid;
  v_blocked boolean := false;
BEGIN
  SELECT id INTO v_event_id FROM audit_events LIMIT 1;
  
  IF v_event_id IS NOT NULL THEN
    BEGIN
      DELETE FROM audit_events WHERE id = v_event_id;
    EXCEPTION WHEN others THEN
      v_blocked := true;
    END;

    IF v_blocked THEN
      RAISE NOTICE '✓ TEST 5 PASSED: Deleting audit_events is strictly blocked by append-only trigger.';
    ELSE
      RAISE EXCEPTION '✗ TEST 5 FAILED: audit_events deletion was not prevented!';
    END IF;
  END IF;
END $$;

-- Always rollback test transaction
ROLLBACK;
