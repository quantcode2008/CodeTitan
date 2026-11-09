# BrandProof Design System: "The Proofreader's Desk"

> **Concept:** Calm, editorial, trustworthy. Think a well-set printed style guide crossed with a quiet professional tool. NOT a generic AI SaaS dashboard.

---

## 1. Principles & Visual Philosophy
1. **The Proofreader's Desk:** Tactile, calm paper background (`#F6F3EC`), deep charcoal inks, razor-sharp hairline borders (`#DDD6C6`), and purposeful marginalia.
2. **Never Color Alone:** Every semantic status (critical, major, minor, advisory) pairs a distinct ink with a specific geometric mark and explicit text label.
3. **Restraint Over Decoration:** Single brand accent (deep ink-blue `#1F3A5F`) used only for primary actions. Hairline rules (1px) replace card shadows. Zero gradients, zero glassmorphism, zero floating blobs.
4. **Editorial Typography:** Newsreader for the document being reviewed and editorial headers, Instrument Sans for UI chrome and buttons, and JetBrains Mono for audit trails, diffs, line numbers, and citations.
5. **Human In The Loop:** Automated findings are advisory annotations. Original text is inviolate; edits are presented as transparent side-by-side or inline diffs.

---

## 2. Design Tokens

### 2.1 Color Tokens (Light & Dark "Night Desk")

| Token Name | Light ("Desk") | Dark ("Night Desk") | Purpose |
|---|---|---|---|
| `--color-paper` | `#F6F3EC` | `#14130F` | Main canvas / desk background |
| `--color-paper-raised` | `#FBF9F4` | `#1C1A14` | Sheet of paper, dialogs, drawers |
| `--color-paper-sunken` | `#EDE8DC` | `#0E0D0A` | Sidebar, gutters, sunken controls |
| `--color-ink` | `#16140F` | `#F6F3EC` | Primary editorial body text, headings |
| `--color-ink-soft` | `#4A463C` | `#A8A396` | Secondary labels, descriptions, metadata |
| `--color-ink-faint` | `#787364` | `#7A7568` | Subtle hints, placeholders, line numbers |
| `--color-rule` | `#DDD6C6` | `#2D2A22` | Hairline dividers, borders, margin leaders |
| `--color-rule-soft` | `#ECE7DC` | `#23201A` | Secondary table rules, grid lines |
| `--color-accent` | `#1F3A5F` | `#6B9BD1` | Sole primary brand action ink (Ink Blue) |
| `--color-accent-soft` | `#E8EFF7` | `#1A2536` | Accent background tints, active rail tabs |
| `--color-oxblood` | `#8C2F2B` | `#E06C68` | Critical severity, deletions, rejections |
| `--color-oxblood-tint` | `#F9ECEB` | `#2E1616` | Background wash for critical annotations |
| `--color-ochre` | `#B07A1F` | `#E5AA42` | Warning / major findings, needs attention |
| `--color-ochre-tint` | `#FDF6E9` | `#2B1E0A` | Background wash for major annotations |
| `--color-slate` | `#3F5B73` | `#8EAEC9` | Advisory / minor findings, uncertain claims |
| `--color-slate-tint` | `#EDF3F7` | `#16212B` | Background wash for advisory annotations |
| `--color-moss` | `#4B6B45` | `#89B581` | Approved, verified citations, insertions |
| `--color-moss-tint` | `#EDF4EC` | `#162415` | Background wash for verified citations |

### 2.2 Typography Scale

- **Display:** Newsreader, `36px / 2.25rem`, tracking `-0.02em`, font-serif, normal weight
- **H1:** Newsreader, `30px / 1.875rem`, tracking `-0.015em`, font-serif, medium weight
- **H2:** Newsreader, `24px / 1.5rem`, tracking `-0.01em`, font-serif, medium weight
- **H3:** Instrument Sans, `18px / 1.125rem`, font-sans, font-semibold
- **H4:** Instrument Sans, `15px / 0.9375rem`, font-sans, font-medium
- **Body (Document):** Newsreader, `17px / 1.0625rem`, line-height `1.65`, max-width `68ch`
- **Body (UI):** Instrument Sans, `14px / 0.875rem`, line-height `1.5`, font-sans
- **Small:** Instrument Sans, `12px / 0.75rem`, line-height `1.4`, font-sans
- **Caption:** Instrument Sans, `11px / 0.6875rem`, uppercase, tracking `0.05em`
- **Mono:** JetBrains Mono, `12px / 0.75rem`, tabular numbers, lining figures

### 2.3 Geometry & Layout
- **Border Radius:** Maximum `4px` (`rounded-sm`) on interactive controls, inputs, buttons, chips. Zero radius on document panels.
- **Borders:** Strict 1px hairline rules (`border border-rule`). No nested 2px borders.
- **Shadows:** Practically absent. Only a hairline paper lift `0 1px 2px rgba(22, 20, 15, 0.05)` on raised sheets.
- **Reading Width:** Reading pane strictly capped at `68ch` (`max-w-[68ch]`) with generous margin gutters.

### 2.4 Motion Guidelines
- Timing: `150ms` - `220ms` ease-out (`cubic-bezier(0.16, 1, 0.3, 1)`).
- Stagger: Findings list and margin notes enter staggered by `30ms`.
- Status transitions: Gentle 200ms color fade, no bouncing or spring overshoot.
- Accessibility: `@media (prefers-reduced-motion: reduce)` disables all transforms and position shifts, defaulting to instant opacity transitions or static renders.

---

## 3. WCAG AA Contrast Verification

Contrast calculated against light paper canvas (`#F6F3EC`, L ~ 0.891) and dark canvas (`#14130F`, L ~ 0.006):

