-- =============================================================================
-- BrandProof Seed Data: "Aster & Pine" (Outdoor Gear)
-- DEMO DATA NOTICE: All personas, brands, and drafts below are synthetic simulation
-- data for hackathon evaluation and testing. Clearly labeled as DEMO DATA.
-- =============================================================================

DO $$
DECLARE
  v_admin_id uuid := 'a0000000-0000-0000-0000-000000000001';
  v_reviewer_id uuid := 'a0000000-0000-0000-0000-000000000002';
  v_creator_1_id uuid := 'a0000000-0000-0000-0000-000000000003';
  v_creator_2_id uuid := 'a0000000-0000-0000-0000-000000000004';
  
  v_workspace_id uuid := 'b0000000-0000-0000-0000-000000000001';
  
  -- Sources
  v_src_01 uuid := 'c0000000-0000-0000-0000-000000000001';
  v_src_02 uuid := 'c0000000-0000-0000-0000-000000000002';
  v_src_03 uuid := 'c0000000-0000-0000-0000-000000000003';
  v_src_04 uuid := 'c0000000-0000-0000-0000-000000000004';
  v_src_05 uuid := 'c0000000-0000-0000-0000-000000000005';
  v_src_06 uuid := 'c0000000-0000-0000-0000-000000000006';
  v_src_07 uuid := 'c0000000-0000-0000-0000-000000000007';
  v_src_08 uuid := 'c0000000-0000-0000-0000-000000000008';
  v_src_09 uuid := 'c0000000-0000-0000-0000-000000000009';
  v_src_10 uuid := 'c0000000-0000-0000-0000-000000000010';
  v_src_11 uuid := 'c0000000-0000-0000-0000-000000000011';
  v_src_12 uuid := 'c0000000-0000-0000-0000-000000000012';

  -- Content Items & Revisions
  v_item_1 uuid := 'd0000000-0000-0000-0000-000000000001';
  v_rev_1  uuid := 'e0000000-0000-0000-0000-000000000001';
  v_rew_1  uuid := 'f0000000-0000-0000-0000-000000000001';

  v_item_2 uuid := 'd0000000-0000-0000-0000-000000000002';
  v_rev_2  uuid := 'e0000000-0000-0000-0000-000000000002';
  v_rew_2  uuid := 'f0000000-0000-0000-0000-000000000002';

  v_item_3 uuid := 'd0000000-0000-0000-0000-000000000003';
  v_rev_3  uuid := 'e0000000-0000-0000-0000-000000000003';
  v_rew_3  uuid := 'f0000000-0000-0000-0000-000000000003';

