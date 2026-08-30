# Feature Specification: Shared Task Board

**Feature Branch**: `feature/kanban-board`

**Created**: 2026-08-28

**Status**: Draft

**Input**: User description: "Make one shared 'what are we doing?' board so the group stops relying on scattered chat memory and vibes... It's not supposed to be corporate Scrum hell. It's a lightweight shared brain so lazy asses can look once and know: what's happening, who's got it, what's stuck, and what do I do next?"

## Overview

A shared task board, one per department, that answers four questions at a glance:

**What's happening · Who's got it · What's stuck · What do I do next**

The board is not a project-management system. It is a replacement for remembering things in chat. Every design decision below is subordinate to that: if a feature would make a volunteer hesitate, it does not belong.

Work orders appear on the board automatically, so maintenance work shows up without anyone re-entering it. Cards can also be created on the spot for the work that is not a work order at all — ideas, decisions, projects, "we should totally".

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Look once and know what's happening (Priority: P1)

A department member opens their board on a phone and sees, in one screen, everything their department has in flight — grouped by state, each card showing who owns it and what the next action is.

**Why this priority**: This is the entire point. Every other story adds to it. With only this, the board already replaces "scroll back through chat to work out what's going on", which is the actual problem.

**Independent Test**: Seed a department with cards across all columns, open the board on a phone-sized viewport, and confirm a reader can state what is in progress, who owns each item, and what is blocked — without tapping into anything.

**Acceptance Scenarios**:

1. **Given** a department board with cards in several columns, **When** a member opens it on a phone, **Then** they see columns with their cards, and each card shows title, owner, and next action without opening it.
2. **Given** a card with no owner, **When** it is displayed, **Then** the absence of an owner is visually obvious rather than blank — an unowned card in progress is a problem the board should surface.
3. **Given** a board with more cards than fit on screen, **When** a member scrolls, **Then** column identity remains apparent so they never lose track of which state they are reading.
4. **Given** a user with no department membership, **When** they open the board area, **Then** they are told plainly that they are not in a department yet, rather than shown an empty board that looks broken.

---

### User Story 2 - Capture it and move it (Priority: P2)

A member adds a card in a few seconds without leaving the board, and moves a card between columns by tapping — not by dragging.

**Why this priority**: A board nobody updates is worse than no board, because it is confidently stale. Capture and movement must be faster than typing a message in chat, or people will keep using chat.

**Independent Test**: On a phone-sized viewport, create a card with title only and confirm it appears immediately; then move it two columns using taps alone, with no drag gesture at any point.

**Acceptance Scenarios**:

1. **Given** a board, **When** a member creates a card, **Then** only a title is required — every other field is optional and can be added later.
2. **Given** a card, **When** a member moves it to another column, **Then** this is possible entirely by tapping. Drag is at most an additional convenience on pointer devices, never the only route.
3. **Given** a member without write access to that department, **When** they view the board, **Then** they can read it but cannot create or move cards, and the interface does not offer actions that will be refused.
4. **Given** a card is moved, **When** another member loads the board, **Then** they see the new position — the board reflects shared state, not one person's view.

---

### User Story 3 - Work orders show up by themselves (Priority: P3)

When a work order is created, a card for it appears on the owning department's board automatically, and its position tracks the work order's real status.

**Why this priority**: Without it the board is a second place to update, and it will diverge from reality within a week. With it, the board reflects maintenance work at zero extra effort.

**Independent Test**: Create a work order for a department, confirm a card appears on that board in the column mapped to its status, change the work order status elsewhere in the app, and confirm the card moves.

**Acceptance Scenarios**:

1. **Given** a work order is created, **When** its department's board is opened, **Then** a card for it is present, visibly marked as backed by a work order and linking to it.
2. **Given** a work-order-backed card, **When** the underlying work order's status changes anywhere in the app, **Then** the card's column reflects the new status.
3. **Given** a work-order-backed card, **When** a member moves it to a column that maps to a work order status, **Then** the work order's status changes accordingly, and this is subject to the same permission check as editing that work order directly.
4. **Given** a work-order-backed card, **When** a member tries to move it to a column with no work order status mapping, **Then** the move is refused with an explanation, rather than silently decoupling the card from its work order.
5. **Given** a work order reaches a terminal status, **When** time passes, **Then** its card stops cluttering the active board while remaining findable.

