# Research: Visual polish pass and contextual help

Decisions taken before implementation, each with what was rejected and why. Every fact
below was confirmed by reading the code in this repository, not recalled.

---

## D1 — Complete the dark palette centrally, not per component

**Decision**: add the missing `rose` and `sky` entries to the `.dark` palette block in
`src/app/globals.css`. Do not rewrite the four board files to avoid those families.

**Rationale**: `src/app/globals.css` establishes the pattern explicitly — its own comment
says the point is that "new components inherit dark mode automatically — there's no `dark:`
prefix for anyone to forget." Rewriting components to dodge an incomplete palette inverts
that: it leaves the trap armed for the next person, who will reach for `bg-rose-50`, see it
work in light mode, and ship the same defect. The palette is the boundary; the gap belongs
there.

**Rejected**: swapping the board's `rose` for the already-mapped `red`, and `sky` for `blue`.
Cheaper by two lines and wrong in kind. It also flattens a deliberate distinction — the board
uses `rose` for *stuck* and `red` is the app's *error* colour; collapsing them would make a
blocked card look like a failure.

**Preserved**: the `-100` chip backgrounds stay bright. The existing comment states the
reasoning — a light pill on a dark card is legible and reads as a badge. That is a decision,
not an oversight, and this work does not touch it.

**Scope**: the exact steps needed are `rose-50`, `rose-200`, `rose-700` and `sky-50`,
`sky-200`, `sky-700`, matching the families' actual use in the four board files.

---

## D2 — The print block is the real hazard, so guard it by running a check

**Decision**: mirror every new palette variable into the `@media print { .dark { … } }` block,
and add a check that fails when the two blocks declare different variable sets.

**Rationale**: the palette is maintained in **two** places. `globals.css:91` restores the
stock light palette under `@media print`, because otherwise printing a work order in dark mode
emits a black page. Every `-50` variable added to `.dark` must be added there too. Nothing
currently enforces that. A "just add two lines" fix to D1 that misses the print block produces
a defect that is invisible on screen and only appears on paper — the least likely place anyone
will look.

Converting "remember to mirror this" into a check that runs is exactly Principle IV. The check
is a few lines: parse `globals.css`, extract the custom-property names declared in each block,
fail on asymmetry. It costs almost nothing and it removes a class of defect permanently.

**Rejected**: cascade layers plus `revert-layer` to avoid the duplication entirely. It would
work, and it is too clever for the benefit — it makes the most load-bearing stylesheet in the
app depend on a mechanism no other part of it uses. The duplication is fine once it is
enforced.

---

## D3 — Table overflow: a shared wrapper, applied to all 13 tables

**Decision**: wrap tables in a horizontally scrollable region. Apply it to every one of the 13
hand-rolled tables, not only the one that currently overflows.

**Rationale**: `/admin/divisions` overflows today because a column was added to a table that
already just fit. That is not a property of that table — it is a property of every table in
the app, all of which are one column away from the same defect. Twelve of thirteen are
currently fine by luck, and the luck is a function of how long the seeded names happen to be.
Fixing only the broken one leaves twelve latent.

**Implementation note**: the tables carry `rounded-md border` on the `<table>` element itself.
Moving the border and rounding to the wrapper is required for the corners to clip a scrolling
child correctly; leaving them on the table produces a visible seam at the scroll boundary.

**Rejected**: hiding lower-priority columns below a breakpoint. It is the more polished answer
and it hides data from precisely the phone-only users who cannot switch to a desktop to see
it, which Principle V rules out.

**Rejected**: a shared `<Table>` component. Correct refactor, wrong feature — it changes
structure across 12 files under a spec whose NFR-001 promises no behavioural change. Noted as
follow-up work.

---

## D4 — Help control resolves article existence once per request

**Decision**: one server-side lookup of all existing article slugs, memoised per request with
React's `cache()`, consulted by every help control on the page. A control whose slug is absent
renders nothing.

**Rationale**: FR-015 requires a control to disappear rather than link to a deleted article,
which makes existence a database fact. The naive reading — one query per control — would put
five to ten queries on a page that previously ran two. `cache()` dedupes within a single
request, so N controls cost one query regardless of N, and the result is a set membership test
thereafter.

**Consequence, accepted**: the control must be a server component. Every subject identified so
far (page titles, section headings) lives in a server component, so this costs nothing today.
Where a client component eventually needs one, the parent renders it and passes it down.

**Second layer**: a test asserting that every slug referenced by a control exists in the seed
set. Runtime handles deletion; the test catches typos, which is the failure that would
otherwise show up as a control silently not rendering — the worst symptom, because it looks
like nothing at all.

---

## D5 — Board help goes in a new category

**Decision**: add a tenth entry to `HELP_CATEGORIES` for the board, and write the articles the
board needs.

