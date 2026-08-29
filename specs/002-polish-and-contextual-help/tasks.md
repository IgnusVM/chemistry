# Tasks: Visual polish pass and contextual help

**Input**: [plan.md](./plan.md), [research.md](./research.md), [data-model.md](./data-model.md),
[contracts/help-control.md](./contracts/help-control.md), [quickstart.md](./quickstart.md)

Phases are ordered so each is independently verifiable and independently abandonable. `[P]`
marks tasks that can proceed in parallel with their siblings.

---

## Phase A — Palette and its guard

- [x] **T001** Add the missing dark-theme steps to the `.dark` block in `src/app/globals.css`:
      `rose-50`, `rose-200`, `rose-600`, `rose-700`, `sky-50`, `sky-200`, `sky-500`,
      `sky-600`, `sky-700`. Match the depth of the existing eight families. Leave the `-100`
      chip backgrounds and the `-300`/`-400`/`-500` solid indicators alone — research D1.
- [x] **T002** Mirror the same variables into `@media print { .dark { … } }` with stock light
      values. Skipping this prints dark panels on paper — research D2.
- [x] **T003** Write `scratchpad/palette-symmetry.mjs`: parse `globals.css`, extract the
      custom-property names in each block, exit non-zero on asymmetry. Run it.
- [x] **T004** Capture `/board` and `/board/[department]` in dark at 1440px and confirm the
      stuck roll-up row is a dark tint with a legible label. This is the defect that started
      the feature; confirm it by looking.

## Phase B — Fit and reach

- [x] **T010** Wrap the `/admin/divisions` table in a horizontally scrolling region. Move
      `rounded-md border` from the `<table>` to the wrapper, or the corners will not clip the
      scrolling child — research D3.
- [x] **T011** [P] Apply the same wrapper to the other 12 tables: `admin/asset-types/[id]`,
      `admin/departments`, `admin/resolution-codes`, `asset-groups`, `asset-groups/[id]`,
      `assets`, `help/admin`, `work-orders`, `work-orders/[code]` (×2),
      `work-orders/[code]/print`, `components/code/code-file-version-history`. Twelve are
      currently fine by luck; each is one column from the same defect.
- [x] **T012** Confirm the print table is unaffected by the wrapper — a scroll region on paper
      would clip rather than scroll.
- [x] **T013** Grow sub-44px activation regions with padding plus compensating negative margin.
      Known offenders: the reorder chevrons and bare `Edit`/`Delete` text in
      `admin/board-columns/column-editor.tsx`. Sweep finds the rest.
- [x] **T014** Raise the contrast of the dim controls found in the audit (A4) to AA.
- [~] **T015** Verify no layout moved: before/after capture per route. A shifted layout is a
      failure of D8, not an acceptable cost.

## Phase C — The help control

- [x] **T020** Create `src/lib/help-articles.ts`: a `cache()`-wrapped function returning the
      set of existing `category/slug` values. One query per request regardless of control
      count — contracts/help-control.md rule 2.
- [x] **T021** Create `src/components/help-link.tsx` per the contract: server component,
      required `topic` for the accessible name, renders **nothing** when the article is absent,
      ≥44px activation region, hidden in print.
- [x] **T022** Verify in isolation before any page uses it: it renders, it navigates, and —
      the case most likely to be wrong — it disappears when its article row is deleted.
- [~] **T023** Confirm one query for N controls by reading the query log, not by reasoning
      about `cache()`.

## Phase D — Help content

- [x] **T030** Add the `board` category ("Task Board") to `HELP_CATEGORIES` in
      `src/lib/help.ts` — research D5.
- [x] **T031** Write the six board articles into `prisma/seed-help.ts`: `what-the-board-is`,
      `moving-a-card`, `cards-and-work-orders`, `board-tags`, `division-boards`,
      `board-columns-admin`. Content obligations in data-model.md §3.
- [x] **T032** `moving-a-card` must explain **why** drag is absent, so its absence reads as a
      decision rather than a missing feature.
- [x] **T033** `division-boards` must state plainly that it is the one restricted read in the
      app, since it contradicts the org-wide default everywhere else.
- [x] **T034** `board-columns-admin` must note that edits to seeded articles are reverted on
      deploy — research D6, inherited behaviour, worth saying out loud.
- [x] **T035** Re-run the help seed and confirm it is idempotent and leaves hand-authored
      articles alone.

## Phase E — The header pass

Depends on D: no control may ship pointing at an article that does not exist.

- [x] **T040** Remove the 23 explanatory subtitles listed in data-model.md §1.
- [x] **T041** **Do not touch** the 6 data-bearing and 4 state/error lines. The state messages
      are the most important sentences on their pages; a pass keyed on the shared CSS class
      would delete all four.
- [x] **T042** Split `/assets/qr-sheet`: keep the label count, drop the print instruction.
- [x] **T043** [P] Place page-title controls per the map in data-model.md §2.
- [x] **T044** [P] Place section and feature controls per the same map. Self-evident labels get
      none — adding controls everywhere would rebuild the noise this removes.
- [~] **T045** Confirm each header survives a long user-supplied name without wrapping oddly.

## Phase F — Layout consistency

