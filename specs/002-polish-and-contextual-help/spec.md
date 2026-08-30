# Feature Specification: Visual polish pass and contextual help

**Feature Branch**: `feature/kanban-board` (continues on the current branch)

**Created**: 2026-08-29

**Status**: Draft

**Input**: Two requests, deliberately specified together because they rewrite the same lines. (1) "we need to have a look across the site and make sure we dont have text overlapping borders, tags or buttons that dont fit quite right… look for formatting and design changes that can clean the site up to make sure everything looks professional". (2) "instead of these sub titles lines that can feel awkward and geard more toward development, lets get rid of them and have a small help button next to anything that across the site that warrants explanation with a link to the article about the subject in the help system… first identify areas that could use explanation (all page titles and major sections, but also individual features and fields), then make sure we have info about the subject in help, then link it up with buttons in place."

**Why one feature and not two**: every page header in the application is touched by both halves. Removing a subtitle, adding a help control, and fixing the spacing of the row they sit in are the same edit. Specifying them apart would mean editing all 43 pages twice and reconciling the result.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Every screen is readable and reachable (Priority: P1)

A volunteer opens the app on a phone, outdoors, in whichever theme their device chose for them. Every panel, badge, and label is legible. Nothing is cut off past the edge of the screen. Every control they need to press is big enough to hit with a gloved thumb.

**Why this priority**: This is the difference between a working tool and a broken one. A washed-out panel that hides the word "Blocked", or an Edit control that sits past the right edge of a phone, is a functional failure — not a cosmetic one. Constitution Principle V makes the field user the constraint, and both defects were found on the two surfaces most likely to be used in the field.

**Independent Test**: Load every route at phone width and at desktop width, in both themes, and confirm no page scrolls sideways, no text sits on a background it cannot be read against, and no control is smaller than a thumb. Delivers value on its own: the app becomes usable in conditions where it currently is not.

**Acceptance Scenarios**:

1. **Given** the dark theme, **When** a user opens the boards index and one or more departments have stuck work, **Then** the "Blocked" roll-up row and its label are legible against their background rather than rendering as a near-white slab.
2. **Given** a 390px-wide phone, **When** a user opens any page in the application, **Then** the page itself does not scroll horizontally; any table too wide to fit scrolls inside its own region while the page stays put.
3. **Given** any page, **When** a user attempts to tap any button, link, or control, **Then** the target responds to a press anywhere within a region at least 44px square, even where the visible control is smaller.
4. **Given** either theme, **When** any status, tag, or state is shown using colour, **Then** the same information is also carried by text or shape.

---

### User Story 2 - A page explains itself when asked, and stays quiet otherwise (Priority: P2)

A volunteer lands on a screen they have not seen before — Asset Groups, the board, Resolution Codes. The page does not lecture them with a subtitle written for developers. Next to the title is a small help control. Pressing it opens the article that explains exactly that thing.

**Why this priority**: The explanation is worth more than the subtitle it replaces, because it can be as long as it needs to be and lives where it can be maintained. But it depends on P1 — a help control that is too small to press, or invisible in dark mode, is worse than the subtitle it replaced.

**Independent Test**: Walk every page, confirm no developer-facing subtitle remains, confirm each help control opens an article that actually explains that page, and confirm no control points at a missing or unrelated article.

**Acceptance Scenarios**:

1. **Given** the Asset Groups page, **When** a user views the header, **Then** the line "Batches created together — for bulk updates and QR sheets." is gone and a help control sits beside the title.
2. **Given** any help control anywhere in the application, **When** a user activates it, **Then** they arrive at a specific help article about that subject — never the help index, never a search page, never a missing article.
3. **Given** a page whose subtitle carries live data — "300 total", the signed-in email address, "12 assets use this type" — **When** the pass is applied, **Then** that line is retained, because it is information and not explanation.
4. **Given** a screen reader, **When** it reaches a help control, **Then** it announces what the control explains, not merely "button".
5. **Given** a section or field whose meaning is not obvious from its label — resolution codes, a division's board visibility, status versus condition — **When** a user looks at it, **Then** a help control is available at that section or field, not only at the top of the page.