**Rationale**: the nine existing categories are Getting Started, Assets, Locations, Work
Orders, Photos & Documents, QR Codes, Accounts, Admin & Setup, Troubleshooting. The board is a
peer of Assets and Work Orders — a primary object in the app — not a sub-topic of any of them.
Filing it under Getting Started would bury it, and under Work Orders would misdescribe it,
since a board card is not always a work order.

**Articles to write** (none exist; the board has zero coverage today):

| Slug | Title | Why |
|---|---|---|
| `what-the-board-is` | What the board is for | The landing explanation. What the columns mean, what a card is. |
| `moving-a-card` | Moving a card | Two taps, not drag. Explains the deliberate absence of the gesture people expect. |
| `cards-and-work-orders` | Cards and work orders | The three relationships. Why a ticket's card cannot be moved to a column with no matching status. |
| `board-tags` | Tagging cards | What tags are, that they are shared org-wide. |
| `division-boards` | Division boards | Who can see one, and why it differs from every other read in the app. |
| `board-columns-admin` | Changing board columns | Admin-only. The exactly-one-column rule and why a configuration can be refused. |

---

## D6 — Seeded articles are seed-owned, and this must be said out loud

**Finding, not a decision**: `prisma/seed-help.ts` upserts on slug and its `update` branch
overwrites `title`, `category`, `summary`, `order`, and `body`. The seed runs on container
start. Therefore **an admin's edit to any seeded article is reverted on the next deploy.**

This is existing behaviour and this feature does not change it. It matters here because this
work adds six articles to the seed set, moving them into that category. The `RETIRED_SLUGS`
mechanism already in the file shows the author was thinking about hand-authored articles
surviving — they do, as long as their slug is not in `ARTICLES`.

**Action**: record it in the plan's risk list and mention it in the board-columns article, so
an admin editing a seeded article is not surprised. Changing the upsert to preserve edits is
out of scope and would be a behaviour change under a spec that promises none.

---

## D7 — Three categories of subtitle, and a mechanical rule for telling them apart

**Decision**: remove a subtitle only when its text would be **identical for every user on every
visit** *and* it explains what the feature is. Keep everything else.

**Rationale**: the initial framing assumed two categories — explanation and data. Reading the
code found a third. Several `text-sm text-neutral-500` lines are **state and error messages**:

> "Your selection has expired or wasn't found. Go back to Assets."

appearing on `assets/bulk-edit`, `work-orders/bulk-close`, and `work-orders/bulk-new`. And
`loans` renders either "Nothing is out right now." or a live count. Treating the shared
styling as the signal — "delete every `text-sm text-neutral-500` under an `h1`" — would have
deleted three error recoveries and an empty state. Those are the most important sentences on
their pages.

The rule handles all three without per-file judgement:

| Category | Test | Action |
|---|---|---|
| Explanatory | Same text always; describes the concept | **Remove**, move to help |
| Data-bearing | Text derives from a query | **Keep** |
| State / error | Text depends on the request outcome | **Keep** |

**Rejected**: removing the subtitle everywhere and letting help carry all of it. It fails the
three pages above outright, and it would leave `/assets` without "300 total" — a number people
use constantly.

---

## D8 — Tap targets grow by padding, not by size

**Decision**: reach 44×44px with padding plus negative margin, leaving the visible control the
size it is.

**Rationale**: the audit found controls with no padding at all — the board columns admin
renders `Edit` and `Delete` as bare text at `text-xs`, giving roughly a 30×16px target. Making
them visibly bigger would rebalance a screen that is otherwise correct, and the spec's own
FR-004 says the activation region grows "without altering the visual weight of the control."
Padding with compensating negative margin achieves both: the hit box grows, the layout does
not move.

---

## D9 — Verification is a capture sweep, not a diff read

**Decision**: verify by running an automated sweep across every route × both themes × both
widths, and by following every help link in a live application.

**Rationale**: Principle IV, and the specific failure mode of this kind of work. A style pass
"verified" by reading its own diff proves only that the intended change was typed. The two
defects that started this feature — a near-white panel and a table past the screen edge —
were both invisible in source and obvious in a screenshot. The tooling already exists in the
scratchpad from the audit that produced this spec.

Three things the sweep must assert mechanically rather than by eye:

1. `document.documentElement.scrollWidth <= innerWidth` on every route at 390px — SC-001.
2. Computed contrast ratio for every text node against its effective background — SC-002.
3. Bounding box of every interactive element ≥ 44×44 — SC-003.

For NFR-001, the demonstration is a diff filter: no file under any `actions.ts`, `dal.ts`,
`board-auth.ts`, or `middleware` path may appear in the diff at all. That is checkable by
command and is stronger than asserting care was taken.
