# BrandProof — Disclosures & Attributions

> **Hackathon Integrity & Attribution Statement**  
> Problem Statement: Inkloom AI "Brand Governance"  
> Project: BrandProof (The Proofreader's Desk)

---

## 1. Libraries, Frameworks & Infrastructure

BrandProof is built from scratch on standard modern web engineering foundations. No commercial pre-built brand governance template or off-the-shelf governance SaaS boilerplate was used.

| Technology | Version | Purpose & Usage |
| :--- | :--- | :--- |
| **Next.js** | `15.5.29` | App Router, Server Actions, Route Handlers, React Server Components (RSC). Patched against CVE-2025-66478. |
| **React** | `19.0.0` | Declarative UI rendering, streaming SSR. |
| **TypeScript** | `5.9.3` | Strict type-safety across all boundaries (`strict: true`). |
| **Tailwind CSS** | `3.4.19` | Custom editorial theme (`paper`, `ink`, `rule`, `oxblood`, `ochre`, `slate`, `moss`). |
| **Supabase** | `2.119.0` | Postgres relational storage, Row Level Security (RLS), private Storage buckets, and Realtime WebSocket events. |
| **Zod** | `4.6.7` | Runtime schema validation for request payloads, database entities, and LLM structured outputs. |
| **Mammoth** | `1.13.0` | Server-side plain-text extraction from `.docx` files. |
| **Framer Motion** | `14.10.1` | Internal workspace UI transitions (drawer, status trail, review tabs). |
| **GSAP & Lenis** | `3.15.1` / `1.3.27` | Reserved strictly for the marketing landing page (`/`) scroll-scrub markup story and smooth wheel interaction. Never imported into internal app routes. |
| **Lucide React** | `1.70.0` | Clean line icons (strictly avoiding decorative AI sparkles or emoji). |
| **Vitest** | `5.1.0` | Test runner for 88 unit, evaluation, security, and integration tests. |

---

## 2. LLM Provider & Data Privacy Boundary

BrandProof places all artificial intelligence interactions behind an abstract provider interface (`lib/llm/provider.ts`), with a concrete adapter for **Google Gemini 1.5 Flash** (`lib/llm/gemini-adapter.ts`).

### What Data is Sent to the LLM:
1. **The Draft Passage:** Only the sanitized draft copy (or specific span during suggestion regeneration) is sent.
2. **Retrieved Governing Sources:** Excerpts from active `brand_sources` (tone guide, claims policy, facts) retrieved via semantic keyword match.
3. **Channel Context:** Target publication medium (e.g., `email`, `web`, `social`).
4. **Intended Message:** Author's one-sentence summary of intended communication.

### What is NEVER Sent:
- User credentials, passwords, session tokens, or emails.
- Workspace IDs, user IDs, or internal database primary keys.
- Raw file binary streams or documents outside the scope of review.
- Supabase Service Role keys or database connection strings.

### Prompt-Injection Defense:
Uploaded documents are treated strictly as **untrusted data**. The prompt isolation engine (`lib/llm/prompt-isolation.ts`) strips control characters and encloses user copy in `<untrusted_creator_draft>` delimiters. Instructions explicitly forbid the model from executing commands contained within the user copy.

---

## 3. Tooling & Agent Skills Used

Development was orchestrated with **Antigravity** (Google DeepMind's agentic engineering assistant) utilizing specialized local skills:

1. **`design-taste-frontend` (`tasteskill 2.5`)**:
   - Guided the editorial visual aesthetic: paper textures, hairline rules, Newsreader typography, and anti-slop guidelines (no purple/blue gradients, no glassmorphism, no fake metrics).
2. **`ui-ux-pro-max`**:
   - Guided layout proportions, contrast ratios, accessibility guidelines, keyboard navigation (`tabIndex`, ARIA roles), and responsive three-zone workspace architecture.
3. **`gstack` (Review & QA Suite)**:
   - Guided pre-landing security review, RLS verification, Docker deployment configuration, and honest test evaluation reporting.

---

## 4. AI-Generated vs. Human-Authored Code

### Code Architecture & Design (Human-Directed & Specified):
- Problem definition, two-lane governance architecture (deterministic rule lane vs. advisory LLM lane).
- Fundamental law: *"A clean scan NEVER equals approval."*
- Database schema, foreign key cascades, Row Level Security policies (`supabase/migrations/`).
- Anti-conflict-of-interest enforcement (creator cannot approve their own submission).
- Evaluation benchmark criteria and test cases.

### Implementation Assisted by Antigravity AI:
- Boilerplate generation of Next.js 15 route handlers and server actions.
- Zod schema definitions and TypeScript database interface types.
- Tailwind CSS class composition and responsive layout flex/grid utilities.
- Vitest test suite scaffolding and mock data fixtures.
- GSAP ScrollTrigger timeline configuration on the marketing landing page.

---

## 5. Team Contributions

*(Team members should fill in their verified roles and responsibilities below)*

### Team Member 1: `[Insert Name / GitHub Handle]`
- **Role:** Lead Engineer / Architect
- **Contributions:**
  - Designed the two-lane verification pipeline and deterministic rule engine.
  - Authored Supabase migrations, Row Level Security policies, and RBAC middleware.
  - Implemented prompt-isolation defense and LLM provider abstraction.

### Team Member 2: `[Insert Name / GitHub Handle]`
- **Role:** Full-Stack & UI/UX Engineer
- **Contributions:**
  - Built the Proofreader's Desk reading view (`Newsreader` typography, wavy/solid annotations, margin notes).
  - Implemented non-destructive diff generator and finding suggestion regeneration.
  - Developed reviewer triage queue (`/queue`) and decision sign-off modals.

### Team Member 3: `[Insert Name / GitHub Handle]`
- **Role:** Backend & Analytics Engineer
- **Contributions:**
  - Implemented Brand Pack management (`/brand`), sequential source keys (`S-001...`), and freshness tracking.
  - Engineered the Governance Insights engine (`/insights`), policy recurrence metrics, and Diataxis audit logging.
  - Configured Docker multi-stage build, healthcheck endpoint, and Vercel production deployment.
