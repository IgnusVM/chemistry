# Implementation Plan: Visual polish pass and contextual help

**Branch**: `feature/kanban-board` | **Date**: 2026-08-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-polish-and-contextual-help/spec.md`

## Summary

Two requests delivered as one change because they rewrite the same lines. Close the dark
palette so no panel glares, stop tables running off the edge of a phone, grow tap targets
that are currently too small to hit, and tidy the layouts that read as accidental. In the
same edit, strip the developer-facing subtitles from page headers and replace them with a
small help control that opens a real article — writing the six board articles that do not
exist yet, because the board currently has no help coverage of any kind.

The approach is central rather than local: the palette gains the two missing colour families
so every future component is correct for free, all thirteen tables get the scroll wrapper
rather than only the one that currently overflows, and one shared help control resolves
article existence once per request. Verification is a capture sweep across every route in
both themes at both widths, because the two defects that started this work were invisible in
source and obvious in a screenshot.

## Technical Context

**Language/Version**: TypeScript strict, React 19, Next.js 16 (App Router, Turbopack)

**Primary Dependencies**: Tailwind v4 (CSS-based config, no `tailwind.config.*`), Prisma 7
with `@prisma/adapter-pg`, `lucide-react` for icons, `marked` + DOMPurify for help rendering

**Storage**: PostgreSQL 17. This feature adds **rows** (six help articles, via the existing
seed) and **no schema**. No migration.

**Testing**: Playwright in the scratchpad only — never added to the project. `tsc --noEmit`,
`npm run lint`, `npm run build`. Dev server on `localhost:3000` against a seeded local
database.

**Target Platform**: Installed PWA on phones first; desktop browsers second. Printed output is
a third target and is where the palette's most likely regression hides.

**Project Type**: Web application, single Next.js project.

**Performance Goals**: No page may gain more than one database query. The help control's
existence check is memoised per request, so N controls cost one query.

**Constraints**: No behaviour, data, or authorization change (NFR-001). WCAG AA contrast in
both themes. 44×44px minimum activation region. No horizontal page scroll at 390px.

**Scale/Scope**: 43 pages, 13 hand-rolled tables, ~25 explanatory subtitles to remove, ~9
subtitles to keep, 29 existing help articles, 6 new ones, 1 new shared component, 1 new help
category.

## Constitution Check

*GATE: checked before Phase 0, re-checked after Phase 1 design.*

| Principle | Status | How this work satisfies it |
|---|---|---|
| **I. Framework truth from node_modules** | PASS | The one framework-specific choice is React's `cache()` for per-request memoisation (D4). Its behaviour must be confirmed against the installed React docs before use, not from recollection. Tailwind v4's CSS-based theming is already the established pattern in `globals.css` and is being followed, not invented. |
| **II. Authorization at the data layer** | PASS — by construction | This feature changes no authorization. Demonstrated rather than asserted: the diff must contain no `actions.ts`, `dal.ts`, `board-auth.ts`, or middleware file. That is a command, not a claim (D9). The help control reads only article slugs, which are already org-wide readable. |
| **III. Migrations additive** | PASS — N/A | No schema change. Six rows added through the existing idempotent seed. |
| **IV. Verify by running** | PASS — and it is the crux | A style pass verified by reading its own diff is the exact failure this principle exists to prevent. Verification is an automated sweep asserting scroll width, contrast ratio, and hit-box size mechanically, plus following every help link live (D9). |
| **V. The field user is the constraint** | PASS — this *is* the feature | Contrast in sun and tap targets in gloves are the point, not decoration. D3 explicitly rejects hiding columns on mobile because it would hide data from phone-only users. |
| **VI. Beta users are real users** | PASS | Branch-local. No deployment is part of this work. The user has separately deferred the deployment decision. |

**Complexity check** (governance clause): this feature adds one concept a volunteer must
learn — a help control — and removes ~25 lines of prose they currently have to read whether
they want to or not. Net reduction in what a user must absorb.

**Post-Phase 1 re-check**: no change. The design added no entities, no schema, and no
authorization surface. The one risk surfaced during design (D6, seeded articles overwriting
admin edits on deploy) is pre-existing behaviour that this feature inherits rather than
introduces, and is recorded in the risk list below rather than silently accepted.

## Project Structure

### Documentation (this feature)

```text
specs/002-polish-and-contextual-help/
├── plan.md              # This file
├── research.md          # D1-D9, decisions with rejected alternatives
├── data-model.md        # The help map: subject -> page -> article slug
├── quickstart.md        # How to verify, and what "verified" means here
├── contracts/
│   └── help-control.md  # Props, rendering rules, accessibility contract
├── checklists/
│   └── requirements.md
└── tasks.md             # Created by /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── globals.css                 # D1: add rose/sky. D2: mirror into @media print
│   └── (app)/
│       ├── page.tsx                # ~25 pages: remove explanatory subtitle,
│       ├── assets/                 #   add help control beside the title
│       ├── work-orders/
│       ├── board/                  # + roll-up row layout, orphan grid item
│       ├── loans/
│       ├── locations/
│       ├── scan/
│       ├── account/
│       ├── help/
│       └── admin/
│           ├── divisions/page.tsx      # D3: table wrapper (the one that overflows)
│           ├── board-columns/page.tsx  # human labels for WO statuses (FR-023)
│           └── …                       # D3 applies to all 13 tables
├── components/
│   ├── help-link.tsx               # NEW — the shared control (server component)
│   └── …                           # tap-target padding pass
└── lib/
    ├── help.ts                     # D5: add the board category
    └── help-articles.ts            # NEW — cached slug-existence lookup