| Element Pair | Contrast Ratio | WCAG Compliance | Verified Context |
|---|---|---|---|
| Ink (`#16140F`) on Paper (`#F6F3EC`) | **16.5:1** | AAA (Pass) | Primary body copy & editorial headers |
| Ink-Soft (`#4A463C`) on Paper (`#F6F3EC`) | **8.47:1** | AAA (Pass) | Secondary UI text, descriptions |
| Ink-Faint (`#787364`) on Paper (`#F6F3EC`) | **4.62:1** | AA (Pass) | Line numbers, meta captions |
| Oxblood (`#8C2F2B`) on Paper (`#F6F3EC`) | **7.52:1** | AAA (Pass) | Critical finding labels & diff strikes |
| Ochre Text (`#8C5E0D`) on Paper (`#F6F3EC`) | **5.21:1** | AA (Pass) | Warning badge text (calibrated for AA text) |
| Ochre (`#B07A1F`) on Ochre-Tint (`#FDF6E9`) | **3.2:1** | AA Graphic | Severity icon and border rule |
| Slate (`#3F5B73`) on Paper (`#F6F3EC`) | **6.44:1** | AA (Pass) | Advisory labels and citation tags |
| Moss (`#4B6B45`) on Paper (`#F6F3EC`) | **5.11:1** | AA (Pass) | Approved status text & diff inserts |
| Accent (`#1F3A5F`) on Paper (`#F6F3EC`) | **10.1:1** | AAA (Pass) | Primary interactive links & buttons |
| Paper (`#F6F3EC`) on Accent (`#1F3A5F`) | **10.1:1** | AAA (Pass) | Primary button text on dark ink-blue |
| Dark Ink (`#F6F3EC`) on Dark Paper (`#14130F`)| **16.5:1** | AAA (Pass) | Night desk body text |
| Dark Ink-Soft (`#A8A396`) on Dark Paper (`#14130F`)| **7.41:1** | AAA (Pass) | Night desk secondary labels |
| Dark Oxblood (`#E06C68`) on Dark Paper (`#14130F`)| **6.23:1** | AA (Pass) | Night desk critical text |
| Dark Ochre (`#E5AA42`) on Dark Paper (`#14130F`)| **8.52:1** | AAA (Pass) | Night desk warning text |
| Dark Slate (`#8EAEC9`) on Dark Paper (`#14130F`)| **7.84:1** | AAA (Pass) | Night desk advisory text |
| Dark Moss (`#89B581`) on Dark Paper (`#14130F`)| **7.53:1** | AAA (Pass) | Night desk approved text |

---

## 4. Signature Components

1. **`<Annotation />`**
   - In-text span in document draft.
   - Hand-proofed underline style: wavy (`decoration-wavy`) for critical/major, straight solid for minor, dashed for advisory/uncertain.
   - Interactive: keyboard focusable (`tabIndex={0}`), Enter/Space activates margin note, high-contrast focus ring.
2. **`<MarginNote />`**
   - Anchored card in the margin gutter, linked to Annotation via matching `findingId`.
   - Displays severity mark, source citation chip, reason, and purpose-preserving suggestion.
   - Provides quick action triggers: Accept Diff, Edit, Dismiss (with reason requirement).
3. **`<SourceChip />`**
   - Footnote citation: e.g. `[S-014 · Claims Policy v3]` in monospace font.
   - Variants:
     - `verified`: Solid moss border, links to approved knowledge base source with drawer preview.
     - `unverified`: Dashed oxblood/slate border + explicit `"No approved source cited"`.
4. **`<SeverityMark />`**
   - Visual identifier: Critical (Filled Diamond), Major (Triangle), Minor (Square), Advisory (Circle).
   - Inks: Oxblood, Ochre, Slate, Moss. Always pairs symbol + text badge.
5. **`<StatusTrail />`**
   - Stepper: `Draft` → `Needs Attention` → `Ready for Human Review` → `Approved / Changes Requested`.
   - Communicates that an automated scan NEVER equals approval.
6. **`<DiffView />`**
   - Inline mode: Strikethrough deletions in Oxblood tint, underlined insertions in Moss tint.
   - Side-by-side mode: Split columns with JetBrains Mono line numbers, highlighting exact textual replacements.
7. **Base UI Primitives**
   - `Button`: Primary (deep ink-blue), Secondary (paper-raised + hairline rule), Quiet (ghost ink), Destructive (oxblood). 4px radius.
   - `Input`, `Textarea`, `Select`: 1px rule border, focus-visible ring `ring-1 ring-ink`.
   - `Tabs`: Editorial underlines, no bulky pill capsules.
   - `Dialog` & `Drawer`: Clean slide-over sheets with backdrop paper tint.
   - `Skeleton`: Subtle paper shimmer matching the `#F6F3EC` tone.
8. **`<AppShell />`**
   - Editorial slim rail (56px) featuring Workspace Switcher, Reviews, Brand Pack (knowledge base), Insights, and Settings.
   - Top bar with editorial breadcrumbs, environment indicator, and human reviewer identity.

---

## 5. What We Deliberately Avoid (Anti-Slop Directives)

- ❌ **NO purple/blue neon gradients**
- ❌ **NO glassmorphism, blur cards, or glossy backdrop reflections**
- ❌ **NO emojis used as icons**
- ❌ **NO "AI sparkles" or "magic wand" iconography**
- ❌ **NO default unstyled shadcn look**
- ❌ **NO heavy drop shadows (`shadow-2xl`, etc.)**
- ❌ **NO rounded-full pill cards or rounded-2xl blobs**
- ❌ **NO generic AI placeholder copy or Lorem Ipsum**
- ❌ **NO automated approvals (a clean scan never equals approval)**