---

### User Story 4 - Tell whose card it is, and filter to just theirs (Priority: P4)

Cards carry tags identifying the team or topic. Tags are visible on the card and can be filtered.

**Why this priority**: Requested specifically. Valuable once boards have enough cards that scanning them stops being instant — which is later than it sounds.

**Independent Test**: Tag cards across two teams, confirm the tags are legible on the card at phone width, and confirm filtering to one tag hides the rest.

**Acceptance Scenarios**:

1. **Given** a card with tags, **When** it is displayed, **Then** its tags are identifiable at a glance, including by someone who cannot easily distinguish colours.
2. **Given** a board, **When** a member filters by a tag, **Then** only cards carrying it remain, and the fact that a filter is active is obvious.
3. **Given** an active filter, **When** the member returns to the board later, **Then** they are not silently still filtered — a filter that persists invisibly makes the board lie.

---

### User Story 5 - See across departments (Priority: P5)

Someone whose responsibility spans multiple departments sees all the boards they have rights to, in one place.

**Why this priority**: Useful to a handful of people — org admins and leads — rather than to most users. Real value, narrow audience.

**Independent Test**: As an org admin, confirm every department board is visible in the roll-up. As a member of one department, confirm only that one appears.

**Acceptance Scenarios**:

1. **Given** an org admin, **When** they open the roll-up, **Then** every department's board is represented.
2. **Given** a member of one department, **When** they open the roll-up, **Then** they see their own department, and the view does not imply others are hidden by error.
3. **Given** a roll-up across several departments, **When** it is displayed, **Then** each card's department is identifiable — an aggregated card with no source is not actionable.

---

### User Story 6 - Make it fit how we actually work (Priority: P6)

An org admin adjusts a board's columns and colour coding. Defaults work untouched.

**Why this priority**: Explicitly wanted, explicitly not required up front. The defaults must be good enough that this is never urgent.

**Independent Test**: Confirm a brand-new department board is fully usable with no configuration; then rename a column, add one, reorder them, and confirm existing cards remain on valid columns throughout.

**Acceptance Scenarios**:

1. **Given** a new department, **When** its board is first opened, **Then** the default columns exist and work with no setup.
2. **Given** an org admin renames or reorders columns, **When** members view the board, **Then** cards remain correctly placed.
3. **Given** an org admin attempts to remove a column containing cards, **When** they confirm, **Then** they must say where those cards go — cards are never silently destroyed.
4. **Given** a non-admin, **When** they view a board, **Then** column configuration is not offered to them.

---

### Edge Cases

- **A card's owner leaves the organization.** The card must remain, showing that its owner is gone, rather than disappearing or displaying a broken reference.
- **A work order moves department.** Its card must follow to the new department's board.
- **A work order is deleted or cancelled.** Its card must not linger as a ghost referencing nothing.
- **Two people move the same card at once.** The board must converge on one outcome; the loser is told rather than silently overwritten.
- **A department is deactivated.** Its board becomes read-only rather than vanishing with its history.
- **Network drops mid-move.** The board must not show a move that did not persist. A move that failed must be visibly reverted and reported.
- **A board with hundreds of Done cards.** The active view stays readable; completed work is reachable but not in the way.
- **A column is deleted while someone else has the board open.** The stale client must recover without stranding cards in a column that no longer exists.
- **A user is a member of no department.** They see an explanation, not a broken empty state.

## Requirements *(mandatory)*

### Functional Requirements

**Boards and access**

