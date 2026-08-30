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

**Sign in.** Enter your email on the sign-in page and a one-time link is sent to you. After you use it once on a device, Chemistry offers to remember that device with a short PIN so you don't need email every time. See [Signing in](/help/getting-started/signing-in).

**Find an asset.** Every physical asset, meaning every lantern, tool, vehicle and structure component, has a tag and a QR code. Tap **Scan** in the bottom bar on a phone, or search the **Assets** tab, to open its page: status, condition, location, custom fields, and full history. If the thing you scanned already has an open ticket, the scan tells you before anything else, so you don't start work someone else is already doing.

**On your phone.** Chemistry installs to your home screen and is laid out for one-handed use in the field. See [Using Chemistry on your phone](/help/getting-started/using-chemistry-on-your-phone), which includes an honest account of what does and doesn't work without signal.

**Something's wrong with it?** Open the asset and click **Report a problem**. That creates a work order, which is Chemistry's name for a maintenance ticket, already linked to the asset. Describe what's wrong, pick a priority, and submit. See [Creating a work order](/help/work-orders/creating-a-work-order).

**Working a ticket?** Open it from the **Work Orders** tab, assign it to yourself, move its status along as you go (Open, In Progress, Complete), attach photos if useful, and when you're done pick a resolution code and add resolution notes. Closing it locks the ticket down to a summary view until it's reopened. See [Resolution codes explained](/help/work-orders/resolution-codes-explained) and [Closing and reopening a work order](/help/work-orders/closing-and-reopening-a-work-order).

**Adding new gear?** Use **Assets → New asset** for one item, or **Assets → Bulk create** when you're tagging a whole batch (say, forty lanterns) at once with a shared name template and sequential tags. See [Creating an asset](/help/assets/creating-an-asset).

**Handling a whole batch at once?** Select multiple rows on the Assets or Work Orders list (checkboxes, shift-click, select-all) to bulk-edit assets, bulk-close tickets, or file the same ticket against many assets in one go. See [Selecting multiple items](/help/getting-started/selecting-multiple-items).

**Need it in a spreadsheet?** Filter a list, press **Export**, and pick your columns. See [Exporting lists to Excel](/help/getting-started/exporting-lists). Individual tickets can also be [printed](/help/work-orders/printing-a-work-order) as a signed-off paper record.

**Borrowing a tool?** Asset types marked as loanable get a **Loans** tab for checking gear in and out, with a log of who had what. The **Loans** tab in the nav shows everything currently out. See [Checking tools in and out](/help/assets/checking-tools-in-and-out).

**Everything else** lives under the **Admin** tab: divisions, departments, asset types, resolution codes, locations, and user roles. It sits one level down because you mostly won't need to touch it. See [What lives under Admin](/help/admin-setup/what-lives-under-admin).