---

### User Story 3 - The application reads as deliberate (Priority: P3)

Someone shows the app to a board member or a prospective adopter. Nothing on screen looks accidental: rows are not stretched with their content huddled at one end, a lone item does not sit in a grid as a half-width orphan, and no screen displays a raw internal identifier where a human label belongs.

**Why this priority**: Real, but nobody is blocked by it. It is what "looks professional" means once the functional defects in P1 are gone.

**Independent Test**: Review each page at desktop width and confirm sibling elements share alignment and spacing, and that nothing internal to the system has leaked into the interface.

**Acceptance Scenarios**:

1. **Given** a wide desktop viewport, **When** a user views the boards index roll-up, **Then** each row's content is composed across the row rather than clustered at the left of an otherwise empty band.
2. **Given** a section grid containing a single item, **When** it renders, **Then** it does not read as a half-finished row.
3. **Given** the board columns admin screen, **When** a user reads which work order states a column shows, **Then** they see human-readable labels rather than raw internal identifiers such as `WAITING_PARTS`.

---

### Edge Cases

- **A help article is deleted after a control links to it.** Authoring is org-admin-editable, so a link placed today can rot. A control whose article is missing must not render a dead link.
- **The user is offline.** The app is an installed PWA and help articles are served from the database. A help control must not appear to work and then dead-end; offline navigation falls through to the existing offline screen.
- **Printing.** Work orders have a print view. Help controls must not appear on printed output.
- **A long name in a header.** Department, division, and asset names are user-supplied; a help control beside a title must not be pushed off screen or wrap awkwardly when the title is long.
- **A subtitle that mixes data and explanation.** Some headers carry both. The data half is kept; only the explanation moves into help.
- **A page with no sensible article.** Not every screen warrants one. Where no article can honestly be written, no control is added, rather than linking to something approximate.
- **Theme set to system default.** Neither an explicit light nor an explicit dark marker is present; the page must still resolve to a complete, legible palette.

## Requirements *(mandatory)*

### Functional Requirements — Legibility and fit

- **FR-001**: Every tinted panel, badge, and callout MUST remain legible in both themes. No surface may render as near-white in the dark theme, and no dark text may sit on a darkened panel.
- **FR-002**: The dark-theme palette MUST be complete for every colour family the application actually uses, so that a component using a supported family is correct without needing per-component overrides.
- **FR-003**: No page may scroll horizontally at 390px in either theme. Content too wide to fit MUST scroll within its own bounded region.
- **FR-004**: Every interactive control MUST present an activation region of at least 44×44px, without altering the visual weight of the control.
- **FR-005**: Text MUST NOT overlap, escape, or be clipped by its container at any supported width.
- **FR-006**: Meaning MUST NOT be carried by colour alone; every colour-coded state MUST also be identifiable from text or shape.
- **FR-007**: Text and background pairings MUST meet WCAG AA contrast (4.5:1 normal, 3:1 large and non-text indicators) in both themes.

### Functional Requirements — Contextual help

- **FR-010**: Explanatory subtitle lines under page titles MUST be removed.
- **FR-011**: Subtitle lines that carry live data — counts, totals, the signed-in email, "N assets use this type" — MUST be retained. Only explanation is removed.
- **FR-012**: A help control MUST be available beside page titles, beside major section headings, and beside individual features or fields whose meaning is not evident from their label.
- **FR-013**: Each help control MUST link to one specific article about that subject. Linking to the help index, a category listing, or a search result does not satisfy this.
- **FR-014**: Every help control's target article MUST exist and MUST actually explain the thing the control sits beside. Where no such article exists, one MUST be written as part of this work.
- **FR-015**: A help control whose target article is absent MUST NOT render, rather than rendering a dead link.
- **FR-016**: Help controls MUST be unobtrusive enough not to compete with the title, and MUST carry an accessible name stating what they explain.
- **FR-017**: Help controls MUST NOT appear in printed output.
- **FR-018**: New help articles MUST be part of the seeded content set, so a newly deployed instance has them without manual authoring.
- **FR-019**: The help content set MUST cover the task board, which today has no coverage of any kind.