- **FR-001**: The system MUST provide exactly one board per department, available without setup.
- **FR-002**: Any signed-in user MUST be able to view any department board, consistent with the existing org-wide read model.
- **FR-003**: Creating, editing, and moving cards MUST require membership of that department at the existing write role, or org-admin. This MUST be enforced per record at the data layer, not only in the interface.
- **FR-004**: The interface MUST NOT offer actions the current user is not permitted to perform.
- **FR-005**: A roll-up view MUST show every board the current user is entitled to see, deriving that entitlement from the existing division/department/role model without introducing a new permission concept.
- **FR-005a**: A division MUST be able to have a designated lead, mirroring the existing department lead.
- **FR-005b**: A division lead MUST see the boards of every department in their division in the roll-up.
- **FR-005c**: An org admin MUST be able to assign and change a division's lead through the administration interface.

**Division boards**

- **FR-005d**: Each division MUST have its own board, created without setup, in addition to its departments' boards.
- **FR-005e**: A division board MUST be visible only to that division's lead and to org admins. **Not** to leads of departments within it, and not to members. This is a restricted read and MUST be enforced at the data layer, not by omitting a link.
- **FR-005f**: A request for a division board by someone not entitled to see it MUST behave as though it does not exist, rather than confirming its existence with a refusal.
- **FR-005g**: A division board MUST NOT auto-create cards from work orders. A work order appears on one only when a user attaches it to a card deliberately.
- **FR-005h**: Writing to a division board MUST require the same entitlement as reading it — there is no one who may see a division board but not change it.

**Columns**

- **FR-006**: Every board MUST have working default columns on creation: Ideas/Backlog, Ready/Next Up, In Progress, Blocked, Done/Archived.
- **FR-007**: Org admins MUST be able to rename, reorder, add, and remove columns per board, and set colour coding.
- **FR-008**: Removing a column containing cards MUST require the actor to specify where those cards move. Cards MUST NOT be deleted as a side effect.
- **FR-009**: Column ordering MUST be explicit and stable rather than derived from creation order.

**Cards**

- **FR-010**: A card MUST require only a title to be created.
- **FR-011**: A card MUST support an owner, a next action, an optional due date, status notes, and attached links or files.
- **FR-012**: Cards MUST display title, owner, and next action without being opened.
- **FR-013**: A card with no owner MUST be visually distinguishable from one with an owner.
- **FR-014**: Cards MUST be movable between columns using tap interactions alone. Drag MAY be offered additionally on pointer devices but MUST NOT be the only means.
- **FR-015**: Card position within a column MUST be stable across reloads.
- **FR-016**: A card whose owner is deactivated or deleted MUST remain visible and indicate the owner is no longer available.

**Work order integration**

- **FR-017**: Creating a work order MUST produce a card on the owning department's board.
- **FR-018**: A work-order-backed card MUST be visibly marked as such and link to its work order.
- **FR-019**: A work-order-backed card's column MUST reflect the work order's current status, wherever that status was changed.
- **FR-020**: Each column MAY declare which work order status a move into it sets. Moving a work-order-backed card into such a column MUST update the work order's status, subject to the same authorization as editing that work order directly.
- **FR-021**: Moving a work-order-backed card into a column with no declared status mapping MUST be refused with an explanation. The card MUST NOT become decoupled from its work order.
- **FR-022**: Every work order status MUST map to exactly one column, so no work-order-backed card can be homeless.
- **FR-023**: If a work order changes department, its card MUST move to the new department's board.
- **FR-024**: If a work order is deleted, its card MUST be removed.
- **FR-025**: Standalone cards MUST be freely movable between any columns, unconstrained by work order status mappings.

**Tags**

- **FR-026**: Cards MUST support tags, displayed on the card.
- **FR-027**: Tags MUST be distinguishable without relying on colour alone.
- **FR-028**: A board MUST be filterable by tag, and an active filter MUST be obvious.
- **FR-029**: Filters MUST NOT persist invisibly across sessions.

**Lifecycle and scale**

- **FR-030**: Completed work MUST NOT accumulate in the active view indefinitely, and MUST remain findable after it leaves it.
- **FR-031**: A deactivated department's board MUST become read-only rather than disappear.
- **FR-032**: Concurrent moves of the same card MUST converge on a single outcome, and a rejected move MUST be reported to the user who lost.

