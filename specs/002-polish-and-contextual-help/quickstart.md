# Quickstart: verifying the polish pass

The point of this document is that **a style pass cannot be verified by reading its own
diff.** The diff proves the intended change was typed. The two defects that started this
feature — a near-white panel and a table running off a phone screen — were both invisible in
source and obvious in a screenshot. Constitution Principle IV, applied to a feature where it
is unusually easy to skip.

## Prerequisites

- Dev server on `localhost:3000` against the seeded local database.
- Playwright **in the scratchpad only** — never added to the project's dependencies.
- A signed-in session token for an org admin, plus one non-admin, since roughly a third of
  the routes are admin-only and a sweep run as one user silently skips them.

## The sweep

Every route × both themes × {390px, 1440px}, plus a print-emulation pass.

Three assertions are mechanical, not visual. Eyeballing a screenshot catches a glaring panel;
it does not catch a 41px tap target or a 4.2:1 contrast ratio.

| Assertion | Check | Criterion |
|---|---|---|
| No page-level horizontal scroll | `documentElement.scrollWidth <= innerWidth` at 390px | SC-001 |
| Contrast | Computed ratio for each text node against its effective background | SC-002 — 4.5:1 normal, 3:1 large |
| Tap targets | Bounding box of every focusable element | SC-003 — ≥ 44×44 |
| Layout did not move | Before/after capture per route | Research D8 — padding must not shift layouts |

Screenshots are the fourth output, reviewed by eye for the things no assertion catches:
crowding, misalignment, a control that fits but looks wrong.

## Palette symmetry

```
node scratchpad/palette-symmetry.mjs
```

Parses `src/app/globals.css` and fails when the `.dark` block and the `@media print { .dark }`
block declare different sets of custom properties. Exists because the palette is maintained in
two places, and a variable added to one and not the other produces a defect that appears only
on paper — the least likely place anyone looks. Research D2.

## Help links

SC-004 requires following **every** control in a running application, not inspecting the code.
For each: it renders, it navigates, and the article it reaches actually explains the thing the
control sat beside. The third is the one static checking cannot do.

Then the negative case, which is the behaviour most likely to be wrong and least likely to be
noticed: delete an article row locally, reload the page that links to it, confirm the control
is **absent** rather than dead.

## The negative proof

NFR-001 promises no behaviour, data, or authorization change. Demonstrated by command, not by
assertion:

```
git diff --name-only main... | grep -E '(actions|dal|board-auth|middleware)\.ts$'
```

Empty output is the proof. Any hit is a spec violation and must be justified or reverted.

Then the standard gates: `npx tsc --noEmit`, `npm run lint`, `npm run build`.

## What cannot be self-certified

**SC-005** — an untrained person stating what a page is for within 30 seconds, using only the
page and its help control. This needs someone who has not seen the app. It will be reported as
outstanding rather than as met, in the same way the board's untrained-user gate was, which the
user has already deferred to after deployment.

Reporting it as passed on the basis of my own reading of the pages would be worthless: I wrote
them, so I cannot be surprised by them.