When in doubt, search this guide from the box at the top of the **Help** tab. It searches every article's title and body.`,
  },
  {
    slug: "signing-in",
    title: "Signing in: magic links and PINs",
    category: "getting-started",
    order: 1,
    summary: "How passwordless sign-in works, and how the quick PIN saves you from re-checking email every time.",
    body: `Chemistry doesn't use passwords. You sign in with your email address, and a link is emailed to you that logs you in when you click it. That link expires after a short window and can only be used once, so a new one is generated every time you need it.

**Getting an account.** Chemistry is invite-only. There is no public sign-up. An org admin generates a one-time invite link (from **Admin → Users**) and sends it to you. Opening it asks for your name and email, creates your account, and immediately emails you a sign-in link. Each invite link only works once.

**First sign-in on a device.** Enter your email on the sign-in page, check your inbox, and click the link. You'll land back in Chemistry, signed in, and that browser is automatically remembered as a trusted device.

**Quick PIN.** A trusted device alone doesn't skip sign-in by itself. For that, set a short PIN from your **Account** page. Once you have one, opening Chemistry again on that same trusted device offers a PIN prompt instead of making you wait on another email, which is much faster if you're checking work orders repeatedly during a shift. The PIN is tied to that specific browser and device rather than to your account globally, so a new device always starts with the email link. If you'd rather sign in with email even on a trusted device, the PIN screen has a **"Not you? Sign in with email"** link.

**PIN lockout.** After several wrong PIN attempts in a row, PIN entry locks temporarily as a safety measure. Signing in again with the email link clears the lockout immediately, since a magic-link sign-in is a stronger proof of identity than the PIN.

**Signing out** clears the session on that device but does not remove the device's trust. You'll still be offered the PIN next time unless you click **Forget this device** on your Account page.

**Losing access to your email** means losing the ability to sign in anywhere new, since the magic link is the root of trust. If that happens, ask an org admin to update the email on your user record from **Admin → Users**.`,
  },
  {
    slug: "selecting-multiple-items",
    title: "Selecting multiple items",
    category: "getting-started",
    order: 2,
    summary: "Checkboxes, shift-click ranges, and \"select all\" across pages: the shared selection UI behind every bulk action.",
    body: `The **Assets** list, the **Work Orders** list, and an Asset Group's member list all share the same selection UI, used for bulk actions like editing many assets at once or closing many tickets at once.

**Checking rows.** Click a row's checkbox to select it, and click again to deselect it. This works exactly like any checkbox; nothing special is needed for a single pick.

**Shift-click for a range.** Click one checkbox, then hold Shift and click another. Everything between the two, in the order shown on screen, gets selected or deselected together, matching whichever state your Shift-click set. This only works within the rows currently on screen; it can't reach across a page boundary.

**Select all on this page** is the checkbox in the table header. It selects, or clears, every row currently shown.

**Select all matching your filter.** Once every row on the current page is checked, a link appears offering to select everything that matches your current search and filter, not just the page you're looking at. This is what lets a bulk action cover hundreds of items without you paging through them one screen at a time. There's a cap of 500 items on one bulk action; if your filter matches more than that, narrow it first by department, status, or search text rather than trying to select everything in one shot.

**How many rows you see.** Lists show 10 rows by default, chosen so a page fits on one screen without scrolling, including on a phone. The **Show: 10 / 25 / 50 / 100 / 250** control at the bottom of the list switches to a longer page when you'd rather scan a lot at once, and it sticks to the current filter and search as you page through.

**Once something's selected**, a toolbar appears above the list with the count selected and whatever bulk actions that list supports: bulk edit, bulk close, printing a QR sheet for the selection, and so on. Selecting "all matching filter" is re-checked at the moment you submit, so the count you see in the next step reflects what's true right then rather than what was true when you clicked select-all.`,
  },
  {
    slug: "creating-an-asset",
    title: "Creating an asset",
    category: "assets",
    order: 0,
    summary: "Single-asset creation, asset types, custom fields, and required fields explained.",
    body: `Go to **Assets → New asset**.

Every asset needs an **asset tag** (a short unique identifier, which becomes part of its QR code and its URL), a **name**, an **asset type**, and an **owning department**. Asset type drives everything else about the form: pick "Solar Lamplighter Lantern," for example, and the form grows extra fields for panel lot, control board batch, firmware version, and battery cell serial, because that's how that asset type was configured. Different types show different fields. See [Asset types and custom fields](/help/admin-setup/asset-types-and-custom-fields) for how those are defined.

**Status** defaults to Active and tracks the asset's operational state: Active, In Repair, Storage, Retired, Lost, or Destroyed. **Condition** is a separate, more subjective scale: New, Good, Fair, Poor, Unserviceable. An asset can be Active and Poor at the same time, which is to say in service but due for attention.

**Location** is optional at creation time but worth setting if you know where the thing physically is. If the real location isn't in the dropdown, because you're out in the field somewhere that was never registered as a formal Location, pick **Other / custom…** and type a free description. See [Custom locations](/help/locations/custom-locations) for details on how that's tracked.

Once created, you land on the asset's detail page, which has its QR code ready to print or scan immediately.`,
  },
  {
    slug: "bulk-creating-assets",
    title: "Bulk-creating a batch of assets",
    category: "assets",
    order: 1,
    summary: "Tagging a whole shipment or fleet at once with sequential tags or a pasted list.",
    body: `When you're onboarding a whole batch of identical or near-identical gear, such as forty solar lanterns or a pallet of tools, creating them one at a time is slow. **Assets → Bulk create** handles this.

You choose between two ways of specifying tags:

**Sequential range.** Give a prefix (e.g. \`LL-\`), a starting number, a count, and how many digits to zero-pad to. Chemistry generates \`LL-0001\` through \`LL-0040\`, or whatever range you asked for, automatically. This is the fastest option when your tags are already numbered stickers.

**Paste a list.** If your tags don't follow a clean numeric sequence, paste them one per line, or comma-separated, instead.

Every asset in the batch shares the same **name template** (each asset is named "{template} {tag}"), asset type, department, status, condition, location, and custom field values. You're describing one thing that got made forty times, not forty different things. If individual assets in the batch need different custom field values later, edit them individually afterward from their own asset page.

The whole batch is also grouped into an **Asset Group**, visible under the **Asset Groups** tab, which is the easiest way to pull up all forty lanterns at once later. That matters most when you need to print QR code sheets for the whole batch in one go from the Assets list's **Print QR sheet for selected** button.

Batches are capped at 500 assets per submission. Anything larger should be split into multiple bulk-create runs.`,
  },
  {
    slug: "asset-status-and-condition",
    title: "Status and condition: what's the difference",
    category: "assets",
    order: 2,
    summary: "Two separate scales that answer two different questions about an asset.",
    body: `Assets track two axes that are easy to conflate but answer different questions.

**Status** answers "where is this asset in its lifecycle right now?" The options are Active (in normal service), In Repair (currently being worked on, usually because a work order is open against it), Storage (not deployed but not broken), Retired (out of service permanently but kept on record), Lost, or Destroyed. Status is what you change on the asset detail page's **Status** panel, and it's what most list filtering and reporting cares about.

**Condition** answers "how good a shape is it in?" The options are New, Good, Fair, Poor, Unserviceable. An asset can be Active and Poor simultaneously (still deployed, visibly beat up, due for attention), or In Repair and Good (pulled for routine preventive maintenance, nothing actually wrong with it). Condition is set at creation and updated manually as you inspect the asset. It doesn't move automatically alongside status.

A useful habit: when you close out a work order that fixed something, consider whether the asset's condition should improve to reflect the repair, and whether its status should move back to Active.`,
  },
  {
    slug: "asset-groups",
    title: "Asset Groups",
    category: "assets",
    order: 3,
    summary: "What a group is, how it's created, and what it's useful for.",
    body: `An **Asset Group** is a named collection of assets, most often created automatically as a side effect of a [bulk create](/help/assets/bulk-creating-assets). Every asset added in one bulk-create submission is grouped together under the batch name and description you gave it, for example "Lamplighter batch 2026-08-19".

Groups are mainly a convenience for finding "all the things I created together" later, and for bulk operations like printing a QR sheet for an entire batch at once. Open the **Asset Groups** tab to see all groups, and click into one to see and act on every asset inside it. You can also create an empty group directly and add assets to it by pasting a list of tags.

Inside a group, check the boxes next to members (shift-click to select a range) to remove several at once with **Remove selected**, alongside the existing "apply status to all members" control. See [Selecting multiple items](/help/getting-started/selecting-multiple-items) for how that selection UI works. It is the same one used on the Assets and Work Orders lists.

Groups don't affect ownership, department, or any other property of the assets inside them. They are a label meaning "these came from the same batch," and nothing more.`,
  },
  {
    slug: "bulk-editing-assets",
    title: "Bulk-editing assets",
    category: "assets",
    order: 4,
    summary: "Change status and/or location on many assets at once from the Assets list.",
    body: `To change status or location on a batch of existing assets at once, such as moving a whole shelf of gear into storage after an event, filter or search the **Assets** list down to the ones you want, select them (see [Selecting multiple items](/help/getting-started/selecting-multiple-items)), and click **Bulk edit selected** in the toolbar that appears.

The bulk edit page only offers **Status** and **Location**. Nothing else can be changed in bulk, since every other field (name, type, department, custom fields) is specific enough per asset that a shared bulk value wouldn't make sense. Each is independent and optional:

- Leave **Status** on "No change" to leave it alone, or pick a value to set every selected asset to it.
- **Location** has three choices: "No change," "Clear location" (removes it without setting a new one), or "Set to…" (pick a real location, or "Other / custom…" for a location not on the formal list).

Submitting applies whichever of the two you changed to every selected asset in one action, and logs it to each asset's own history individually. So if you look at one specific asset's audit trail afterward, the bulk edit shows up there too, not just in one buried log entry somewhere else.`,
  },
  {
    slug: "custom-locations",
    title: "Custom (\"Other\") locations",
    category: "locations",
    order: 1,
    summary: "What to do when the real location of an asset isn't on the Locations list.",
    body: `Chemistry's formal **Locations** list (storage facilities, containers, zones, camps, placements, vehicles) is curated by admins under **Admin → Locations** and is meant to represent named, reusable places. In the field, though, an asset sometimes ends up somewhere that was never formally registered, such as "behind the shade structure, north camp."

Rather than blocking you from recording where the thing actually is, both the **New asset** location field and the asset detail page's **Move** panel offer an **Other / custom…** option. Choosing it reveals a free-text box. Describe the location in plain language and submit.

Custom locations behave a little differently from real ones:

- They're **not added to the shared Locations list**. If the same custom spot gets used repeatedly and deserves to become a real Location, an admin should add it properly under **Admin → Locations**.
- Anywhere a custom location is shown, whether that is the asset's Location tile, the assets list, or the move history timeline, it's marked with a small **yellow asterisk (\\*)** so it's visually obvious at a glance that this isn't a standard, reusable location.
- It's still fully tracked in the asset's move history, the same as a move to a real Location, so nothing is lost. It just isn't structured data.

Moving an asset again, to either a real Location or a new custom one, replaces the previous custom text the same way a normal move replaces the previous location.`,
  },
  {
    slug: "understanding-locations",
    title: "Understanding the Locations hierarchy",
    category: "locations",
    order: 0,
    summary: "Location types and how nesting works.",
    body: `Locations in Chemistry come in six types: **Storage Facility**, **Container**, **Zone**, **Camp**, **Placement**, and **Vehicle**. A location can optionally have a parent location, letting you nest one inside another: a Container that lives inside a Storage Facility, say, or a Placement inside a Camp.

Locations are managed centrally under **Admin → Locations** since they're shared, reusable data referenced by every asset, rather than something created per-asset. If you're in the field and the place you need isn't listed, don't wait for an admin. Use a [custom location](/help/locations/custom-locations) on the asset itself instead, and flag it to an admin if it should become permanent.

An asset's current location is shown on its detail page and updated any time someone records a **Move**. Every move, real or custom, is kept in the asset's history timeline along with who moved it and when, so you can always reconstruct where something has been.`,
  },
  {
    slug: "creating-a-work-order",
    title: "Creating a work order",
    category: "work-orders",
    order: 0,
    summary: "How tickets get opened, auto-numbered, and linked to an asset.",
    body: `The fastest way to open a work order is from the asset itself: open the asset's page and click **Report a problem**, which pre-fills the asset link for you. You can also start one directly from the **Work Orders** tab if it isn't tied to a specific asset, as with a general facilities issue.

A ticket has a short **title**, which is the line every list shows, and a longer **description** where the problem actually gets explained. Add a checklist of **tasks** if the job has steps worth ticking off. Then pick a **type** (Corrective, Preventive, Inspection, Modification, or Decommission) and a **priority** (Low, Normal, High, or Event Critical).

**Numbering is automatic.** Every work order gets a code like \`CM081926001\`, made of a two-letter type prefix (CM for Corrective, PM for Preventive, IN for Inspection, MO for Modification, DC for Decommission), the date it was opened (MMDDYY), and a sequence number that resets each day per type. You never assign a number yourself, and codes are permanent once issued.

Once created, a work order starts in **Open** status and can be assigned to someone independently of status, since assignment just says who owns it. From Open, status moves through **In Progress**, **Waiting Parts**, **Complete** and **Closed**, or **Cancelled** if it turns out not to be needed. See [Working a ticket end to end](/help/work-orders/working-a-ticket-end-to-end) for the full lifecycle.`,
  },
  {
    slug: "working-a-ticket-end-to-end",
    title: "Working a ticket end to end",
    category: "work-orders",
    order: 1,
    summary: "Assignment, status changes, notes, photos, and closing out.",
    body: `Once a work order exists, open it from the **Work Orders** tab or from the linked asset's page.

The ticket's code, title, status, priority, and its asset, assignee and reporter stay visible at the top no matter what you're doing below. The action bar right under that handles the quick stuff (changing status, reassigning, closing), and the three tabs below it hold everything else.

**Assign it** to yourself or someone else using the assignment control in the action bar. Assignment is tracked separately from status: assigning someone doesn't change where the ticket is in its lifecycle, it just says who owns it.

**Move it through status** as work progresses, also from the action bar: Open, then In Progress, then Waiting Parts if you're blocked on something, then Complete. Status changes are logged with a timestamp so there's always a record of how long each stage took.

**Tick off the tasks** if the ticket has a checklist. See [Task checklists](/help/work-orders/task-checklists).

**The Details tab** is the main working area. Reassigning the linked asset, the resolution fields, parts used, and notes all live there. **Add notes** as you go: what you found, what you tried, what you're waiting on, and anything else worth recording that isn't a status change. Notes are timestamped and attributed to whoever wrote them, and they stay on the ticket permanently. The **+ Note** and **+ Part** buttons in the action bar jump straight to this tab.

**The History tab** shows every other work order ever filed against the same asset, which is useful for spotting a pattern before you start troubleshooting from scratch.

**Attach photos, receipts, or reports** from the **Attachments** tab, or the **+ Attachment** shortcut in the action bar. See [Attachments on work orders](/help/photos-documents/photos-on-work-orders).

**Closing out.** When the work is actually done, pick a **resolution code** in the Details tab (see [Resolution codes explained](/help/work-orders/resolution-codes-explained)), write resolution notes summarising what actually happened, and use **Save resolution** in the action bar to save them together. This is the single most useful thing for whoever looks at this asset's history six months from now, so be specific rather than terse. Use **Close ticket** in the action bar, or the status control, to actually close it. See [Closing and reopening a work order](/help/work-orders/closing-and-reopening-a-work-order) for what changes once it's closed.

The **reported by** field on a ticket links to that person's [account profile](/help/accounts/your-contact-profile), which shows how they'd prefer to be reached during the burn if you need to follow up with them directly.`,
  },
  {
    slug: "task-checklists",
    title: "Task checklists",
    category: "work-orders",
    order: 7,
    summary: "A short list of steps on a ticket, ticked off as you go.",
    body: `A work order can carry a checklist: the steps that actually have to happen before the job is done. Add them when you create the ticket, or at any point afterward from the **Tasks** section on the ticket itself.

**Keep them short.** A task is capped at 50 characters, which is enough for "swap the battery cell" and not enough for an essay. The checklist is meant to be scanned at arm's length while you're holding something in your other hand. The explaining belongs in the description.

**Ticking is immediate.** A checkbox moves the moment you tap it rather than waiting on the network. If the save fails, the tick goes back where it was and tells you why, so a box that stays ticked is a box that reached the database.

**Anyone working the ticket can tick, add, or remove tasks.** The person who ticked each one is recorded next to it.

**Closing a ticket with unticked tasks.** Chemistry will point out that some are still open and then let you close it anyway. Half a checklist usually means a step turned out not to be needed, and a ticket that refuses to close until the boxes are tidy is a ticket people stop putting boxes on. Unticked tasks stay on the closed ticket as a record of what was left.

Tasks are not a substitute for separate work orders. If a step is big enough to be assigned to somebody else, or to be scheduled, it wants its own ticket.`,
  },
  {
    slug: "logging-parts-used",
    title: "Logging parts used on a work order",
    category: "work-orders",
    order: 2,
    summary: "Track which parts went into a repair, with optional order history.",
    body: `Any open work order's **Details** tab has a **Parts used** section for recording what actually went into the fix: a replaced battery, a swapped connector, whatever the repair needed. The **+ Part** shortcut in the action bar at the top jumps straight there.

**Logging a part.** Enter a part number and quantity. If it's a part that's been logged before on this asset's type, it's picked up automatically from a suggestions list as you type. If it's genuinely new, you also need to give it a short description, which is what creates the part record, scoped to this asset's **asset type**. A Solar Lamplighter Lantern part and a different asset type's part with the same number are tracked separately, since they're not actually the same thing just because the number matches.

**Optionally logging an order at the same time.** The same form has a toggle to also record a price, a quantity, and a date. That's useful when you're logging a part right after buying it, so the purchase history builds up as you go rather than needing a separate step later. A purchase link isn't part of this. See below.

**Where parts live afterward.** Every part ever logged for an asset type is visible from that asset type's page under **Admin → Asset Types**, with two separate lists. **Links** covers where to buy it and roughly what it costs, with no order needed, added directly from the part's own page. **Order history** is an actual record of a purchase: price, quantity, and date, with no link. Keeping them separate means a part can have a standing "here's where we get these" link without every order needing one, and an order doesn't get cluttered with a link that might go stale.

To log the same part across many tickets at once instead of one at a time, see [Bulk-closing work orders](/help/work-orders/bulk-closing-work-orders).`,
  },
  {
    slug: "resolution-codes-explained",
    title: "Resolution codes explained (CMMS)",
    category: "work-orders",
    order: 3,
    summary: "What each of the seven resolution codes means and when to use it.",
    body: `When you close a work order, you pick a **resolution code** describing what actually happened. These are based on standard CMMS troubleshooting vocabulary and are deliberately a short, controlled list rather than free text, so patterns become visible over time. If half your "Could Not Duplicate" tickets are on the same asset, that asset probably has an intermittent fault worth digging into properly.

- **Could Not Duplicate.** You looked into the reported issue and couldn't reproduce it. The asset checked out fine when you had it.
- **Could Not Locate.** You went to find the asset and couldn't: wrong location on record, walked off, or buried under something. This is a different failure from "couldn't reproduce the problem." This one is "couldn't even get to it."
- **General Repair.** You found a real problem and fixed it. The default, ordinary case.
- **Misc.** Something happened that doesn't fit the other categories. Use the resolution notes to explain, since this code alone doesn't say much.
- **ID10-t.** Tech-support shorthand for user error. Say it out loud. The asset was fine; the problem was how it was being used or reported. Use it sparingly and kindly, since resolution notes are visible to whoever's asking. Keep them factual rather than snarky.
- **Magic.** It started working again and nobody's entirely sure why. Worth recording honestly rather than inventing a plausible explanation, because "this happens sometimes and self-resolves" is itself useful information for next time.
- **Deferred.** A real issue was found but isn't being fixed right now: parts on order, lower priority than current burn needs, or whatever else. Leave good resolution notes explaining what's deferred and why, since this ticket is effectively becoming a to-do for later rather than a closed loop.

Resolution codes describe **outcomes**, not root causes, and they are deliberately separate from any notion of "failure codes." What actually broke, and why, belongs in the resolution notes in your own words.`,
  },
  {
    slug: "closing-and-reopening-a-work-order",
    title: "Closing and reopening a work order",
    category: "work-orders",
    order: 4,
    summary: "What locks once a ticket is closed, and how to undo it.",
    body: `Once a work order's status is set to **Closed**, its page switches to a tighter, mostly read-only view. The resolution (code, notes, labour minutes) and the parts used are front and centre, and everything else that's editable on an open ticket disappears: no status dropdown, no reassigning, no changing the linked asset, no adding parts, notes, or photos. What's already there stays visible, just locked, including existing notes, photos, and the full parts list.

This is deliberate. A closed ticket is meant to be a finished record, not something that quietly keeps changing after the fact.

**Reopening.** If a closed ticket needs more work, because the fix didn't hold or it was closed by mistake, click **Reopen work order** at the bottom of the closed view. This is available at any time, with no separate permission beyond what you'd already need to work the ticket. Reopening sets the status back to Open and clears the closed timestamp, and everything that was locked becomes editable again immediately.

To close many tickets at once instead of one at a time, see [Bulk-closing work orders](/help/work-orders/bulk-closing-work-orders).`,
  },
  {
    slug: "bulk-closing-work-orders",
    title: "Bulk-closing work orders",
    category: "work-orders",
    order: 5,
    summary: "Close a whole batch of work orders at once with a shared resolution.",
    body: `When several open tickets are all being resolved the same way, such as a seasonal battery swap across a dozen lanterns, closing them one at a time is unnecessary. From the **Work Orders** list, filter down to the ones involved, select them (see [Selecting multiple items](/help/getting-started/selecting-multiple-items)), and click **Close selected**.

The bulk close page only shows fields that make sense applied identically to every selected ticket: resolution code, resolution notes, and labour minutes. The **asset** field isn't there, since every ticket keeps its own asset, and that's exactly the thing that differs between them.

**Logging a part while bulk-closing.** The form also lets you log one part as used, applied to every selected ticket at once, tied to each ticket's own asset the same way a normal [part-used entry](/help/work-orders/logging-parts-used) would be. Because the selected tickets can be linked to assets of different asset types, logging a new part number this way can end up creating that part under more than one asset type in a single action. Chemistry shows a confirmation before doing this, naming exactly which asset types will get a new part record, so you're not surprised by it after the fact.

Submitting sets every selected ticket to **Closed** with the resolution you entered, the same as closing one manually. See [Closing and reopening a work order](/help/work-orders/closing-and-reopening-a-work-order) for what that locks.`,
  },
  {
    slug: "bulk-creating-work-orders",
    title: "Bulk-creating work orders for many assets",
    category: "work-orders",
    order: 6,
    summary: "File the same ticket against a whole batch of assets at once.",
    body: `To open the same kind of ticket against many assets at once, such as an annual inspection across a whole fleet of lanterns, go to the **Assets** list, filter or search down to the assets involved, select them (see [Selecting multiple items](/help/getting-started/selecting-multiple-items)), and click **Create work orders for selected**.

You'll be asked for one **title**, **description**, **type**, and **priority**, applied verbatim to every ticket created, one per selected asset. Each new ticket's **department** is taken from its own asset's department automatically rather than chosen on this form, so a selection spanning multiple departments still files each ticket correctly.

After submitting, you land on a confirmation page listing every ticket that was just created, each linking to its own page. From there they behave exactly like any individually created work order.`,
  },
  {
    slug: "photos-on-work-orders",
    title: "Attachments on work orders",
    category: "photos-documents",
    order: 0,
    summary: "Attaching, viewing, and removing photos, receipts, and reports on a ticket.",
    body: `Open a work order and switch to its **Attachments** tab, or click **+ Attachment** in the action bar at the top, which jumps you there. You can attach one or more files directly: a photo of the damage, of the part that failed, of the fix once it's done, or a receipt or service report worth keeping with the ticket. Each attachment shows who uploaded it, and can be removed by anyone with access to that ticket's department if it was added by mistake.

Files are stored securely and served through short-lived, signed links rather than public URLs, so they aren't guessable or reachable outside Chemistry. Images, PDFs, and common office document types (Word, Excel, plain text) are all accepted, up to 20MB per file. Non-image files show as a filename card instead of a thumbnail. For reference material that belongs to an entire **asset type** rather than one ticket, such as a service manual or a wiring schematic, see [Asset type documents](/help/photos-documents/asset-type-documents) instead, which is a separate, type-level attachment system.

A photo taken the moment you find a problem is worth far more than a description written from memory later. When in doubt, snap it before you touch anything.`,
  },
  {
    slug: "asset-type-documents",
    title: "Asset type documents",
    category: "photos-documents",
    order: 1,
    summary: "Attaching service manuals, schematics, and spec sheets to an asset type.",
    body: `Some reference material belongs to an entire **asset type** rather than to any single asset or ticket: a service manual for the lantern's control board, a wiring schematic, a manufacturer spec sheet. These live under **Admin → Asset Types**, on each type's own detail page, in the **Documents** section.

Any org admin can upload documents there. PDFs, Word or Excel files, plain text, or images are all accepted, up to 20MB each, and they're immediately available to anyone who opens that asset type's page. This is the right place for "how do I fix this class of thing" material, as opposed to [work order photos](/help/photos-documents/photos-on-work-orders), which document one specific incident on one specific asset.

Documents can be removed the same way they're added, from the same page, by any org admin.`,
  },
  {
    slug: "qr-codes-and-scanning",
    title: "QR codes and scanning",
    category: "qr-codes",
    order: 0,
    summary: "How the QR code on an asset works and how to print sheets for a batch.",
    body: `Every asset gets a QR code the moment it's created, visible on its detail page. Scanning it opens a short URL, \`/a/{assetTag}\`, that takes you straight to that asset with no searching required. This is the fastest way to look something up while standing next to it.

**Scanning from inside Chemistry.** The **Scan** button in the middle of the bottom tab bar on phones opens a built-in scanner. Point it at a sticker and it jumps straight to the asset. A few things worth knowing:

- There's a **flashlight toggle** where the phone supports it, which you will want after dark.
- If a sticker is damaged, scuffed, or the light is hopeless, you can **type the tag by hand** in the box underneath instead.
- The scanner needs camera permission the first time. If you accidentally deny it, you'll need to re-allow camera access for the site in your browser settings.

Your phone's own camera app works too and does the same thing. The built-in scanner just saves you leaving the app.

**If the asset already has an open ticket, scanning tells you.** Rather than dropping you straight onto the asset page, a scan stops and shows any open work orders on that asset first, with a button to open one directly. This is usually the thing you actually wanted to know, which is whether somebody is already on this, and it stops two people unknowingly working the same fault. If there's nothing open, the scan goes straight through to the asset as normal, with no extra tap.

**Printing QR codes.** From the **Assets** list, check the boxes next to the assets you want and click **Print QR sheet for selected** to generate a printable sheet with all their codes at once. This is the fast path after a [bulk create](/help/assets/bulk-creating-assets), where you've just tagged a whole batch and need physical stickers for each one.

The QR code encodes the asset's tag, so as long as the sticker is legible, the asset can always be found even if its name or location changes later.`,
  },
  {
    slug: "your-contact-profile",
    title: "Your contact profile and during-burn preferences",
    category: "accounts",
    order: 0,
    summary: "What's on your account page, what's visible within the app, and how notifications work.",
    body: `Your account page (click your name in the top-right nav) lets you set optional contact details: a phone number, and how you'd prefer to be reached **during the burn specifically**, since normal channels like email and cell service may not be reliable on playa. You can check any combination of **cell**, **email**, and a free-text **other** field for anything not covered: a radio channel, a camp location where you can usually be found, or whatever's actually reliable for you that week.

**Light or dark.** The **Appearance** control at the top of your account page switches between **Light** and **Dark**. It's saved per device rather than to your account, so your phone can sit on dark for night shifts while a shared laptop stays light. There's a quick toggle in the top bar too, and on a phone it's in the **More** sheet. Printing always comes out light regardless, so a printed work order is readable on paper.

**Your badge.** Your account page also sets the small icon shown next to your name throughout Chemistry, on notes, work order attribution, attachments, and part logs. Upload a **profile picture** and that's used; otherwise pick an **icon and colour** from the list. If you set neither, you get a default wrench. It's purely so you can pick your own entries out of a list at a glance.

**Email notifications** are opt-in. Toggle **notify by email** if you want a heads-up when something like a work order assignment happens, and leave it off if you'd rather just check Chemistry directly.

**Visibility.** When you're listed as "reported by" on a work order, your name links to a profile page showing your contact info and during-burn preferences to anyone else signed into Chemistry. This is intentionally visible within the app, though not public on the open internet, so whoever's working a ticket you filed can actually reach you if they have a question. All fields are optional. Leave anything blank that you'd rather not share and it simply won't show.`,
  },
  {
    slug: "what-lives-under-admin",
    title: "What lives under Admin",
    category: "admin-setup",
    order: 0,
    summary: "A map of every admin-only screen and what it configures.",
    body: `The **Admin** tab, visible only to org admins, is the landing page for everything that's shared, structural data rather than day-to-day asset or work order activity. From there:

- **Divisions.** The top level of Alchemy's org structure, grouping related departments.
- **Departments.** The actual owning teams (Lamplighters, Gate, APW, and so on), each optionally under a division, each with a lead and a member list. Assets and work orders are always owned by a department.
- **Users.** Generate invite links for new accounts, and manage every existing account's org-admin flag and department memberships and roles (Viewer, Member, Lead).
- **Asset Types.** The templates that define a class of asset and its custom fields, fully editable after creation, with a Documents section for manuals and schematics. See [Asset types and custom fields](/help/admin-setup/asset-types-and-custom-fields).
- **Resolution Codes.** The CMMS-based outcome codes used when closing work orders.
- **Locations.** The shared, reusable place hierarchy assets can be moved between.

Nearly all of this is editable in place after creation rather than delete-and-recreate. See [Fixing mistakes: what's editable](/help/admin-setup/editing-records).

One thing is deliberately **not** admin-only: [check-out access](/help/assets/checking-tools-in-and-out) for borrowable tools is managed at **Loans → Check-out access**, where any department **lead** can grant it for their own department without needing org admin.

Everything under Admin is deliberately one level down from the main nav, since most day-to-day work only touches **Assets** and **Work Orders**. If you're not an org admin, you won't see this tab at all. Ask an existing admin, who you can find under **Admin → Users**, if you need something here changed.`,
  },
  {
    slug: "asset-types-and-custom-fields",
    title: "Asset types and custom fields",
    category: "admin-setup",
    order: 1,
    summary: "How asset types drive the New Asset form, and how to add or edit custom fields.",
    body: `An **Asset Type**, under **Admin → Asset Types**, is a template: "Solar Lamplighter Lantern," "Golf Cart," "Shade Structure Panel." It defines what a class of asset is and what extra data it tracks. Picking a type on the New Asset form is what makes type-specific fields appear, such as panel lot and board batch for a lantern.

**Creating a type** sets its name, optional manufacturer and model, an optional default owning department (pre-filled on New Asset when this type is picked), and a list of custom fields you build with the **+ Add field** control. Each field gets a key used internally (e.g. \`panelLot\`), a label shown on forms (e.g. "Solar Panel Lot"), a data type (text, number, checkbox, date, or a dropdown with fixed options), and whether it's required.

**Editing a type** later, whether renaming it, changing its default department, or adding, removing and renaming custom fields, is done from that type's own page, which you reach by clicking into it from the Asset Types list. Changes to the field list only affect the form going forward. Existing assets keep whatever values they already have for fields that get removed, though those values stop being shown once the field definition is gone.

**Documents** for manuals and schematics live on the same per-type page. See [Asset type documents](/help/photos-documents/asset-type-documents).

An asset type **can't be deleted** while any asset still uses it, to avoid orphaning data. Reassign or retire those assets first if a type genuinely needs to go away.`,
  },
  {
    slug: "departments-and-roles",
    title: "Departments, divisions, and member roles",
    category: "admin-setup",
    order: 2,
    summary: "How the org structure maps to who can do what.",
    body: `**Divisions** are the broadest grouping in Chemistry's org structure, and a division contains one or more **departments**. Not every department needs a division.

Every asset and every work order is owned by exactly one department. A department has a **lead** (a single user), a list of **members** with individual roles, and an active/inactive flag.

**Roles**, set per person per department under **Admin → Users**, are:

- **Viewer.** Can see the department's assets and work orders but not create or change them.
- **Member.** The normal working role: can create and update assets and work orders for that department.
- **Lead.** The same as Member, plus recognised as the department's point of contact. Leads can also grant [tool check-out access](/help/assets/checking-tools-in-and-out) for their own department, and can check gear out on someone else's behalf. This is the one place a department role carries real permissions beyond org admin.

Separately, a user can be flagged as an **org admin**, which is unrelated to any specific department. It grants access to the entire **Admin** tab (divisions, departments, users, asset types, resolution codes, locations) across the whole org, not just one department's data. Org admin should be reserved for people who actually need to reconfigure shared structural data, rather than handed out by default.`,
  },
  {
    slug: "checking-tools-in-and-out",
    title: "Checking tools in and out",
    category: "assets",
    order: 60,
    summary: "Borrow and return shared gear, and control who's allowed to.",
    body: `Some assets are things people borrow and bring back, with APW's tools being the obvious case. Those get a **Loans** tab on their detail page where you check them out, check them back in, and see everywhere they've been.

**Turning it on.** The Loans tab only appears for asset types marked as loanable, set by an org admin on the asset type under **Admin → Asset Types**, using the "These get checked in and out" option. This is deliberately opt-in: a deployed Lamplighter lantern isn't something anyone checks out, so it shouldn't carry a tab implying otherwise. Flip it on for tool-like types only.

**Checking something out.** Open the asset, go to **Loans**, add a note if it's useful ("taking it to the build site"), and check it out. The asset detail page then shows an amber **Checked out to …** badge in its header, so anyone who scans that tag immediately sees who has it without opening a tab. An item can only be checked out to one person at a time, and the database enforces this, so two people tapping the button at once can't both succeed.

**Checking it back in.** Anyone with check-out access for that department can check an item in, not just the person who took it. That's intentional. Gear comes back to whoever happens to be at the container, and making the borrower do it personally would just mean it never gets logged. You can record its condition on return, which is worth doing when something comes back worse than it left.

**Who's allowed.** Check-out access is granted per department. Anyone with **Lead** status in a department can grant it for *that department only*, and org admins can grant it for any department. Department leads and org admins always have access themselves without being listed. Manage it at **Loans → Check-out access**, or from the "Manage access" link on any loanable asset.

Granting someone access to a department's tools does **not** make them a member of that department. A Lamplighter can be given access to borrow APW gear without joining APW.

**Seeing what's out.** The **Loans** page lists everything currently checked out across the departments you can see, oldest first, so the things that have been out longest surface at the top. It's the page to open when you're trying to work out where something went.`,
  },
  {
    slug: "using-chemistry-on-your-phone",
    title: "Using Chemistry on your phone",
    category: "getting-started",
    order: 3,
    summary: "Install it to your home screen, and what does and doesn't work without signal.",
    body: `Chemistry is built to be used one-handed while standing in front of something, rather than only at a desk. On a phone the top nav collapses and you get a **bottom tab bar**: Home, Assets, **Scan**, Tickets, More. Scan is deliberately in the middle as the biggest target, since that's the thing you do most often out in the field.

**Installing it.** You can add Chemistry to your home screen so it opens like an app, full screen with no browser chrome:

- **iPhone and iPad.** Open it in Safari, tap the Share button, then **Add to Home Screen**. This only works from Safari, not Chrome on iOS.
- **Android.** Chrome usually offers an **Install** prompt on its own. If it doesn't, use the browser menu and pick **Install app** or **Add to Home screen**.

Installing also gets you long-press shortcuts on the icon for **Scan**, **New work order**, and **My work orders**.

**What works without signal, and what doesn't.** Be clear-eyed about this, because the playa is not a place with reliable service. The app's own files are cached, so it opens quickly and doesn't sit on a blank screen. **Your data is not cached.** Assets, work orders, and loans all need a connection, and if you're offline you'll get a plain "No signal" page rather than stale or wrong information. Anything already on screen stays readable.

There's no offline queue yet, so you can't file a work order with no signal and have it send later. That's a known gap, deliberately not faked, and it's planned work rather than something quietly half-done.`,
  },
  {
    slug: "notes-and-rich-text",
    title: "Writing notes",
    category: "getting-started",
    order: 4,
    summary: "Rich text or Markdown notes on both assets and work orders.",
    body: `Both **assets** and **work orders** have a **Notes** section for anything that doesn't fit a structured field: what you observed, what you tried, what the next person should know. Notes are append-only and stamped with who wrote them and when, so they read as a running record rather than something that quietly changes.

**Two modes, picked per note.** Above the editor there's a **Rich text** and **Markdown** toggle:

- **Rich text** gives you a toolbar with bold, italic, bulleted and numbered lists, block quotes, code blocks, indent and outdent, plus font and size. Use this for ordinary write-ups.
- **Markdown** is a plain text box that accepts Markdown syntax. Use this when you're pasting something structured, most usefully a fenced code block (triple backticks) for a log dump, an error message, or a config snippet, where rich text formatting would just get in the way.

You can mix modes freely. Each note remembers how it was written and renders accordingly.

**A note on safety.** Note content is sanitised before it's displayed, so pasting something from a web page can't inject anything harmful into Chemistry for the next person who reads it. You may occasionally find that exotic pasted formatting is stripped, which is this working as intended.

For code that's genuinely part of how a machine works, such as firmware or a charging routine, use [code files](/help/admin-setup/code-files-on-asset-types) instead. Those live on the asset type and are properly versioned.`,
  },
  {
    slug: "code-files-on-asset-types",
    title: "Code files on an asset type",
    category: "admin-setup",
    order: 4,
    summary: "Version-controlled source for a class of machine, editable from a work order.",
    body: `Some assets *are* partly software. The logic that drives a solar lantern's charging behaviour, for instance. That code lives on the **asset type** rather than on individual assets, because three hundred lanterns all run the same program. A fix belongs to the design, not to whichever unit the bug happened to be noticed on.

You'll find it under **Admin → Asset Types → (a type) → Code**. Only org admins can add, edit, or remove code, because saving a version publishes it for that entire class of machine, which is a materially bigger act than logging a repair on one lantern.

**Creating a file.** Give it a filename with an extension (\`charging-logic.py\`), an optional description of what it does, and paste the contents. The editor colours the code based on the extension. Python, C, C++, Arduino, JavaScript and TypeScript are all recognised.

**Every save is a version.** Editing a file and saving creates a new version rather than overwriting the old one, optionally with a short message describing the change, exactly like a commit. The version history under each file lists every save with its author, date, and message.

**Comparing and rolling back.** Tick any two versions to see a side-by-side diff of exactly what changed, or tick one to view it alone. If a change turns out to be wrong, **Rollback** restores the older content by creating a *new* version rather than deleting anything, so the record of what actually happened stays intact.

**Changing code from a work order.** This is the normal path. If a ticket's asset has a type with code files, org admins see a **Code** card in the ticket's Details tab. Saving there publishes a new version for the whole class *and* records which ticket it came from, so a fault reported on one lantern, diagnosed and fixed, leaves a permanent link between the repair and the code change it produced.

**What this does not track.** Publishing a version doesn't flash anything. The code here is the canonical source. Which firmware a specific unit is actually *running* is a separate question, tracked as an ordinary [custom field](/help/admin-setup/asset-types-and-custom-fields) on the asset, for example "Firmware Version," and updated by whoever does the flashing. Don't read a new version here as meaning the fleet has it.`,
  },
  {
    slug: "editing-records",
    title: "Fixing mistakes: what's editable",
    category: "admin-setup",
    order: 3,
    summary: "Nearly everything can be corrected after the fact. Here is where.",
    body: `Typos happen, especially at 3am in a dusty container. Almost every record in Chemistry can be corrected after creation rather than deleted and re-made.

**An asset can be renamed** by anyone who can work on it, from the pencil beside its name. Names drift: gear gets relabelled, a batch turns out to be mis-described, someone types it wrong at 3am. The rename is recorded in the asset History with who did it and what it was called before.

**Org admins can edit** part numbers and descriptions, part links and order history, divisions, departments, resolution codes, locations, and asset group names, each from an inline **Edit** control on the row or card itself. Asset types have always been editable from their own page.

**Validation still applies.** Renaming something to a value that's already taken is refused with a clear message rather than silently creating a duplicate. Part numbers within an asset type, department and division slugs, and resolution codes are all still unique. Re-parenting a location is checked for loops, so you can't accidentally make a location its own ancestor and break the tree.

**Users** are a partial exception. An org admin can change someone's **user name** and optional name, and can delete an account outright, but **email addresses can't be edited**. A person's email is how they sign in, so changing it would effectively hand their account to someone else. If an email is genuinely wrong, delete the account and send a fresh invite. User names must be unique so that attribution is never ambiguous, and each user's internal ID is shown on their card for when you need to refer to an exact account.

Deleting a user is blocked while they still have anything [checked out](/help/assets/checking-tools-in-and-out). Check the gear back in first, so it doesn't simply vanish from the record.

**What isn't editable.** Work order codes and asset tags are permanent identifiers, and audit log entries and notes are append-only by design. An asset tag in particular is printed on the sticker and encoded in that sticker's QR code, so changing it would strand every label already stuck to the thing. If a note is wrong, add a correcting note rather than rewriting history.`,
  },
  {
    slug: "exporting-lists",
    title: "Exporting lists to Excel",
    category: "getting-started",
    order: 5,
    summary: "Filter a list, pick your columns, get a spreadsheet.",
    body: `The **Assets** and **Work Orders** lists both have an **Export** button. The flow is: narrow the list with the filters until it shows what you want, press **Export**, tick the columns you need, and download.

**The export always matches your filter.** Whatever the list is showing is exactly what comes out, with the same search text, department, status, priority, and assignment filters. It isn't limited to the page you're looking at either. If your filter matches 300 assets and you're viewing 15 per page, you get all 300.

**Picking columns.** The dialog lists every available column with **All / Reset / None** shortcuts. Your choice is remembered per list, so if you export the same shape every week you only pick it once. Columns always come out in a consistent order regardless of the order you ticked them, so two people exporting the same selection get identical sheets.

**Custom fields.** When you filter the Assets list to a **single asset type**, that type's [custom fields](/help/admin-setup/asset-types-and-custom-fields) become available as columns: panel lot, firmware version, and so on. They're deliberately not offered across mixed types, where most rows would be blank. So to get a spreadsheet of every lantern with its panel lots, filter by the Lamplighter type first, then export.

**Excel or CSV.** **Excel** (\`.xlsx\`) is the better default, because dates come through as real dates and numbers as real numbers, so sorting and filtering in the spreadsheet behave properly instead of treating everything as text. Choose **CSV** if you're importing somewhere that prefers it. Google Sheets opens either one fine, via **File → Import** for CSV, or by opening the .xlsx directly from Drive.

There's a ceiling of 10,000 rows on a single export. If you somehow need more than that, narrow the filter and export in batches.`,
  },
  {
    slug: "printing-a-work-order",
    title: "Printing a work order",
    category: "work-orders",
    order: 8,
    summary: "A paper service record for a single ticket.",
    body: `Any work order can be printed as a one-page service record. That's useful when a repair needs a physical paper trail, when someone's working somewhere without a phone, or when a job needs signing off.

Open the ticket and click **Print**. It's in the action bar at the top of an open ticket, and alongside **Reopen** on a closed one. That opens a clean print layout with a **Print** button. Everything else is automatically left off the printed page, including the app navigation, the buttons, and the bottom tab bar on a phone.

**What's on it:** the work order number, status, priority and type; the asset with its type and location; who reported it and who it's assigned to; the full reported, started, completed and closed timeline; the title and problem description; the resolution code, notes, and labour minutes; every part used; the full notes log; and blank **Work performed by** and **Verified by** signature lines at the bottom.

It's a separate page rather than printing the ticket screen directly, because the ticket is tabbed, and printing that would only ever capture whichever tab happened to be open.`,
  },
  {
    slug: "troubleshooting-faq",
    title: "Troubleshooting and FAQ",
    category: "troubleshooting",
    order: 0,
    summary: "Common snags and what to do about them.",
    body: `**My sign-in link says invalid or expired.** Magic links expire a short while after they're sent and can only be used once. Go back to the sign-in page and request a fresh one rather than reusing an old email.

**I forgot my PIN, or it's locked.** After too many wrong attempts, PIN entry locks temporarily as a precaution. Use the email sign-in link instead. It always works regardless of PIN state.

**I can't find an asset.** Try the QR code first if you're standing near it, since scanning is faster and more reliable than searching by tag or name. If it's not where it should be, check its **History** timeline on its detail page for its last recorded move. If there wasn't one, or if it's simply somewhere new, log a move to a [custom location](/help/locations/custom-locations) once you find it so the record stays accurate.

**A field I need on the New Asset form isn't there.** Custom fields are defined per asset type by an org admin. See [Asset types and custom fields](/help/admin-setup/asset-types-and-custom-fields). Ask an admin to add the field rather than stuffing the value into Notes, so it's properly structured and searchable going forward.

**I don't see the Admin tab.** It's only shown to org admins. Ask an existing admin (check **Admin → Users**, or ask your department lead who to contact) to grant it if you have a genuine need to manage shared structural data.

**What is the difference between the title and the description?** The **title** is the short line every list shows, so keep it to something you would say on the radio. The **description** underneath is where the problem actually gets explained: what happened, what you already tried, what the next person needs to know. Tickets written before titles existed have the same text in both, and editing either one parts them company. See [Editing a work order](/help/work-orders/editing-a-work-order).

**Still stuck?** Search this guide from the box at the top of the **Help** tab, or ask an org admin directly. Their contact info is on their profile the same way yours is. See [Your contact profile](/help/accounts/your-contact-profile).`,
  },
  {
    slug: "what-the-board-is",
    title: "What the board is for",
    category: "board",
    order: 0,
    summary: "A shared picture of what's happening, who's got it, and what's stuck.",
    body: `The board answers four questions without anyone having to ask them in a group chat: **what's happening, who's got it, what's stuck, and what do I do next.**

It is not a project management system and it is not where work gets assigned. It is a shared picture that anyone can glance at.

**Every department has one, and so do you.** Open **Kanban** in the nav to see the list, plus a roll-up across the top showing anything stuck and anything in flight right now. You also get a personal kanban that nobody else can see. See [Your personal kanban](/help/board/personal-kanban). If you lead a division, that division's kanban is there too. See [Division boards](/help/board/division-boards).

**A card is one piece of work.** It has a title, an owner, a next action, and somewhere to note what's going on. The next action is the useful field: "waiting on Dave to confirm the trailer" tells the next person more than a status ever will.

**Columns are stages.** Out of the box: Ideas / Backlog, Ready / Next Up, In Progress, Blocked, and Done / Archived. An admin can change them. See [Changing board columns](/help/board/board-columns-admin).

**Done cards clear themselves.** Anything finished more than about a month ago drops off, so the board stays a picture of now rather than an archive. The work order behind a card, if there is one, keeps its full history regardless.

**Some cards are work orders.** A ticket filed against your department shows up on the board automatically, and moving it moves the ticket. That is worth understanding before you move things around. See [Cards and work orders](/help/board/cards-and-work-orders).

**Tags group cards across boards**, usually by team. See [Tagging cards](/help/board/board-tags).

To move something, drag it to another column, or tap the card and tap where it goes. See [Moving a card](/help/board/moving-a-card).`,
  },
  {
    slug: "moving-a-card",
    title: "Moving a card",
    category: "board",
    order: 1,
    summary: "Drag it, or tap twice. Both work, and the second one always works.",
    body: `There are two ways, and they do exactly the same thing.

**Drag it.** Pick the card up and drop it on the column you want. With a mouse, just drag. On a phone, **press and hold** the card for a moment first. It lifts, and then you can move it. The hold is what tells Chemistry you meant to move a card rather than scroll the board, so swiping across a card still scrolls the way it always did.

Drag toward the left or right edge and the board scrolls along with you, so you can reach a column that is off screen.

**Or tap twice.** Tap the card, then tap a column in the **Move to** list near the bottom.

**Use whichever suits the moment.** Dragging is quicker at a desk. Two taps is the one that always works: in gloves, with dusty hands, on a dirty screen, one-handed. Nothing lands in the wrong column because a finger slipped, and it is also the way that works with a keyboard or a screen reader.

**If a column is greyed out**, the card is a work order and that column has no matching status. That is not a bug. See [Cards and work orders](/help/board/cards-and-work-orders).

**If a card springs back after you move it**, the move failed and a message will say why. The usual cause is that someone else changed the same card first, or you don't have permission to change work in that department. The card returning to where it was means nothing was saved, so it is safe to try again.

**Who can move cards.** You need to be a member of the department that owns the board. Anyone signed in can read any department's board; changing one is limited to its own people and org admins.`,
  },
  {
    slug: "cards-and-work-orders",
    title: "Cards and work orders",
    category: "board",
    order: 2,
    summary: "Some cards are tickets, some point at tickets, and some are neither.",
    body: `A card and a work order can be related in three different ways. They look similar on the board and behave differently, so it is worth knowing which one you are looking at.

**The card is the work order.** When a ticket is filed against a department, a card for it appears on that department's board automatically. It shows the ticket number. You do not create these and you cannot delete them. Close the ticket and the card goes with it.

The important part: **that card does not have a column of its own.** Where it sits is worked out from the ticket's status every time the board loads. So moving the card is not really moving a card. It changes the ticket's status, and it needs the same permission that editing the ticket would.

This is also why a column can be greyed out. If no work order status corresponds to that column, there is nothing for the move to set, so the move is refused rather than silently doing nothing. An admin decides which statuses map to which columns. See [Changing board columns](/help/board/board-columns-admin).

**The card points at work orders.** Any card can have tickets attached to it as context, such as a planning card that references the three repairs it depends on. Attached tickets show on the card. The card keeps its own column, moves freely, and detaching a ticket leaves both the card and the ticket alone.

**The card is just a card.** Most of them are. A piece of work with no ticket behind it, living entirely on the board.

**Why it works this way.** A card that stored its own column *and* mirrored a ticket's status would be two records that have to agree. Sooner or later they wouldn't, and the board would show something the ticket didn't. Working the column out from the ticket each time means they cannot disagree.`,
  },
  {
    slug: "board-tags",
    title: "Tagging cards",
    category: "board",
    order: 3,
    summary: "Shared labels, usually a team, that mean the same thing on every board.",
    body: `Tags are labels you put on cards, most often to say which team or crew a piece of work belongs to.

**Add or remove one** by opening the card and tapping a tag. Tapping again takes it off. Changes save straight away.

**Filter by tag** from the top of a board to show only the cards carrying it. Useful when a board has more on it than you care about right now.

**Tags are shared across the whole organization.** There is one list, and it is the same on every board. A tag means the same thing everywhere, which is the point: a "Build" tag on the Lamplighters board and a "Build" tag on the Gate board are the same tag, so filtering is meaningful across the org.

The trade-off is that tags are not yours to reshape for one board. If a tag would only ever make sense on a single board, it is usually better as part of the card's title or next action.

**Deleting a tag leaves its cards alone.** They lose the label and nothing else. Nothing is archived and no work is lost, so removing a tag that turned out to be a bad idea is safe.

**Org admins manage the list** under **Admin → Tags**, where tags can be created, renamed, recoloured, and removed.

**Colour is never the only signal.** Every tag shows its name as well, so the board still reads correctly if you cannot easily tell two colours apart, or in bright sun where colours wash out.`,
  },
  {
    slug: "division-boards",
    title: "Division boards",
    category: "board",
    order: 4,
    summary: "The one place in Chemistry where something is deliberately not visible to everyone.",
    body: `A division is a grouping above departments: Ops, for example, sitting above Lamplighters, Gate, and the rest. Divisions get their own board, for work that belongs to the division as a whole rather than to any one department under it.

**Who can see one: the division's lead, and org admins. Nobody else.**

That is worth stating plainly, because it is unlike everything else in Chemistry. Everywhere else, anything you can read, everyone signed in can read. Every asset, every ticket, every department board is open to the whole organization, and only *changing* things is restricted. Division boards are the single exception.

**Not even department leads** can see the board of the division their department belongs to. Leading Lamplighters does not give you the Ops board.

**Why the exception exists.** Division-level work is often about departments rather than within them: reorganising who owns what, planning around a department that is struggling, budget decisions that aren't settled. Putting that in front of everyone would either expose half-formed decisions or, more likely, stop it being written down at all.

**How to find yours.** If you lead a division, it appears on the main **Kanban** page under a Divisions heading, marked as restricted. If you don't lead one, you will not see the heading, and there is nothing to miss.

**Division boards don't absorb work orders.** Tickets belong to departments, so a division board has no automatic cards. You can still attach tickets to a card as context. See [Cards and work orders](/help/board/cards-and-work-orders).

**Setting the lead** is an org admin job, under **Admin → Divisions**. A division with no lead is visible only to org admins.`,
  },
  {
    slug: "board-columns-admin",
    title: "Changing board columns",
    category: "board",
    order: 5,
    summary: "Admin only. Every board ships with working defaults, so you may never need this.",
    body: `Every board is created with columns that already work: Ideas / Backlog, Ready / Next Up, In Progress, Blocked, Done / Archived. This page exists for when those aren't the right names or the right stages for how a department actually works. Most departments never touch it.

Org admins only, under **Admin → Board columns**.

**Each column has two separate settings about work orders, and they answer different questions.**

**Shows work orders in** decides which ticket statuses appear in this column. A ticket's card is placed by its status, so this is what determines where it shows up.

**Moving here sets** decides what status a ticket gets when someone drags its card into this column. If you leave it blank, the column refuses work order cards altogether, which is right for a column like Ideas where a real ticket has no business.

These differ because one is about display and the other about intent. Done can *show* Complete, Closed, and Cancelled together, while a move into Done has to pick exactly one of them.

**Every status must appear in exactly one column.** If a status appeared in none, its tickets would vanish from the board. If it appeared in two, the same card would show up twice. Chemistry refuses a configuration that would do either, and tells you which status is the problem. This is the rule most likely to trip you up when adding a column: you have to take a status away from somewhere else to give it to the new one.

**Deleting a column** asks where its cards should go first. Nothing is discarded.

**A note on editing help articles.** The articles in this guide that ship with Chemistry are rewritten from the source files each time the application starts. If you edit one of those through **Manage articles**, your changes will be replaced on the next update. Articles *you* create are never touched, only the ones that came with the app. If you need a permanent change to a shipped article, ask whoever maintains the installation to change it at the source.`,
  },
  {
    slug: "personal-kanban",
    title: "Your personal kanban",
    category: "board",
    order: 6,
    summary: "A board of your own that nobody else can open.",
    body: `Alongside the department kanbans, you have one of your own. Open **Kanban** in the nav and it is at the top, under "Yours alone".

**Nobody else can see it.** Not your department lead, not an org admin, not whoever runs the system. Every other kanban in Chemistry can be read by anyone signed in. This one is the exception, and it is the exception on purpose. It is for the things you are keeping track of rather than the things the team needs to see.

**It works exactly like the others.** The same columns, the same cards, and the same two ways to move them: drag, or tap and pick a column. See [Moving a card](/help/board/moving-a-card).

**It starts with five columns**: Ideas, Next up, Doing, Waiting, Done. Rename them, add your own, or throw them away. It is yours, and changing it affects nobody else.

**Work orders do not land here.** A ticket belongs to the department that has to do it, and a ticket that quietly moved onto someone's private board would be work the rest of the team could no longer see. You can still attach a ticket to one of your cards as a reminder to follow it up. See [Cards and work orders](/help/board/cards-and-work-orders).

**Tags are shared.** The tag list is the same one every kanban uses, so a tag means what it means everywhere. Which tags you put on your own cards is still only visible to you.`,
  },
  {
    slug: "editing-a-work-order",
    title: "Editing a work order, and undoing it",
    category: "work-orders",
    order: 12,
    summary: "Every field can be changed, and the last five changes can be taken back.",
    body: `Open a ticket and press **Edit details**. Everything on it can be changed: the title, the description, priority, type, labour minutes and the resolution notes.

**Title and description are different things.** The title is the one line that shows in every list, so keep it short and recognisable. The description is the room to explain the problem properly: what happened, what you tried, what the next person needs to know. A ticket created before titles existed carries the same text in both until somebody edits it.

**Undo takes back the last change.** It appears next to Edit details as soon as there is something to undo, and it goes back up to five steps. It puts back only the fields that particular edit changed, so undoing your own typo will not quietly revert something a colleague changed in the meantime.

**Redo only appears once you have used undo.** If it is not there, there is nothing to redo. That is the button telling you so, rather than sitting greyed out.

**Making a new edit ends the redo trail.** Once you change something else, the steps you had undone are gone for good, because they described a version of the ticket that no longer exists.

**Undo is not the history.** Every edit is also written to the audit log, which keeps everything permanently and is what to consult when the question is "who changed this and when". Undo is for the thing you just did by accident.`,
  },
];

// Slugs that used to ship in this file and have since been renamed or dropped.
// Listed explicitly rather than deleting everything not in ARTICLES, because
// articles can also be hand-authored through /help/admin and those must survive.
const RETIRED_SLUGS = ["code-files-on-assets"];

async function main() {
  await prisma.helpArticle.deleteMany({ where: { slug: { in: RETIRED_SLUGS } } });

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
