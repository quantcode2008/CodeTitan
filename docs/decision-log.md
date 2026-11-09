# BrandProof Architecture Decision Log (ADR)

## 001: Technology Stack Selection (Next.js + Supabase)
- **Date:** 2026-11-09
- **Status:** Accepted
- **Context:** Deciding the core technology stack for the pre-publication brand-governance workspace BrandProof for the Inkloom AI hackathon.
- **Decision:** Chose Next.js + Supabase over FastAPI + Postgres because Supabase gives auth, RLS, storage and Postgres in one managed service; architecture and review pipeline unchanged.
- **Consequences:**
  - Fast iteration with full-stack TypeScript (strict mode) and Next.js 15 App Router.
  - Native Postgres Row Level Security (RLS) ensures multi-tenant confidential document governance.
  - Private Supabase Storage buckets protect uploaded assets without extra microservice layers.
  - LLM and deterministic validation logic live cleanly in server actions and route handlers.

## 002: Relational Data Model, RLS Policies, and Append-Only Audit Ledger
- **Date:** 2026-11-09
- **Status:** Accepted
- **Context:** Establishing the database schema, multi-tenant isolation, source versioning, and Row Level Security for brand governance.
- **Decision:**
  - Implemented 14 core tables with UUID primary keys and UTC timestamps in `/supabase/migrations`.
  - Enabled RLS on every single table using hardened `SECURITY DEFINER` helper functions (`is_member`, `has_role`, `has_any_role`) with fixed `search_path = public, pg_temp`.
  - Creators can only read and modify their own drafts (`content_items` / `revisions`), while reviewers and admins have workspace-wide oversight.
  - Brand sources and terms are write-locked exclusively to admins; automated version snapshots are captured in `brand_source_versions` via database triggers.
  - Implemented an immutable append-only `audit_events` ledger with database-level triggers blocking UPDATE/DELETE.
  - Seeded fictional outdoor brand "Aster & Pine" with 12 real policies, terminology rules, stale statistics, and 3 test drafts.
- **Consequences:**
  - Guarantees strict confidentiality across teams and creators.
  - Protects knowledge base integrity from accidental creator tampering.
  - Prevents audit log tampering even by workspace administrators.