### Functional Requirements — Consistency

- **FR-020**: Sibling elements in the same group MUST share alignment, spacing, and width behaviour.
- **FR-021**: Full-width rows MUST compose their content across the available width rather than clustering it at one end.
- **FR-022**: A grid containing a single item MUST NOT render that item as a half-width orphan.
- **FR-023**: Raw internal identifiers MUST NOT be displayed where a human-readable label exists.

### Non-Functional Requirements

- **NFR-001**: This work MUST NOT change behaviour, data, or authorization. No server action's access checks may be modified.
- **NFR-002**: No database migration is required by the visual half. The help half adds content, not schema.

### Key Entities

- **Help article**: an existing authored document with a category, slug, and title. Already exists; this feature adds instances and links to them.
- **Help control**: a small affordance that names a subject and points at its article. New.
- **Theme palette**: the central mapping that produces light and dark surfaces. Already exists; this feature completes it.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero routes scroll the page horizontally at 390px, in both themes. Currently one does.
- **SC-002**: Every text-on-background pairing in the application meets WCAG AA in both themes.
- **SC-003**: Every interactive control has an activation region of at least 44×44px.
- **SC-004**: 100% of help controls resolve to an existing article whose content covers the subject the control sits beside — verified by following every link, not by inspecting the code.
- **SC-005**: A person who has not used the application can state what any given page is for within 30 seconds, using only that page and its help control.
- **SC-006**: No information is lost: every removed subtitle is either explanation now available in help, or was retained because it carried data.
- **SC-007**: The task board is documented in help, closing the current total absence of coverage.
- **SC-008**: Typecheck, lint, and build are clean, and the diff contains no change to any server action's authorization logic.

## Assumptions

- **"Warrants explanation"** means a page title, a major section heading, or a field whose meaning a new volunteer could not infer from its label. Where a label is self-evident — "Name", "Email" — no control is added. Adding one everywhere would reproduce the noise the subtitles were removed for.
- **WCAG AA** is the contrast bar, chosen because the stated environment is bright sun, where AA is a floor rather than a target.
- **390px and 1440px** are the two verification widths, representing a common phone and a common laptop. Wider desktop widths are spot-checked rather than exhaustively swept.
- **Both themes are verified explicitly.** The system-default setting resolves to one of the two, so testing both covers it.
- Help articles remain database-backed and admin-editable; this feature adds to the seed set rather than changing how help works.
- The existing help categories are extended if the board does not fit any of them, rather than filing board content under an unrelated heading.

## Audit evidence *(defects confirmed before this spec was written, not hypothetical)*

Captured across 15 routes × 2 themes × 2 widths.

| # | Where | What | Requirement |
|---|-------|------|-------------|
| A1 | Boards index, dark | The stuck roll-up row renders near-white; its "Blocked" label is close to invisible. The dark palette completes the `-50` tint for eight colour families but not the two the board introduced. | FR-001, FR-002 |
| A2 | Same, dark | Border and text colours paired with those two families are likewise unadjusted — dark text on what should be a dark panel. | FR-001, FR-002 |
| A3 | `/admin/divisions`, both themes, 390px | The page scrolls sideways; the Edit action sits past the right edge. Caused by a column added to a table that already just fit. | FR-003 |
| A4 | Board columns admin, dark | Reorder and Edit/Delete controls are dim, closely spaced, and have no padding — small targets, low contrast. | FR-004, FR-007 |
| A5 | Board columns admin | Work order states are shown as raw identifiers (`WAITING_PARTS`, `COMPLETE, CLOSED, CANCELLED`). | FR-023 |
| A6 | Boards index, wide | Roll-up rows span the container with content clustered at the left. | FR-021 |
| A7 | Boards index | A single division renders as a half-width card above a full grid of departments. | FR-022 |
| A8 | Site-wide | 29 help articles exist; none covers the board, and there is no category it belongs to. | FR-019 |
| A9 | Site-wide | Roughly 25 page headers carry an explanatory subtitle; roughly 6 carry a data subtitle that must survive. | FR-010, FR-011 |
