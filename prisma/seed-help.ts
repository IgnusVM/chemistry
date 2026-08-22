import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

type ArticleSeed = {
  slug: string;
  title: string;
  category: string;
  summary: string;
  order: number;
  body: string;
};

const ARTICLES: ArticleSeed[] = [
  {
    slug: "quick-guide",
    title: "Chemistry in five minutes",
    category: "getting-started",
    order: 0,
    summary: "The fastest path from sign-in to a logged work order.",
    body: `Chemistry is Alchemy's asset tracker and maintenance log. If you only read one page in this guide, read this one.

**Sign in.** Enter your email on the sign-in page and a one-time link is sent to you. After you use it once on a device, Chemistry offers to remember that device with a short PIN so you don't need email every time — see [Signing in](/help/getting-started/signing-in).

**Find an asset.** Every physical asset — every lantern, tool, vehicle, structure component — has a tag and a QR code. Tap **Scan** in the bottom bar on a phone, or search the **Assets** tab, to open its page: status, condition, location, custom fields, and full history. If the thing you scanned already has an open ticket, the scan tells you before anything else, so you don't start work someone's already doing.

**On your phone.** Chemistry installs to your home screen and is laid out for one-handed use in the field. See [Using Chemistry on your phone](/help/getting-started/using-chemistry-on-your-phone) — including an honest account of what does and doesn't work without signal.

**Something's wrong with it?** Open the asset and click **Report a problem**. That creates a work order — Chemistry's name for a maintenance ticket — pre-linked to the asset. Describe what's wrong, pick a priority, and submit. See [Creating a work order](/help/work-orders/creating-a-work-order).

**Working a ticket?** Open it from the **Work Orders** tab, assign it to yourself, move its status along as you go (Open → In Progress → Complete), attach photos if useful, and when you're done pick a resolution code and add resolution notes — closing it locks the ticket down to a summary view until it's reopened. See [Resolution codes explained](/help/work-orders/resolution-codes-explained) and [Closing and reopening a work order](/help/work-orders/closing-and-reopening-a-work-order).

**Adding new gear?** Use **Assets → New asset** for one item, or **Assets → Bulk create** when you're tagging a whole batch (say, forty lanterns) at once with a shared name template and sequential tags. See [Creating an asset](/help/assets/creating-an-asset).

**Handling a whole batch at once?** Select multiple rows on the Assets or Work Orders list (checkboxes, shift-click, select-all) to bulk-edit assets, bulk-close tickets, or file the same ticket against many assets in one go — see [Selecting multiple items](/help/getting-started/selecting-multiple-items).

**Borrowing a tool?** Asset types marked as loanable get a **Loans** tab for checking gear in and out, with a log of who had what. The **Loans** tab in the nav shows everything currently out. See [Checking tools in and out](/help/assets/checking-tools-in-and-out).

**Everything else** — divisions, departments, asset types, resolution codes, locations, and user roles — lives under the **Admin** tab, one level down, because you mostly won't need to touch it. See [What lives under Admin](/help/admin-setup/what-lives-under-admin).

When in doubt, search this guide from the box at the top of the **Help** tab — it searches every article's title and body.`,
  },
  {
    slug: "signing-in",
    title: "Signing in: magic links and PINs",
    category: "getting-started",
    order: 1,
    summary: "How passwordless sign-in works, and how the quick PIN saves you from re-checking email every time.",
    body: `Chemistry doesn't use passwords. You sign in with your email address, and a link is emailed to you that logs you in when you click it. That link expires after a short window and can only be used once, so a new one is generated every time you need it.

**Getting an account.** Chemistry is invite-only — there's no public sign-up. An org admin generates a one-time invite link (from **Admin → Users**) and sends it to you; opening it asks for your name and email, creates your account, and immediately emails you a sign-in link. Each invite link only works once.

**First sign-in on a device.** Enter your email on the sign-in page, check your inbox, and click the link. You'll land back in Chemistry, signed in — and that browser is automatically remembered as a trusted device.

**Quick PIN.** A trusted device alone doesn't skip sign-in by itself — for that, set a short PIN from your **Account** page. Once you have a PIN, opening Chemistry again on that same trusted device offers a PIN prompt instead of making you wait on another email — much faster if you're checking work orders repeatedly during a shift. The PIN is tied to that specific browser/device, not your account globally, so a new device always starts with the email link. If you'd rather sign in with email even on a trusted device, the PIN screen has a **"Not you? Sign in with email"** link.

**PIN lockout.** After several wrong PIN attempts in a row, PIN entry locks temporarily as a safety measure. Signing in again with the email link clears the lockout immediately, since a magic-link sign-in is a stronger proof of identity than the PIN.

**Signing out** clears the session on that device but does not remove the device's trust — you'll still be offered the PIN next time unless you click **Forget this device** on your Account page.

**Losing access to your email** means losing the ability to sign in anywhere new, since the magic link is the root of trust. If that happens, ask an org admin to update the email on your user record from **Admin → Users**.`,
  },
  {
    slug: "selecting-multiple-items",
    title: "Selecting multiple items",
    category: "getting-started",
    order: 2,
    summary: "Checkboxes, shift-click ranges, and \"select all\" across pages — the shared selection UI behind every bulk action.",
    body: `The **Assets** list, the **Work Orders** list, and an Asset Group's member list all share the same selection UI, used for bulk actions like editing many assets at once or closing many tickets at once.

**Checking rows.** Click a row's checkbox to select it — clicking again deselects it. This works exactly like any checkbox; nothing special is needed for a single pick.

**Shift-click for a range.** Click one checkbox, then hold Shift and click another — everything between the two (in the order shown on screen) gets selected or deselected together, matching whichever state your Shift-click set. This only works within the rows currently on screen; it can't reach across a page boundary.

**Select all on this page** is the checkbox in the table header — it selects (or clears) every row currently shown.

**Select all matching your filter.** Once every row on the current page is checked, a link appears offering to select everything that matches your current search/filter — not just the page you're looking at. This is what lets a bulk action cover hundreds of items without you paging through them one screen at a time. There's a cap (500 items) on how many can be selected for one bulk action at once; if your filter matches more than that, narrow it first (by department, status, or search text) rather than trying to select everything in one shot.

**How many rows you see.** Lists show 15 rows by default, chosen so a page fits on one screen without scrolling — including on a phone. The **Show: 15 / 50 / 100 / 250** control at the bottom of the list switches to a longer page when you'd rather scan a lot at once, and it sticks to the current filter and search as you page through.

**Once something's selected**, a toolbar appears above the list with the count selected and whatever bulk actions that list supports — bulk edit, bulk close, printing a QR sheet for the selection, and so on. Selecting "all matching filter" is re-checked at the moment you submit, so the count you see in the next step reflects what's true right then, not what it was when you clicked select-all.`,
  },
  {
    slug: "creating-an-asset",
    title: "Creating an asset",
    category: "assets",
    order: 0,
    summary: "Single-asset creation, asset types, custom fields, and required fields explained.",
    body: `Go to **Assets → New asset**.

Every asset needs an **asset tag** (a short unique identifier — this becomes part of its QR code and its URL), a **name**, an **asset type**, and an **owning department**. Asset type drives everything else about the form: pick "Solar Lamplighter Lantern," for example, and the form grows extra fields for panel lot, control board batch, firmware version, and battery cell serial, because that's how that asset type was configured. Different types show different fields — see [Asset types and custom fields](/help/admin-setup/asset-types-and-custom-fields) for how those are defined.

**Status** defaults to Active and tracks the asset's operational state: Active, In Repair, Storage, Retired, Lost, or Destroyed. **Condition** is a separate, more subjective scale: New, Good, Fair, Poor, Unserviceable. An asset can be Active and Poor at the same time — it's in service but due for attention.

**Location** is optional at creation time but worth setting if you know where the thing physically is. If the real location isn't in the dropdown — you're out in the field somewhere that was never registered as a formal Location — pick **Other / custom…** and type a free description. See [Custom locations](/help/locations/custom-locations) for details on how that's tracked.

Once created, you land on the asset's detail page, which has its QR code ready to print or scan immediately.`,
  },
  {
    slug: "bulk-creating-assets",
    title: "Bulk-creating a batch of assets",
    category: "assets",
    order: 1,
    summary: "Tagging a whole shipment or fleet at once with sequential tags or a pasted list.",
    body: `When you're onboarding a whole batch of identical or near-identical gear — forty solar lanterns, a pallet of tools — creating them one at a time is slow. **Assets → Bulk create** handles this.

You choose between two ways of specifying tags:

**Sequential range** — give a prefix (e.g. \`LL-\`), a starting number, a count, and how many digits to zero-pad to. Chemistry generates \`LL-0001\` through \`LL-0040\` (or whatever range you asked for) automatically. This is the fastest option when your tags are already numbered stickers.

**Paste a list** — if your tags don't follow a clean numeric sequence, paste them one per line (or comma-separated) instead.

Every asset in the batch shares the same **name template** (each asset is named "{template} {tag}"), asset type, department, status, condition, location, and custom field values — you're describing one thing that got made forty times, not forty different things. If individual assets in the batch need different custom field values later, edit them individually afterward from their own asset page.

The whole batch is also grouped into an **Asset Group**, visible under the **Asset Groups** tab, which is the easiest way to pull up all forty lanterns at once later — for instance to print QR code sheets for the whole batch in one go from the Assets list's **Print QR sheet for selected** button.

Batches are capped at 500 assets per submission; anything larger should be split into multiple bulk-create runs.`,
  },
  {
    slug: "asset-status-and-condition",
    title: "Status vs. condition — what's the difference",
    category: "assets",
    order: 2,
    summary: "Two separate scales that answer two different questions about an asset.",
    body: `Assets track two axes that are easy to conflate but answer different questions.

**Status** answers "where is this asset in its lifecycle right now?" — Active (in normal service), In Repair (currently being worked on, usually because a work order is open against it), Storage (not deployed but not broken), Retired (out of service permanently but kept on record), Lost, or Destroyed. Status is what you change on the asset detail page's **Status** panel, and it's what most list filtering and reporting cares about.

**Condition** answers "how good of shape is it in?" — New, Good, Fair, Poor, Unserviceable. An asset can be Active and Poor simultaneously (still deployed, visibly beat up, due for attention), or In Repair and Good (pulled for routine preventive maintenance, nothing actually wrong with it). Condition is set at creation and updated manually as you inspect the asset; it doesn't move automatically alongside status.

A useful habit: when you close out a work order that fixed something, consider whether the asset's condition should improve to reflect the repair, and whether its status should move back to Active.`,
  },
  {
    slug: "asset-groups",
    title: "Asset Groups",
    category: "assets",
    order: 3,
    summary: "What a group is, how it's created, and what it's useful for.",
    body: `An **Asset Group** is a named collection of assets, most often created automatically as a side effect of a [bulk create](/help/assets/bulk-creating-assets) — every asset added in one bulk-create submission is grouped together under the batch name and description you gave it (e.g. "Lamplighter batch 2026-08-19").

Groups are mainly a convenience for finding "all the things I created together" later, and for bulk operations like printing a QR sheet for an entire batch at once. Open the **Asset Groups** tab to see all groups, and click into one to see and act on every asset inside it. You can also create an empty group directly and add assets to it by pasting a list of tags.

Inside a group, check the boxes next to members (shift-click to select a range) to remove several at once with **Remove selected**, alongside the existing "apply status to all members" control. See [Selecting multiple items](/help/getting-started/selecting-multiple-items) for how that selection UI works — it's the same one used on the Assets and Work Orders lists.

Groups don't affect ownership, department, or any other property of the assets inside them — they're a label for "these came from the same batch," nothing more.`,
  },
  {
    slug: "bulk-editing-assets",
    title: "Bulk-editing assets",
    category: "assets",
    order: 4,
    summary: "Change status and/or location on many assets at once from the Assets list.",
    body: `To change status or location on a batch of existing assets at once — moving a whole shelf of gear into storage after an event, say — filter or search the **Assets** list down to the ones you want, select them (see [Selecting multiple items](/help/getting-started/selecting-multiple-items)), and click **Bulk edit selected** in the toolbar that appears.

The bulk edit page only offers **Status** and **Location** — nothing else can be changed in bulk, since every other field (name, type, department, custom fields) is specific enough per asset that a shared bulk value wouldn't make sense. Each is independent and optional:

- Leave **Status** on "No change" to leave it alone, or pick a value to set every selected asset to it.
- **Location** has three choices: "No change," "Clear location" (removes it without setting a new one), or "Set to…" (pick a real location, or "Other / custom…" for a location not on the formal list).

Submitting applies whichever of the two you changed to every selected asset in one action, and logs it to each asset's own history individually — so if you look at one specific asset's audit trail afterward, the bulk edit shows up there too, not just in one buried log entry somewhere else.`,
  },
  {
    slug: "custom-locations",
    title: "Custom (\"Other\") locations",
    category: "locations",
    order: 1,
    summary: "What to do when the real location of an asset isn't on the Locations list.",
    body: `Chemistry's formal **Locations** list (storage facilities, containers, zones, camps, placements, vehicles) is curated by admins under **Admin → Locations** and is meant to represent named, reusable places. In the field, though, an asset sometimes ends up somewhere that was never formally registered — "behind the shade structure, north camp," say.

Rather than blocking you from recording where the thing actually is, both the **New asset** location field and the asset detail page's **Move** panel offer an **Other / custom…** option. Choosing it reveals a free-text box — describe the location in plain language and submit.

Custom locations behave a little differently from real ones:

- They're **not added to the shared Locations list**. If the same custom spot gets used repeatedly and deserves to become a real Location, an admin should add it properly under **Admin → Locations**.
- Anywhere a custom location is shown — the asset's Location tile, the assets list, the move history timeline — it's marked with a small **yellow asterisk (\\*)** so it's visually obvious at a glance that this isn't a standard, reusable location.
- It's still fully tracked in the asset's move history, same as a move to a real Location, so nothing is lost — it just isn't structured data.

Moving an asset again, to either a real Location or a new custom one, replaces the previous custom text the same way a normal move replaces the previous location.`,
  },
  {
    slug: "understanding-locations",
    title: "Understanding the Locations hierarchy",
    category: "locations",
    order: 0,
    summary: "Location types and how nesting works.",
    body: `Locations in Chemistry come in six types: **Storage Facility**, **Container**, **Zone**, **Camp**, **Placement**, and **Vehicle**. A location can optionally have a parent location, letting you nest — for example a Container that lives inside a Storage Facility, or a Placement inside a Camp.

Locations are managed centrally under **Admin → Locations** since they're shared, reusable data referenced by every asset, not something created per-asset. If you're in the field and the place you need isn't listed, don't wait for an admin — use a [custom location](/help/locations/custom-locations) on the asset itself instead, and flag it to an admin if it should become permanent.

An asset's current location is shown on its detail page and updated any time someone records a **Move**. Every move — real or custom — is kept in the asset's history timeline, including who moved it and when, so you can always reconstruct where something has been.`,
  },
  {
    slug: "creating-a-work-order",
    title: "Creating a work order",
    category: "work-orders",
    order: 0,
    summary: "How tickets get opened, auto-numbered, and linked to an asset.",
    body: `The fastest way to open a work order is from the asset itself: open the asset's page and click **Report a problem**, which pre-fills the asset link for you. You can also start one directly from the **Work Orders** tab if it isn't tied to a specific asset (a general facilities issue, for instance).

Work orders don't have a title field — instead you write a **description** of the issue, which doubles as the work order's headline everywhere it's listed. Pick a **type** (Corrective, Preventive, Inspection, Modification, or Decommission) and a **priority** (Low, Normal, High, or Event Critical).

**Numbering is automatic.** Every work order gets a code like \`CM081926001\` — a two-letter type prefix (CM for Corrective, PM for Preventive, IN for Inspection, MO for Modification, DC for Decommission), the date it was opened (MMDDYY), and a sequence number that resets each day per type. You never assign a number yourself, and codes are permanent once issued.

Once created, a work order starts in **Open** status and can be assigned to someone independently of status — assignment just says who owns it. From Open, status moves through **In Progress → Waiting Parts → Complete → Closed** (or **Cancelled** if it turns out not to be needed). See [Working a ticket end to end](/help/work-orders/working-a-ticket-end-to-end) for the full lifecycle.`,
  },
  {
    slug: "working-a-ticket-end-to-end",
    title: "Working a ticket end to end",
    category: "work-orders",
    order: 1,
    summary: "Assignment, status changes, notes, photos, and closing out.",
    body: `Once a work order exists, open it from the **Work Orders** tab or from the linked asset's page.

The ticket's code, description, status, priority, and its asset/assignee/reporter stay visible at the top no matter what you're doing below — the action bar right under that handles the quick stuff (changing status, reassigning, closing), and the three tabs below it hold everything else.

**Assign it** to yourself or someone else using the assignment control in the action bar. Assignment is tracked separately from status — assigning someone doesn't change where the ticket is in its lifecycle, it just says who owns it.

**Move it through status** as work progresses, also from the action bar: Open → In Progress → (Waiting Parts, if you're blocked on something) → Complete. Status changes are logged with a timestamp so there's always a record of how long each stage took.

**The Details tab** is the main working area: reassigning the linked asset, the resolution fields, parts used, and notes all live there. **Add notes** as you go — anything worth recording that isn't a status change: what you found, what you tried, what you're waiting on. Notes are timestamped and attributed to whoever wrote them, and they stay on the ticket permanently. The **+ Note** and **+ Part** buttons in the action bar jump straight to this tab.

**The History tab** shows every other work order ever filed against the same asset — useful for spotting a pattern before you start troubleshooting from scratch.

**Attach photos, receipts, or reports** from the **Attachments** tab (or the **+ Attachment** shortcut in the action bar) — see [Attachments on work orders](/help/photos-documents/photos-on-work-orders).

**Closing out.** When the work is actually done, pick a **resolution code** in the Details tab — see [Resolution codes explained](/help/work-orders/resolution-codes-explained) — write resolution notes summarizing what actually happened, and use **Save resolution** in the action bar to save them together. This is the single most useful thing for whoever looks at this asset's history six months from now, so be specific rather than terse. Use **Close ticket** in the action bar (or the status control) to actually close it — see [Closing and reopening a work order](/help/work-orders/closing-and-reopening-a-work-order) for what changes once it's closed.

The **reported by** field on a ticket links to that person's [account profile](/help/accounts/your-contact-profile), which shows how they'd prefer to be reached during the burn if you need to follow up with them directly.`,
  },
  {
    slug: "logging-parts-used",
    title: "Logging parts used on a work order",
    category: "work-orders",
    order: 2,
    summary: "Track which parts went into a repair, with optional order history.",
    body: `Any open work order's **Details** tab has a **Parts used** section for recording what actually went into the fix — replaced a battery, swapped a connector, whatever the repair needed. The **+ Part** shortcut in the action bar at the top jumps straight there.

**Logging a part.** Enter a part number and quantity. If it's a part that's been logged before on this asset's type, it's picked up automatically from a suggestions list as you type. If it's genuinely new, you also need to give it a short description — that's what creates the part record, scoped to this asset's **asset type** (a Solar Lamplighter Lantern part and a different asset type's part with the same number are tracked separately, since they're not actually the same thing just because the number matches).

**Optionally logging an order at the same time.** The same form has a toggle to also record a price, a quantity, and a date — useful when you're logging a part right after buying it, so the purchase history builds up as you go rather than needing a separate step later. A purchase link isn't part of this — see below.

**Where parts live afterward.** Every part ever logged for an asset type is visible from that asset type's page under **Admin → Asset Types**, with two separate lists: **Links** (where to buy it and roughly what it costs — no order needed, just a reference, added directly from the part's own page) and **Order history** (an actual record of a purchase — price, quantity, and date, no link). Keeping them separate means a part can have a standing "here's where we get these" link without every order needing one, and an order doesn't get cluttered with a link that might go stale.

To log the same part across many tickets at once instead of one at a time, see [Bulk-closing work orders](/help/work-orders/bulk-closing-work-orders).`,
  },
  {
    slug: "resolution-codes-explained",
    title: "Resolution codes explained (CMMS)",
    category: "work-orders",
    order: 3,
    summary: "What each of the seven resolution codes means and when to use it.",
    body: `When you close a work order, you pick a **resolution code** describing what actually happened. These are based on standard CMMS troubleshooting vocabulary and are deliberately a short, controlled list rather than free text, so patterns become visible over time (if half your "Could Not Duplicate" tickets are on the same asset, that asset probably has an intermittent fault worth digging into properly).

- **Could Not Duplicate** — you looked into the reported issue and couldn't reproduce it. The asset checked out fine when you had it.
- **Could Not Locate** — you went to find the asset to work on it and couldn't — wrong location on record, walked off, buried under something. Different failure mode from "couldn't reproduce the problem"; this is "couldn't even get to it."
- **General Repair** — you found a real problem and fixed it. The default, ordinary case.
- **Misc** — something happened that doesn't fit the other categories. Use the resolution notes to explain, since this code alone doesn't say much.
- **ID10-t** — tech-support shorthand for user error (say it out loud). The asset was fine; the problem was how it was being used or reported. Use sparingly and kindly — resolution notes are visible to whoever's asking, so keep them factual, not snarky.
- **Magic** — it started working again and nobody's entirely sure why. Genuinely useful to record honestly rather than inventing a fake explanation, since "this happens sometimes and self-resolves" is itself useful information for next time.
- **Deferred** — a real issue was found but isn't being fixed right now (parts on order, lower priority than current burn needs, whatever). Leave good resolution notes explaining what's deferred and why, since this ticket is effectively becoming a to-do for later rather than a closed loop.

Resolution codes describe **outcomes**, not root causes — they're deliberately separate from any notion of "failure codes." What actually broke and why belongs in the resolution notes, in your own words.`,
  },
  {
    slug: "closing-and-reopening-a-work-order",
    title: "Closing and reopening a work order",
    category: "work-orders",
    order: 4,
    summary: "What locks once a ticket is closed, and how to undo it.",
    body: `Once a work order's status is set to **Closed**, its page switches to a tighter, mostly read-only view — the resolution (code, notes, labor minutes) and the parts used are front and center, and everything else that's editable on an open ticket disappears: no status dropdown, no reassigning, no changing the linked asset, no adding parts, notes, or photos. What's already there — existing notes, photos, and the full parts list — stays visible, just locked.

This is deliberate: a closed ticket is meant to be a finished record, not something that quietly keeps changing after the fact.

**Reopening.** If a closed ticket needs more work — the fix didn't hold, or it was closed by mistake — click **Reopen work order** at the bottom of the closed view. This is available at any time, with no separate permission beyond what you'd already need to work the ticket. Reopening sets the status back to Open and clears the closed timestamp; everything that was locked becomes editable again immediately.

To close many tickets at once instead of one at a time, see [Bulk-closing work orders](/help/work-orders/bulk-closing-work-orders).`,
  },
  {
    slug: "bulk-closing-work-orders",
    title: "Bulk-closing work orders",
    category: "work-orders",
    order: 5,
    summary: "Close a whole batch of work orders at once with a shared resolution.",
    body: `When several open tickets are all being resolved the same way — a seasonal battery swap across a dozen lanterns, say — closing them one at a time is unnecessary. From the **Work Orders** list, filter down to the ones involved, select them (see [Selecting multiple items](/help/getting-started/selecting-multiple-items)), and click **Bulk close selected**.

The bulk close page only shows fields that make sense applied identically to every selected ticket: resolution code, resolution notes, and labor minutes. The **asset** field isn't there — every ticket keeps its own asset, since that's exactly the thing that's different between them.

**Logging a part while bulk-closing.** The form also lets you log one part as used, applied to every selected ticket at once, tied to each ticket's own asset the same way a normal [part-used entry](/help/work-orders/logging-parts-used) would be. Because the selected tickets can be linked to assets of different asset types, logging a new part number this way can end up creating that part under more than one asset type in a single action — Chemistry shows a confirmation before doing this, naming exactly which asset types will get a new part record, so you're not surprised by it after the fact.

Submitting sets every selected ticket to **Closed** with the resolution you entered, same as closing one manually — see [Closing and reopening a work order](/help/work-orders/closing-and-reopening-a-work-order) for what that locks.`,
  },
  {
    slug: "bulk-creating-work-orders",
    title: "Bulk-creating work orders for many assets",
    category: "work-orders",
    order: 6,
    summary: "File the same ticket against a whole batch of assets at once.",
    body: `To open the same kind of ticket against many assets at once — an annual inspection across a whole fleet of lanterns, say — go to the **Assets** list, filter or search down to the assets involved, select them (see [Selecting multiple items](/help/getting-started/selecting-multiple-items)), and click **Create work orders for selected**.

You'll be asked for one **description**, **type**, and **priority** — applied verbatim to every ticket created, one per selected asset. Each new ticket's **department** is taken from its own asset's department automatically, not chosen on this form, so a selection spanning multiple departments still files each ticket correctly.

After submitting, you land on a confirmation page listing every ticket that was just created, each linking to its own page — from there they behave exactly like any individually-created work order.`,
  },
  {
    slug: "photos-on-work-orders",
    title: "Attachments on work orders",
    category: "photos-documents",
    order: 0,
    summary: "Attaching, viewing, and removing photos, receipts, and reports on a ticket.",
    body: `Open a work order and switch to its **Attachments** tab (or click **+ Attachment** in the action bar at the top, which jumps you there). You can attach one or more files directly — a photo of the damage, of the part that failed, of the fix once it's done, or a receipt or service report worth keeping with the ticket. Each attachment shows who uploaded it and can be removed by anyone with access to that ticket's department if it was added by mistake.

Files are stored securely and served through short-lived, signed links rather than public URLs, so they aren't guessable or accessible outside Chemistry. Images, PDFs, and common office document types (Word, Excel, plain text) are all accepted, up to 20MB per file — non-image files show as a filename card instead of a thumbnail. For reference material that belongs to an entire **asset type** rather than one ticket — a service manual, a wiring schematic — see [Asset type documents](/help/photos-documents/asset-type-documents) instead, which is a separate, type-level attachment system.

A photo taken the moment you find a problem is worth far more than a description written from memory later — when in doubt, snap it before you touch anything.`,
  },
  {
    slug: "asset-type-documents",
    title: "Asset type documents",
    category: "photos-documents",
    order: 1,
    summary: "Attaching service manuals, schematics, and spec sheets to an asset type.",
    body: `Some reference material belongs to an entire **asset type**, not to any single asset or ticket — a service manual for the lantern's control board, a wiring schematic, a manufacturer spec sheet. These live under **Admin → Asset Types**, on each type's own detail page, in the **Documents** section.

Any org admin can upload documents there — PDFs, Word or Excel files, plain text, or images, up to 20MB each — and they're immediately available to anyone who opens that asset type's page. This is the right place for "how do I fix this class of thing" material, as opposed to [work order photos](/help/photos-documents/photos-on-work-orders), which document one specific incident on one specific asset.

Documents can be removed the same way they're added, from the same page, by any org admin.`,
  },
  {
    slug: "qr-codes-and-scanning",
    title: "QR codes and scanning",
    category: "qr-codes",
    order: 0,
    summary: "How the QR code on an asset works and how to print sheets for a batch.",
    body: `Every asset gets a QR code the moment it's created, visible on its detail page. Scanning it opens a short URL — \`/a/{assetTag}\` — that takes you straight to that asset, no searching required. This is the fastest way to look something up while standing next to it.

**Scanning from inside Chemistry.** The **Scan** button in the middle of the bottom tab bar (on phones) opens a built-in scanner. Point it at a sticker and it jumps straight to the asset. A few things worth knowing:

- There's a **flashlight toggle** where the phone supports it, which you will want after dark.
- If a sticker is damaged, scuffed, or the light is hopeless, you can **type the tag by hand** in the box underneath instead.
- The scanner needs camera permission the first time. If you accidentally deny it, you'll need to re-allow camera access for the site in your browser settings.

Your phone's own camera app works too and does the same thing — the built-in scanner just saves you leaving the app.

**If the asset already has an open ticket, scanning tells you.** Rather than dropping you straight onto the asset page, a scan stops and shows any open work orders on that asset first, with a button to open one directly. This is usually the thing you actually wanted to know — *is somebody already on this?* — and it stops two people unknowingly working the same fault. If there's nothing open, the scan goes straight through to the asset as normal, with no extra tap.

**Printing QR codes.** From the **Assets** list, check the boxes next to the assets you want and click **Print QR sheet for selected** to generate a printable sheet with all their codes at once — the fast path after a [bulk create](/help/assets/bulk-creating-assets), where you've just tagged a whole batch and need physical stickers for each one.

The QR code encodes the asset's tag, so as long as the sticker is legible, the asset can always be found even if its name or location changes later.`,
  },
  {
    slug: "your-contact-profile",
    title: "Your contact profile and during-burn preferences",
    category: "accounts",
    order: 0,
    summary: "What's on your account page, what's public within the app, and how notifications work.",
    body: `Your account page (click your name in the top-right nav) lets you set optional contact details: phone number, and how you'd prefer to be reached **during the burn specifically**, since normal channels (email, cell service) may not be reliable on playa. You can check any combination of **cell**, **email**, and a free-text **other** field for anything not covered — a radio channel, a camp location where you can usually be found, whatever's actually reliable for you that week.

**Your badge.** Your account page also sets the small icon shown next to your name throughout Chemistry — on notes, work order attribution, attachments, and part logs. Upload a **profile picture** and that's used; otherwise pick an **icon and colour** from the list. If you set neither, you get a default wrench. It's purely so you can pick your own entries out of a list at a glance.

**Email notifications** are opt-in — toggle **notify by email** if you want a heads-up when something like a work order assignment happens. Leave it off if you'd rather just check Chemistry directly.

**Visibility.** When you're listed as "reported by" on a work order, your name links to a profile page showing your contact info and during-burn preferences to anyone else signed into Chemistry — this is intentionally visible within the app (not public on the open internet) so whoever's working a ticket you filed can actually reach you if they have a question. All fields are optional; leave anything blank that you'd rather not share, and it simply won't show.`,
  },
  {
    slug: "what-lives-under-admin",
    title: "What lives under Admin",
    category: "admin-setup",
    order: 0,
    summary: "A map of every admin-only screen and what it configures.",
    body: `The **Admin** tab (visible only to org admins) is the landing page for everything that's shared, structural data rather than day-to-day asset or work order activity. From there:

- **Divisions** — the top level of Alchemy's org structure, grouping related departments.
- **Departments** — the actual owning teams (Lamplighters, Gate, APW, and so on), each optionally under a division, each with a lead and a member list. Assets and work orders are always owned by a department.
- **Users** — generate invite links for new accounts, plus every existing account's org-admin flag and department memberships/roles (Viewer, Member, Lead).
- **Asset Types** — the templates that define a class of asset and its custom fields, fully editable after creation, with a Documents section for manuals and schematics. See [Asset types and custom fields](/help/admin-setup/asset-types-and-custom-fields).
- **Resolution Codes** — the CMMS-based outcome codes used when closing work orders.
- **Locations** — the shared, reusable place hierarchy assets can be moved between.

Nearly all of this is editable in place after creation rather than delete-and-recreate — see [Fixing mistakes: what's editable](/help/admin-setup/editing-records).

One thing that is deliberately **not** admin-only: [check-out access](/help/assets/checking-tools-in-and-out) for borrowable tools is managed at **Loans → Check-out access**, where any department **lead** can grant it for their own department without needing org admin.

Everything under Admin is deliberately one level down from the main nav, since most day-to-day work only touches **Assets** and **Work Orders**. If you're not an org admin, you won't see this tab at all — ask an existing admin (visible from **Admin → Users**) if you need something here changed.`,
  },
  {
    slug: "asset-types-and-custom-fields",
    title: "Asset types and custom fields",
    category: "admin-setup",
    order: 1,
    summary: "How asset types drive the New Asset form, and how to add or edit custom fields.",
    body: `An **Asset Type** (under **Admin → Asset Types**) is a template — "Solar Lamplighter Lantern," "Golf Cart," "Shade Structure Panel" — that defines what a class of asset is and what extra data it tracks. Picking a type on the New Asset form is what makes type-specific fields appear (panel lot, board batch, and so on for a lantern).

**Creating a type** sets its name, optional manufacturer/model, an optional default owning department (pre-filled on New Asset when this type is picked), and a list of custom fields you build with the **+ Add field** control — each field gets a key (used internally, e.g. \`panelLot\`), a label (shown on forms, e.g. "Solar Panel Lot"), a data type (text, number, checkbox, date, or a dropdown with fixed options), and whether it's required.

**Editing a type** later — renaming it, changing its default department, or adding/removing/renaming custom fields — is done from that type's own page (click into it from the Asset Types list). Changes to the field list only affect the form going forward; existing assets keep whatever values they already have for fields that get removed, though those values stop being shown once the field definition is gone.

**Documents** for manuals and schematics live on the same per-type page — see [Asset type documents](/help/photos-documents/asset-type-documents).

An asset type **can't be deleted** while any asset still uses it, to avoid orphaning data — reassign or retire those assets first if a type genuinely needs to go away.`,
  },
  {
    slug: "departments-and-roles",
    title: "Departments, divisions, and member roles",
    category: "admin-setup",
    order: 2,
    summary: "How the org structure maps to who can do what.",
    body: `**Divisions** are the broadest grouping in Chemistry's org structure — a division contains one or more **departments**. Not every department needs a division.

Every asset and every work order is owned by exactly one department. A department has a **lead** (a single user), a list of **members** with individual roles, and an active/inactive flag.

**Roles**, set per person per department under **Admin → Users**, are:

- **Viewer** — can see the department's assets and work orders but not create or change them.
- **Member** — the normal working role: can create and update assets and work orders for that department.
- **Lead** — same as Member, plus recognized as the department's point of contact. Leads can also grant [tool check-out access](/help/assets/checking-tools-in-and-out) for their own department, and can check gear out on someone else's behalf — the one place a department role carries real permissions beyond org admin.

Separately, a user can be flagged as an **org admin**, which is unrelated to any specific department — it grants access to the entire **Admin** tab (divisions, departments, users, asset types, resolution codes, locations) across the whole org, not just one department's data. Org admin should be reserved for people who actually need to reconfigure shared structural data, not handed out by default.`,
  },
  {
    slug: "checking-tools-in-and-out",
    title: "Checking tools in and out",
    category: "assets",
    order: 60,
    summary: "Borrow and return shared gear, and control who's allowed to.",
    body: `Some assets are things people borrow and bring back — APW's tools being the obvious case. Those get a **Loans** tab on their detail page where you check them out, check them back in, and see everywhere they've been.

**Turning it on.** The Loans tab only appears for asset types marked as loanable, set by an org admin on the asset type (**Admin → Asset Types**, "These get checked in and out"). This is deliberately opt-in: a deployed Lamplighter lantern isn't something anyone checks out, so it shouldn't carry a tab implying otherwise. Flip it on for tool-like types only.

**Checking something out.** Open the asset, go to **Loans**, add a note if it's useful ("taking it to the build site"), and check it out. The asset detail page then shows an amber **Checked out to …** badge in its header, so anyone who scans that tag immediately sees who has it without opening a tab. An item can only be checked out to one person at a time — the database enforces this, so two people tapping the button at once can't both succeed.

**Checking it back in.** Anyone with check-out access for that department can check an item in, not just the person who took it. That's intentional: gear comes back to whoever happens to be at the container, and making the borrower do it personally would just mean it never gets logged. You can record its condition on return, which is worth doing when something comes back worse than it left.

**Who's allowed.** Check-out access is granted per department. Anyone with **Lead** status in a department can grant it for *that department only*, and org admins can grant it for any department. Department leads and org admins always have access themselves without being listed. Manage it at **Loans → Check-out access**, or from the "Manage access" link on any loanable asset.

Granting someone access to a department's tools does **not** make them a member of that department — a Lamplighter can be given access to borrow APW gear without joining APW.

**Seeing what's out.** The **Loans** page lists everything currently checked out across the departments you can see, oldest first, so the things that have been out longest surface at the top. It's the page to open when you're trying to work out where something went.`,
  },
  {
    slug: "using-chemistry-on-your-phone",
    title: "Using Chemistry on your phone",
    category: "getting-started",
    order: 3,
    summary: "Install it to your home screen, and what does and doesn't work without signal.",
    body: `Chemistry is built to be used one-handed while standing in front of something, not just at a desk. On a phone the top nav collapses and you get a **bottom tab bar** — Home, Assets, **Scan**, Tickets, More — with Scan deliberately in the middle as the biggest target, since that's the thing you do most often out in the field.

**Installing it.** You can add Chemistry to your home screen so it opens like an app, full screen with no browser chrome:

- **iPhone/iPad** — open it in Safari, tap the Share button, then **Add to Home Screen**. (This only works from Safari, not Chrome on iOS.)
- **Android** — Chrome usually offers an **Install** prompt on its own; if it doesn't, use the browser menu and pick **Install app** or **Add to Home screen**.

Installing also gets you long-press shortcuts on the icon for **Scan**, **New work order**, and **My work orders**.

**What works without signal — and what doesn't.** Be clear-eyed about this, because the playa is not a place with reliable service. The app's own files are cached, so it opens quickly and doesn't sit on a blank screen. **Your data is not cached.** Assets, work orders, and loans all need a connection, and if you're offline you'll get a plain "No signal" page rather than stale or wrong information. Anything already on screen stays readable.

There's no offline queue yet — you can't file a work order with no signal and have it send later. That's a known gap, deliberately not faked, and it's planned work rather than something quietly half-done.`,
  },
  {
    slug: "notes-and-rich-text",
    title: "Writing notes",
    category: "getting-started",
    order: 4,
    summary: "Rich text or Markdown notes on both assets and work orders.",
    body: `Both **assets** and **work orders** have a **Notes** section for anything that doesn't fit a structured field — what you observed, what you tried, what the next person should know. Notes are append-only and stamped with who wrote them and when, so they read as a running record rather than something that quietly changes.

**Two modes, picked per note.** Above the editor there's a **Rich text** / **Markdown** toggle:

- **Rich text** gives you a toolbar — bold, italic, bulleted and numbered lists, block quotes, code blocks, indent/outdent, plus font and size. Use this for ordinary write-ups.
- **Markdown** is a plain text box that accepts Markdown syntax. Use this when you're pasting something structured — most usefully a fenced code block (triple backticks) for a log dump, an error message, or a config snippet, where rich text formatting would just get in the way.

You can mix modes freely; each note remembers how it was written and renders accordingly.

**A note on safety.** Note content is sanitized before it's displayed, so pasting something from a web page can't inject anything harmful into Chemistry for the next person who reads it. You may occasionally find that exotic pasted formatting is stripped — that's this working as intended.

For code that's genuinely part of an asset rather than a one-off observation — firmware, a charging routine — use [code files](/help/assets/code-files-on-assets) instead, which are versioned properly.`,
  },
  {
    slug: "code-files-on-assets",
    title: "Code files on an asset",
    category: "assets",
    order: 70,
    summary: "Version-controlled source stored on the asset itself, editable from a work order.",
    body: `Some assets *are* partly software — the logic that drives a solar lantern's charging behaviour, for instance. An asset's **Code** tab stores named source files directly on the asset, with full version history, so the question "what's actually running on this thing?" has an answer.

**Creating a file.** Give it a filename with an extension (\`charging-logic.py\`), an optional description of what it does, and paste the contents. The editor colours the code based on the extension — Python, C/C++/Arduino, and JavaScript/TypeScript are all recognised.

**Every save is a version.** Editing a file and saving creates a new version rather than overwriting the old one, optionally with a short message describing the change, exactly like a commit. The version history under each file lists every save with its author, date, and message.

**Comparing and rolling back.** Tick any two versions in the history to see a side-by-side diff of exactly what changed between them; tick one to view it on its own. If a change turns out to be wrong, **Rollback** puts the older content back — and importantly it does so by creating a *new* version rather than deleting anything, so the history of what happened stays intact. Nothing is ever silently erased.

**Editing from a work order.** This is the point of the whole feature. If an asset has code files, its linked work orders show a **Code** card in their Details tab. Editing there saves a new version to the asset itself, tagged with the ticket it came from — so you open a ticket about a misbehaving lantern, change the code as part of fixing it, and the asset's history permanently records that this version came from that repair.`,
  },
  {
    slug: "editing-records",
    title: "Fixing mistakes: what's editable",
    category: "admin-setup",
    order: 3,
    summary: "Nearly everything can be corrected after the fact — here's where.",
    body: `Typos happen, especially at 3am in a dusty container. Almost every record in Chemistry can be corrected after creation rather than deleted and re-made.

**Org admins can edit** part numbers and descriptions, part links and order history, divisions, departments, resolution codes, locations, and asset group names — each from an inline **Edit** control on the row or card itself. Asset types have always been editable from their own page.

**Validation still applies.** Renaming something to a value that's already taken is refused with a clear message rather than silently creating a duplicate — part numbers within an asset type, department and division slugs, and resolution codes are all still unique. Re-parenting a location is checked for loops, so you can't accidentally make a location its own ancestor and break the tree.

**Users** are a partial exception. An org admin can change someone's **user name** and optional name, and can delete an account outright, but **email addresses can't be edited** — a person's email is how they sign in, so changing it would effectively hand their account to someone else. If an email is genuinely wrong, delete the account and send a fresh invite. User names must be unique so that attribution is never ambiguous, and each user's internal ID is shown on their card for when you need to refer to an exact account.

Deleting a user is blocked while they still have anything [checked out](/help/assets/checking-tools-in-and-out) — check the gear back in first, so it doesn't simply vanish from the record.

**What isn't editable:** work order codes and asset tags are permanent identifiers, and audit log entries and notes are append-only by design. If a note is wrong, add a correcting note rather than rewriting history.`,
  },
  {
    slug: "troubleshooting-faq",
    title: "Troubleshooting & FAQ",
    category: "troubleshooting",
    order: 0,
    summary: "Common snags and what to do about them.",
    body: `**My sign-in link says invalid or expired.** Magic links expire a short while after they're sent and can only be used once. Go back to the sign-in page and request a fresh one — don't reuse an old email.

**I forgot my PIN, or it's locked.** After too many wrong attempts, PIN entry locks temporarily as a precaution. Just use the email sign-in link instead — it always works regardless of PIN state.

**I can't find an asset.** Try the QR code first if you're standing near it — scanning is faster and more reliable than searching by tag or name. If it's not where it should be, check its **History** timeline on its detail page for its last recorded move; if there wasn't one, or if it's simply somewhere new, log a move to a [custom location](/help/locations/custom-locations) once you find it so the record stays accurate.

**A field I need on the New Asset form isn't there.** Custom fields are defined per asset type by an org admin — see [Asset types and custom fields](/help/admin-setup/asset-types-and-custom-fields). Ask an admin to add the field rather than stuffing the value into Notes, so it's properly structured and searchable going forward.

**I don't see the Admin tab.** It's only shown to org admins. Ask an existing admin (check **Admin → Users**, or ask your department lead who to contact) to grant it if you have a genuine need to manage shared structural data.

**My work order doesn't have a title field — where do I describe the problem?** Work orders were deliberately simplified to use just a **description** field instead of a separate title; whatever you type there is what shows everywhere the ticket is listed. See [Creating a work order](/help/work-orders/creating-a-work-order).

**Still stuck?** Search this guide from the box at the top of the **Help** tab, or ask an org admin directly — their contact info is on their profile the same way yours is (see [Your contact profile](/help/accounts/your-contact-profile)).`,
  },
];

async function main() {
  for (const article of ARTICLES) {
    await prisma.helpArticle.upsert({
      where: { slug: article.slug },
      update: {
        title: article.title,
        category: article.category,
        summary: article.summary,
        order: article.order,
        body: article.body,
      },
      create: article,
    });
  }
  console.log(`Seeded ${ARTICLES.length} help articles.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