prisma/
└── seed-help.ts                    # D5: six new board articles

scripts/ or scratchpad/
├── palette-symmetry.mjs            # D2: fails when .dark and print .dark diverge
└── sweep.mjs                       # D9: scroll width, contrast, hit boxes
```

**Structure Decision**: existing single-project Next.js layout, unchanged. Two new files
(`help-link.tsx`, `help-articles.ts`), one new seed content block, one stylesheet edit, and
edits confined to page headers and table wrappers. No directory is added or moved.

## Implementation phases

Sequenced so each phase is independently verifiable and independently abandonable. A phase
that turns out to be wrong does not strand the ones before it.

**Phase A — Palette and its guard (D1, D2).** Add `rose` and `sky` to both blocks; add the
symmetry check and run it. Smallest change with the largest correctness payoff, and it
unblocks nothing else, so it goes first and can be judged on its own.

**Phase B — Fit and reach (D3, D8).** Table wrappers across all 13; tap-target padding.
Purely mechanical once the pattern is fixed. Verified by the sweep, not by eye.

**Phase C — The help control (D4).** Build `help-link.tsx` and the cached lookup. No page
uses it yet. Ends with the component rendering correctly in isolation, including the
does-not-render-when-missing case, which is the behaviour most likely to be got wrong and
least likely to be noticed.

**Phase D — Help content (D5, D6).** Write the six board articles and add the category.
Content work, no interface change. Must precede Phase E, since a control may not ship
pointing at an article that does not exist.

**Phase E — The header pass (D7).** Apply the three-category rule across every page: remove
explanatory subtitles, keep data and state ones, place controls. The largest phase by file
count and the most mechanical, now that the rule is fixed and the articles exist.

**Phase F — Layout consistency (FR-021, FR-022, FR-023).** Roll-up rows, the orphan grid
item, human-readable work order statuses. Judgement-heavy, smallest blast radius, last.

**Phase G — Full sweep and honest reporting.** Run the whole verification, report what
passed and what did not. SC-005 cannot be self-certified and will be reported as outstanding,
not as met.

## Risks

| Risk | Handling |
|---|---|
| Palette change ripples further than intended — `rose` and `sky` may be used outside the board | Grep both families across `src/` before editing, and include every hit in the visual sweep. Cheap to check, expensive to assume. |
| Print output regresses invisibly | D2's symmetry check, plus a print-emulation capture in the sweep. This is the defect most likely to ship unnoticed. |
| A removed subtitle turns out to have been load-bearing | The three-category rule (D7) plus review of each removal against the article replacing it. SC-006 exists for exactly this. |
| **Seeded articles overwrite admin edits on deploy** | Pre-existing (D6), inherited not introduced. Recorded here; called out in the board-columns article so an admin is not surprised. Changing it is out of scope under a no-behaviour-change spec. |
| Scope creep — 43 pages invites unrelated "while I'm here" edits | Phases are the fence. Anything outside a phase's stated requirement is written down as follow-up rather than done. |
| Tap-target padding shifts layouts despite negative margins | The sweep captures before and after; any page whose layout moves is a failure of D8, not an acceptable cost. |

## Deliberately out of scope

- A shared `<Table>` component (D3) — correct refactor, wrong feature.
- Changing the seed's overwrite semantics (D6) — a behaviour change under a spec promising none.
- Redesign of any page, new components beyond the help control, or any change to what a page does.
- Deployment. Separate, explicit, and the user's call (Principle VI).
