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