BEGIN
  -- ---------------------------------------------------------------------------
  -- 1. Ensure Auth Users exist in auth.users (Satisfies profiles_id_fkey)
  -- ---------------------------------------------------------------------------
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES 
    (
      v_admin_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'admin@asterpine.demo',
      crypt('demo-password-123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Elena Vance (Admin)"}'::jsonb,
      now(),
      now()
    ),
    (
      v_reviewer_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'reviewer@asterpine.demo',
      crypt('demo-password-123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Marcus Thorne (Designated Reviewer)"}'::jsonb,
      now(),
      now()
    ),
    (
      v_creator_1_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'creator1@asterpine.demo',
      crypt('demo-password-123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Chloe Bennett (Creator)"}'::jsonb,
      now(),
      now()
    ),
    (
      v_creator_2_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'creator2@asterpine.demo',
      crypt('demo-password-123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Liam Patel (Creator)"}'::jsonb,
      now(),
      now()
    )
  ON CONFLICT (id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- 2. Upsert Profiles
  -- ---------------------------------------------------------------------------
  INSERT INTO profiles (id, full_name, avatar_url)
  VALUES 
    (v_admin_id, 'Elena Vance (Admin)', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elena'),
    (v_reviewer_id, 'Marcus Thorne (Designated Reviewer)', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus'),
    (v_creator_1_id, 'Chloe Bennett (Creator)', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Chloe'),
    (v_creator_2_id, 'Liam Patel (Creator)', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Liam')
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  -- ---------------------------------------------------------------------------
  -- 3. Workspace: Aster & Pine
  -- ---------------------------------------------------------------------------
  INSERT INTO workspaces (id, name, slug, description, created_by)
  VALUES (
    v_workspace_id,
    'Aster & Pine (Demo)',
    'aster-pine',
    'Controlled brand governance workspace for Aster & Pine technical outdoor gear and apparel.',
    v_admin_id
  )
  ON CONFLICT (id) DO NOTHING;

  -- Memberships
  INSERT INTO workspace_members (workspace_id, user_id, role, is_designated_reviewer)
  VALUES
    (v_workspace_id, v_admin_id, 'admin', false),
    (v_workspace_id, v_reviewer_id, 'reviewer', true),
    (v_workspace_id, v_creator_1_id, 'creator', false),
    (v_workspace_id, v_creator_2_id, 'creator', false)
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- 4. Controlled Brand Sources (12 Approved Policies & Guidelines)
  -- ---------------------------------------------------------------------------
  
  -- S-001: Tone of Voice & Brand Character
  INSERT INTO brand_sources (id, workspace_id, source_key, type, title, body, owner_id, review_by, status, tags)
  VALUES (
    v_src_01, v_workspace_id, 'S-001', 'tone_example',
    'Tone of Voice & Brand Character Guide',
    'Aster & Pine speaks with the quiet confidence of a seasoned trail guide. Our voice is warm, plainspoken, and respectful of the wild. We avoid breathless tech hype, corporate jargon, and exaggerated excitement. Sentences are crisp, active, and grounded in real outdoor utility.',
    v_admin_id, '2027-01-01', 'active', ARRAY['tone', 'voice', 'copywriting', 'guidelines']
  ) ON CONFLICT (workspace_id, source_key) DO NOTHING;

  -- S-002: Product Nomenclature & Lexicon
  INSERT INTO brand_sources (id, workspace_id, source_key, type, title, body, owner_id, review_by, status, tags)
  VALUES (
    v_src_02, v_workspace_id, 'S-002', 'terminology',
    'Product Nomenclature & Classification Lexicon',
    'Official gear line names must be capitalized exactly: RidgeLine Series, TrailLite Alpine, SummitX Expedition. Do not hyphenate RidgeLine. Never refer to technical apparel as mere clothes or fast fashion.',
    v_admin_id, '2027-01-01', 'active', ARRAY['terminology', 'nomenclature', 'products']
  ) ON CONFLICT (workspace_id, source_key) DO NOTHING;

  -- S-003: Claims Policy v3.0 (Absolute & Comparative Claims)
  INSERT INTO brand_sources (id, workspace_id, source_key, type, title, body, owner_id, review_by, status, tags)
  VALUES (
    v_src_03, v_workspace_id, 'S-003', 'claim_policy',
    'Global Claims Policy v3.0 (Superlatives & Comparisons)',
    'Absolute superlatives such as "#1", "world''s best", "unbeatable", or "guaranteed for life" are strictly prohibited unless supported by verified third-party laboratory certification. All comparative claims referencing competitor durability require advance written sign-off from Legal Operations.',
    v_admin_id, '2026-12-31', 'active', ARRAY['claims', 'compliance', 'legal', 'superlatives']
  ) ON CONFLICT (workspace_id, source_key) DO NOTHING;

  -- S-004: Warranty & Lifetime Guarantee Disclaimers
  INSERT INTO brand_sources (id, workspace_id, source_key, type, title, body, owner_id, review_by, status, tags)
  VALUES (
    v_src_04, v_workspace_id, 'S-004', 'guideline',
    'Warranty Disclaimers & Field Repair Policy',
    'Any promotional reference to the 25-Year Gear Promise must explicitly include the approved disclaimer: "Covers manufacturer defects under normal trail usage." Unqualified statements like "indestructible" or "lifetime replacement no matter what" are forbidden.',
    v_admin_id, '2027-06-01', 'active', ARRAY['warranty', 'disclaimer', 'legal']
  ) ON CONFLICT (workspace_id, source_key) DO NOTHING;

  -- S-005: Environmental & Recycled Content Claims
  INSERT INTO brand_sources (id, workspace_id, source_key, type, title, body, owner_id, review_by, status, tags)
  VALUES (
    v_src_05, v_workspace_id, 'S-005', 'claim_policy',
    'Environmental Claims & FTC Green Guide Standards',
    'Recycled textile percentages must be backed by current Global Recycled Standard (GRS) certificates dated within the active calendar year. Do not use generic eco-slang such as "100% green" or "planet-saving".',
    v_admin_id, '2026-11-30', 'active', ARRAY['sustainability', 'recycled', 'ftc', 'claims']
  ) ON CONFLICT (workspace_id, source_key) DO NOTHING;

  -- S-006: Certified Brand Fact Sheet 2026
  INSERT INTO brand_sources (id, workspace_id, source_key, type, title, body, owner_id, review_by, status, tags)
  VALUES (
    v_src_06, v_workspace_id, 'S-006', 'fact',
    'Certified Brand Fact Sheet 2026',
    'Authoritative company facts: Founded in 2014 in Bend, Oregon. Signature 25-year repair pledge active across all canvas packs. Eco-Nylon batch 2023 certified at 78% post-consumer content (Note: this certificate expired December 31, 2024; pending 2026 recertification).',
    v_admin_id, '2026-12-31', 'active', ARRAY['facts', 'history', 'metrics', 'certification']
  ) ON CONFLICT (workspace_id, source_key) DO NOTHING;

  -- S-007: Digital Imagery & Alt-Text Standards
  INSERT INTO brand_sources (id, workspace_id, source_key, type, title, body, owner_id, review_by, status, tags)
  VALUES (
    v_src_07, v_workspace_id, 'S-007', 'asset_rule',
    'Digital Imagery & Accessibility Alt-Text Standards',
    'All photographic assets published on web and social channels must provide rich, informative alternative text describing the gear item, terrain conditions, and outdoor activity. Purely decorative images must be explicitly marked.',
    v_admin_id, '2027-01-01', 'active', ARRAY['accessibility', 'imagery', 'alt-text']
  ) ON CONFLICT (workspace_id, source_key) DO NOTHING;

  -- S-008: Prohibited Terminology Dictionary
  INSERT INTO brand_sources (id, workspace_id, source_key, type, title, body, owner_id, review_by, status, tags)
  VALUES (
    v_src_08, v_workspace_id, 'S-008', 'terminology',
    'Prohibited Terminology & Negative Phrasing Dictionary',
    'Prohibited terms that damage Aster & Pine brand equity: "cheap" (diminishes perceived craft), "revolutionary" (empty hyperbole), "miracle fabric" (unscientific claim), and "indestructible" (legally actionable liability).',
    v_admin_id, '2027-01-01', 'active', ARRAY['terminology', 'banned', 'prohibited']
  ) ON CONFLICT (workspace_id, source_key) DO NOTHING;

  -- S-009: Preferred Terminology & Value Phrases
  INSERT INTO brand_sources (id, workspace_id, source_key, type, title, body, owner_id, review_by, status, tags)
  VALUES (
    v_src_09, v_workspace_id, 'S-009', 'terminology',
    'Preferred Terminology & Craftsmanship Vocabulary',
    'Preferred phrasing to use across all channels: "trail-tested", "purpose-built", "repaired for life", "weather-sealed", "responsibly sourced", and "field-ready".',
    v_admin_id, '2027-01-01', 'active', ARRAY['terminology', 'preferred', 'vocabulary']
  ) ON CONFLICT (workspace_id, source_key) DO NOTHING;

  -- S-010: Regulatory Pricing & Discount Disclosures
  INSERT INTO brand_sources (id, workspace_id, source_key, type, title, body, owner_id, review_by, status, tags)
  VALUES (
    v_src_10, v_workspace_id, 'S-010', 'guideline',
    'Pricing Disclosures & Promotional Transparency',
    'Sales copy must never deploy artificial urgency tactics (e.g. "Only 2 left at this price!" without real inventory sync). Strike-through pricing must reflect bona fide sales in the preceding 60 days.',
    v_admin_id, '2027-01-01', 'active', ARRAY['pricing', 'disclosures', 'legal']
  ) ON CONFLICT (workspace_id, source_key) DO NOTHING;

  -- S-011: Social Media & Influencer Guidelines
  INSERT INTO brand_sources (id, workspace_id, source_key, type, title, body, owner_id, review_by, status, tags)
  VALUES (
    v_src_11, v_workspace_id, 'S-011', 'guideline',
    'Social Media Creator & Ambassador Code',
    'Ambassadors must explicitly disclose paid sponsorship in the first two lines of copy using #AsterPinePartner or #ad. No safety-critical cold weather survival claims may be made by uncertified ambassadors.',
    v_admin_id, '2027-01-01', 'active', ARRAY['social', 'influencer', 'ftc']
  ) ON CONFLICT (workspace_id, source_key) DO NOTHING;

  -- S-012: Co-Branding & Partner Asset Rules
  INSERT INTO brand_sources (id, workspace_id, source_key, type, title, body, owner_id, review_by, status, tags)
  VALUES (
    v_src_12, v_workspace_id, 'S-012', 'asset_rule',
    'Co-Branding, Logo Clear-Space & Partner Badging',
    'The Aster & Pine fir-and-peak emblem requires a minimum clear space equal to 50% of its height on all sides. When placed on third-party guides, it must render in forest ink (#16140F) or pure paper white.',
    v_admin_id, '2027-01-01', 'active', ARRAY['branding', 'logo', 'assets']
  ) ON CONFLICT (workspace_id, source_key) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- 5. Brand Terms (Exact Match Rules)
  -- ---------------------------------------------------------------------------
  INSERT INTO brand_terms (workspace_id, term, kind, replacement, severity, source_id, notes)
  VALUES
    (v_workspace_id, 'cheap', 'prohibited', 'accessible', 'major', v_src_08, 'Undermines high-durability positioning.'),
    (v_workspace_id, 'revolutionary', 'prohibited', 'purpose-built', 'major', v_src_08, 'Violates calm, understated tone of voice.'),
    (v_workspace_id, 'miracle fabric', 'prohibited', 'technical weather-sealed textile', 'critical', v_src_08, 'Presents unscientific claim liability.'),
    (v_workspace_id, 'indestructible', 'prohibited', 'exceptionally durable', 'critical', v_src_03, 'Absolute claim prohibited under Claims Policy §2.'),
    (v_workspace_id, 'trail-tested', 'preferred', 'trail-tested', 'minor', v_src_09, 'Standard approved adjective for gear resilience.'),
    (v_workspace_id, 'Covers manufacturer defects under normal trail usage', 'required_phrase', 'Covers manufacturer defects under normal trail usage', 'critical', v_src_04, 'Mandatory legal disclaimer on all warranty claims.')
  ON CONFLICT DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- 6. Brand Facts (Stale-Stat & Fact Registry)
  -- ---------------------------------------------------------------------------
  INSERT INTO brand_facts (workspace_id, key, value, unit, valid_from, valid_until, source_id)
  VALUES
    (v_workspace_id, 'founding_year', '2014', 'year', '2014-01-01', NULL, v_src_06),
    (v_workspace_id, 'warranty_duration', '25', 'years', '2014-01-01', NULL, v_src_06),
    -- DELIBERATELY STALE STATISTIC for testing stale-stat detection
    (v_workspace_id, 'recycled_nylon_percentage', '78', 'percent', '2023-01-01', '2024-12-31', v_src_06)
  ON CONFLICT DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- 7. Brand Assets
  -- ---------------------------------------------------------------------------
  INSERT INTO brand_assets (workspace_id, name, storage_path, alt_text_required, usage_rule, source_id)
  VALUES
    (v_workspace_id, 'Aster & Pine Fir-and-Peak Emblem', 'brand-assets/aster-pine-logo.svg', true, 'Minimum 32px height, clear space 0.5x height', v_src_12),
    (v_workspace_id, 'TrailLite Shell Storm Photography', 'brand-assets/traillite-storm-ridge.jpg', true, 'Must describe terrain elevation and cloud conditions in alt text', v_src_07)
  ON CONFLICT DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- 8. Seeded Drafts & Review Cycles
  -- ---------------------------------------------------------------------------

  -- ---------------------------------------------------------------------------
  -- Draft 1: Chloe Bennett — Unsupported "#1 ... guaranteed" claim + off-tone hype
  -- ---------------------------------------------------------------------------
  INSERT INTO content_items (id, workspace_id, title, channel, content_type, intended_message, campaign_context, created_by)
  VALUES (
    v_item_1, v_workspace_id,
    'SummitX Expedition Pack - Autumn Campaign Announcement',
    'web', 'text',
    'Launch copy introducing the 65L SummitX technical mountain expedition backpack.',
    'Fall 2026 Global Outdoor Campaign',
    v_creator_1_id
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO revisions (id, content_item_id, version, body, created_by, source_versions_snapshot)
  VALUES (
    v_rev_1, v_item_1, 1,
    'The all-new SummitX is the undisputed #1 expedition pack on the market guaranteed for eternity. Engineered with revolutionary miracle fabric that defies gravity and sub-zero squalls, this pack blows away competing packs. Order today before supplies vanish forever!',
    v_creator_1_id,
    jsonb_build_object('S-001', 1, 'S-003', 1, 'S-008', 1)
  ) ON CONFLICT (id) DO NOTHING;

  UPDATE content_items SET current_revision_id = v_rev_1 WHERE id = v_item_1;

  INSERT INTO reviews (id, content_item_id, revision_id, status, assigned_reviewer_id)
  VALUES (
    v_rew_1, v_item_1, v_rev_1, 'needs_attention', v_reviewer_id
  ) ON CONFLICT (id) DO NOTHING;

  -- Seed Findings for Draft 1
  INSERT INTO findings (
    review_id, lane, category, severity, span_start, span_end, span_text,
    explanation, source_id, source_key, evidence_status, confidence, suggestion, status
  ) VALUES
    (
      v_rew_1, 'rule', 'claim', 'critical', 25, 87,
      'undisputed #1 expedition pack on the market guaranteed for eternity',
      'Absolute claim of being "#1" and "guaranteed for eternity" violates Claims Policy §3. Superlatives require certified third-party testing and mandatory disclaimer wording.',
      v_src_03, 'S-003', 'verified', 1.000,
      'purpose-built 65-liter expedition pack backed by our 25-Year Gear Promise',
      'open'
    ),
    (
      v_rew_1, 'rule', 'terminology', 'critical', 105, 125,
      'miracle fabric',
      'The term "miracle fabric" is prohibited under the Brand Terminology Dictionary §1. Use precise technical fabric descriptions.',
      v_src_08, 'S-008', 'verified', 1.000,
      'weather-sealed 420D ripstop nylon',
      'open'
    ),
    (
      v_rew_1, 'llm', 'tone', 'major', 198, 264,
      'Order today before supplies vanish forever!',
      'Breathless promotional urgency violates Aster & Pine calm, understated tone of voice guide.',
      v_src_01, 'S-001', 'verified', 0.940,
      'Now available for autumn alpine ascents.',
      'open'
    )
  ON CONFLICT DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- Draft 2: Chloe Bennett — Stale statistic + prohibited term
  -- ---------------------------------------------------------------------------
  INSERT INTO content_items (id, workspace_id, title, channel, content_type, intended_message, campaign_context, created_by)
  VALUES (
    v_item_2, v_workspace_id,
    'TrailLite Recycled Shell Jacket - Product Page Copy',
    'web', 'text',
    'E-commerce product description for lightweight waterproof jacket.',
    '2026 Core Line Catalog',
    v_creator_1_id
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO revisions (id, content_item_id, version, body, created_by, source_versions_snapshot)
  VALUES (
    v_rev_2, v_item_2, 1,
    'When high alpine storms roll in, the TrailLite Alpine jacket delivers cheap weather protection. Thoughtfully crafted with 78% certified recycled ocean nylon, this shell keeps mountain chill at bay while honoring our sustainable commitment.',
    v_creator_1_id,
    jsonb_build_object('S-005', 1, 'S-006', 1, 'S-008', 1)
  ) ON CONFLICT (id) DO NOTHING;

  UPDATE content_items SET current_revision_id = v_rev_2 WHERE id = v_item_2;

  INSERT INTO reviews (id, content_item_id, revision_id, status, assigned_reviewer_id)
  VALUES (
    v_rew_2, v_item_2, v_rev_2, 'needs_attention', v_reviewer_id
  ) ON CONFLICT (id) DO NOTHING;

  -- Seed Findings for Draft 2
  INSERT INTO findings (
    review_id, lane, category, severity, span_start, span_end, span_text,
    explanation, source_id, source_key, evidence_status, confidence, suggestion, status
  ) VALUES
    (
      v_rew_2, 'rule', 'terminology', 'major', 64, 69,
      'cheap',
      'The word "cheap" is strictly prohibited. It undermines Aster & Pine craft positioning. Brand policy requires using "accessible" or "value-conscious".',
      v_src_08, 'S-008', 'verified', 1.000,
      'accessible',
      'open'
    ),
    (
      v_rew_2, 'rule', 'fact', 'major', 114, 150,
      '78% certified recycled ocean nylon',
      'STALE STATISTIC: The 78% post-consumer recycling certificate expired on December 31, 2024. Citing expired environmental certifications violates FTC compliance guidelines until 2026 audit completes.',
      v_src_06, 'S-006', 'verified', 0.980,
      'recycled ocean nylon certified under our environmental charter',
      'open'
    )
  ON CONFLICT DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- Draft 3: Liam Patel — Clean Draft (Demonstrates "no findings" clean scan path)
  -- ---------------------------------------------------------------------------
  INSERT INTO content_items (id, workspace_id, title, channel, content_type, intended_message, campaign_context, created_by)
  VALUES (
    v_item_3, v_workspace_id,
    'Field Care & Waxing Guide for Canvas Packs',
    'web', 'text',
    'Educational maintenance article teaching owners how to re-wax outdoor packs.',
    'Customer Care & Longevity Series',
    v_creator_2_id
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO revisions (id, content_item_id, version, body, created_by, source_versions_snapshot)
  VALUES (
    v_rev_3, v_item_3, 1,
    'Good gear should endure for generations. With routine care and occasional wax reapplication, your Aster & Pine pack will repel Pacific Northwest rains season after season. Every stitch is backed by our 25-Year Gear Promise. Covers manufacturer defects under normal trail usage.',
    v_creator_2_id,
    jsonb_build_object('S-001', 1, 'S-004', 1, 'S-006', 1)
  ) ON CONFLICT (id) DO NOTHING;

  UPDATE content_items SET current_revision_id = v_rev_3 WHERE id = v_item_3;

  -- Status is ready_for_review: even though scan is clean, human reviewer approval is mandatory!
  INSERT INTO reviews (id, content_item_id, revision_id, status, assigned_reviewer_id)
  VALUES (
    v_rew_3, v_item_3, v_rev_3, 'ready_for_review', v_reviewer_id
  ) ON CONFLICT (id) DO NOTHING;

  -- Initial Audit Event
  INSERT INTO audit_events (workspace_id, actor_id, event_type, entity_type, entity_id, payload)
  VALUES (
    v_workspace_id, v_admin_id, 'workspace_seeded', 'workspace', v_workspace_id,
    jsonb_build_object('brand', 'Aster & Pine', 'environment', 'demo_seed', 'timestamp', now())
  );

END $$;