**Field conditions**

- **FR-033**: The board MUST be usable on a phone as the primary target, including with imprecise touch input.
- **FR-034**: When the network is unavailable, the board MUST NOT display changes that did not persist. A failed action MUST be visibly reverted and reported.
- **FR-035**: The system MUST NOT require a user to understand kanban, work orders, or the department model to read a board and know what to do next.

### Key Entities

- **Board**: One per department. Owns an ordered set of columns. Read by anyone; written by that department's members.
- **Column**: A named, ordered, colour-coded state on a board. May declare a work order status that a move into it sets, and which statuses it displays.
- **Card**: A unit of work or intent. Carries title, owner, next action, optional due date, status notes, links and files, tags, and a position. Either standalone or backed by a work order.
- **Tag**: A short label identifying a team or topic, attachable to cards and usable as a filter.
- **Work order link**: The relationship making a card a view onto a work order, through which status and column stay consistent.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A member can answer "what's in progress, who owns it, and what's blocked" for their department from a single phone screen without opening any card.
- **SC-002**: Creating a card takes under 15 seconds from opening the board, entering a title only.
- **SC-003**: Moving a card between columns is achievable in at most two taps, with no drag gesture required.
- **SC-004**: A new department board is fully usable with zero configuration.
- **SC-005**: 100% of work orders appear on the correct department board without manual entry.
- **SC-006**: A work order's status and its card's column never disagree, whichever was changed.
- **SC-007**: A volunteer who has never seen the board can state what it shows and take one action on it without being trained.
- **SC-008**: No board action succeeds for a user lacking write access to that department, verified against the data layer and not only the interface.
- **SC-009**: A board with 200 cards remains readable and responsive on a phone.
- **SC-010**: No action that fails to persist is left displayed as though it succeeded.
- **SC-011**: Zero cards are lost through column reconfiguration.

## Assumptions

- **Division boards are a restricted read** (confirmed 2026-08-29), the application's first. Every other read is org-wide. The constitution was amended to 1.1.0 to name the exception rather than let Principle II quietly become untrue.
- **Tickets reach a division board only by hand.** Department boards auto-create a card per work order; division boards do not. A division board is for coordination between departments, and auto-rolling every ticket into it would bury its own cards under ticket volume.
- **A division-lead concept is being added** (confirmed 2026-08-28). `Department` carries `leadUserId` but `Division` had no equivalent, so "the Ops lead sees all Ops departments" was inexpressible. A `leadUserId` on `Division` mirrors the department pattern exactly.
- **Setting a lead needs interface that does not exist yet.** `Department.leadUserId` is in the schema but is written only by the seed — no administration screen assigns it. Division lead therefore requires both the column and the means to set it (FR-005c), or the feature is inert. Whether to add the same control for department lead is a separate decision, deliberately not bundled here.
- **Cards are per-department and not per-team.** Teams are not modelled in the application; tags carry team identity instead, which is why tags exist in this feature rather than being deferred.
- **Boards are created implicitly** with their department rather than needing setup, so the board concept never has to be explained.
- **Offline writes are out of scope for this feature.** The application does not have them yet. The board must fail honestly on a dropped network rather than pretend, and offline capability is a separate piece of work.
- **Attachments reuse the existing file mechanism** rather than introducing a second one.
- **"Done" is time-bounded in the active view** — recently completed work stays visible for a period, then moves to an archive view. The exact window is a tuning decision, not a specification decision.
- **This work stays on a branch in local development.** The hosted instance is in beta with members actively using it; nothing deploys without an explicit decision.

## Out of Scope

Named explicitly because the requester was emphatic that this must not become corporate Scrum:

WIP limits · story points · velocity · burndown charts · sprints or iterations · swimlanes · card dependencies and blocking relationships · time tracking · automated stale-card nagging · per-team sub-boards · cross-department card movement.