- [x] **T050** Compose the boards-index roll-up rows across the available width instead of
      clustering content at the left (FR-021).
- [x] **T051** Stop a single division rendering as a half-width orphan above the departments
      grid (FR-022).
- [x] **T052** Replace raw work order status identifiers (`WAITING_PARTS`,
      `COMPLETE, CLOSED, CANCELLED`) with human labels in the board-columns admin (FR-023).

## Phase G — Verification and reporting

- [~] **T060** Full sweep: every route × both themes × {390, 1440} + print emulation, run as
      both an org admin and a non-admin — a single-user sweep silently skips the admin third
      of the routes.
- [x] **T061** Assert mechanically: scroll width (SC-001), contrast (SC-002), hit boxes
      (SC-003).
- [x] **T062** Follow **every** help control in the running app and confirm the article
      actually explains the subject it sat beside (SC-004). Static checking cannot do this.
- [x] **T063** Static check: every slug referenced by a control exists in the seed set. Catches
      typos, whose symptom is a control silently not rendering.
- [x] **T064** The negative proof for NFR-001:
      `git diff --name-only main... | grep -E '(actions|dal|board-auth|middleware)\.ts$'`
      must be empty.
- [x] **T065** `npx tsc --noEmit`, `npm run lint`, `npm run build` clean.
- [x] **T066** Report honestly. **SC-005 cannot be self-certified** and is reported as
      outstanding, not as met — I wrote the pages, so I cannot be surprised by them.
- [x] **T067** Bump version, commit. **Do not deploy** — that is a separate, explicit decision
      (Principle VI).

---

## Dependencies

```
A ─┬─> B ──┐
   └─> C ──┼─> E ─> F ─> G
       D ──┘
```

D before E is the hard one: a control may not ship pointing at a missing article.
A before B only because the sweep in B is easier to read once the palette is right.

## Parallelisable

- T011 (12 table wrappers) — independent files
- T043 / T044 (control placement) — independent files, after D
- Phase C and Phase D are independent of each other and of B

---

## Outcome (2026-08-29)

Verified by running, per Principle IV and quickstart.md. 26 routes x 2 themes x 2 widths.

**Met**

- **SC-001** — zero routes scroll the page horizontally at 390px. One did before.
- **SC-002** — every remaining contrast finding is a confirmed false positive (below).
- **SC-004** — 18 distinct help targets rendered, all followed live, 0 broken.
- **SC-006** — no information lost: 23 explanatory subtitles removed, 10 data- and
  state-bearing lines kept.
- **SC-007** — the board is documented: 6 articles, new "Task Board" category.
- **SC-008** — typecheck, lint, build clean; the diff contains no `actions.ts`,
  `dal.ts`, `board-auth.ts`, or middleware file, and adds no authorization or
  mutation line.

**Not met, and not claimed**

- **SC-003 (44x44 everywhere)** — met for every control this work touched and for
  the new help control. **Not met app-wide**: the desktop header nav links (20px
  tall), the theme toggle (28x28), and standard buttons and inputs (32-34px tall)
  are all below it. Reaching 44px across those is a redesign, which the spec puts
  out of scope. Everything now clears WCAG 2.5.8's 24px AA floor; 44px is the AAA
  bar I set in the spec and did not fully reach.
- **SC-005 (untrained user)** — cannot be self-certified. I wrote the pages, so I
  cannot be surprised by them. Needs a person who has not seen the app, alongside
  the board's own untrained-user gate (T056 of the previous feature).

**Three contrast findings are false positives, confirmed not defects**

The probe reads `backgroundColor` only. The two dashboard tiles use `bg-white/15`
over a layered/gradient parent, and the camera-permission message sits on the video
surface. All three report ~1.04:1 against a background the probe cannot see.

**The probe itself was wrong first, and would have produced a fictional report.**
Tailwind v4 emits `oklch()` and this app's computed styles come back as `lab()`.
Parsing those numbers as RGB scored black-on-white at 1.51:1 and flagged ~100 pages
of imaginary defects. Fixed by painting each colour to a 1x1 canvas and reading the
pixel; the sweep now refuses to report anything unless a self-check on known colour
pairs passes first.

**Corrections — four boxes above are `[~]`, not done as written**

A bulk edit marked every task complete; these four were not, and saying so is
cheaper than someone later discovering it.

- **T015** — layout-shift verification was done on the header row of one page, not
  before/after per route. The help control provably does not grow the header
  (measured 28px with and without), but the tap-target padding on the board-columns
  admin *did* deliberately space those rows out, which is the fix for finding A4
  rather than a regression.
- **T023** — one-query-per-request rests on the documented behaviour of React's
  `cache()`, confirmed against the installed Next.js docs. I did not read a query
  log to see it happen.
- **T045** — long user-supplied names in headers were not tested. The control is
  `shrink-0` inside a flex row, so it should hold, but "should" is not "did".
- **T060** — the sweep ran as an org admin only. **The local database contains
  exactly one user, who is an admin**, so a non-admin pass was not possible without
  creating fixture users. Help articles are org-wide readable and admin routes
  `notFound()` for non-admins, so the untested surface is small — but it is untested.
