/**
 * Give every member a tutorial: one work order with a checklist, plus a card on
 * their own kanban.
 *
 * Run with:
 *   NODE_OPTIONS=--conditions=react-server npx tsx --env-file=.env scripts/seed-tutorial.ts
 * Add `--apply` to write. Without it the script reports what it would do and
 * changes nothing, because this is meant to be run against a live database that
 * real people are using.
 *
 * Idempotent: someone who already has a tutorial is skipped rather than handed a
 * second one. Re-running after adding a new member gives that person theirs.
 *
 * A tutorial goes in a department the person actually belongs to. Ticking a task
 * needs department access, so a ticket filed somewhere they are not a member
 * would be one they could read and not use, which is worse than not having one.
 * Org admins can work any department, so they fall back to the department the
 * ticket would most plausibly belong to.
 */
import { prisma } from "@/lib/prisma";
import { ensurePersonalBoard } from "@/lib/personal-board";
import { generateWorkOrderCode } from "@/lib/work-order-code";

const APPLY = process.argv.includes("--apply");

const TUTORIAL_TITLE = "Start here: a tour of Chemistry";

const TUTORIAL_DESCRIPTION = `Welcome to Chemistry. This ticket is your tour of it, and it is also an example of the thing it is teaching you: a work order with a checklist, assigned to a person, which gets closed when the work is done.

Work through the tasks below in any order. Each one has instructions, behind the small Instructions link under the task. Tick them off as you go. When they are all ticked, close this ticket with the Close ticket button and you are done.

Nothing here can break anything. Every task is either looking at something or changing something that belongs to you.

If you get stuck, the Help tab has an article on everything mentioned below, and the search box at the top of it searches all of them.`;

/** Kept under the 50-character task limit; the detail lives in instructions. */
const TASKS: { text: string; instructions: string }[] = [
  {
    text: "Find your way around",
    instructions: `Open each tab along the top: Assets, Kanban, Work Orders, Loans. You do not have to do anything on them yet. On a phone the same places are along the bottom, with Scan in the middle because it is the thing you will use most.

Most day-to-day work happens on two of them: Assets and Work Orders. Everything else is either a view of those or a place to set things up.`,
  },
  {
    text: "Open an asset and read its history",
    instructions: `Go to Assets and click any row. The page shows what the thing is, where it is, what condition it is in, and a QR code that points at this exact page.

Then open its History tab. Every move, every status change, and every ticket ever filed against it is there, with who did it and when. That record is the reason we log anything at all: the next person to pick this up should not have to guess.`,
  },
  {
    text: "Scan a QR code",
    instructions: `If you have a phone handy, tap Scan in the middle of the bottom bar and point it at any Chemistry sticker. It opens that asset straight away, no searching.

If the asset already has an open ticket, the scan tells you before anything else, so two people do not end up fixing the same fault from opposite ends.

No sticker nearby? Skip this one and tick it. It will make sense the first time you are standing in front of something.`,
  },
  {
    text: "Look at your department's kanban",
    instructions: `Open Kanban. You will see a board for each department: what is happening, who has it, and what is stuck.

A card is one piece of work. The useful field on it is the next action, because "waiting on Dave to confirm the trailer" tells the next person more than any status ever will.

Some cards are work orders, and moving those actually changes the ticket. That is worth knowing before you start dragging things around.`,
  },
  {
    text: "Move the card on your own kanban",
    instructions: `At the top of the Kanban page, under "Yours alone", is a board only you can see. Not your lead, not an org admin, not whoever runs the system.

There is a card on it called "Finish the Chemistry tour". Move it to Doing, and then to Done when you have finished this ticket. Drag it, or tap it and pick a column from the Move to list. Both work; tapping is the one that still works in gloves.

Then use it for whatever you like. It is yours.`,
  },
  {
    text: "Say how to reach you at the burn",
    instructions: `Click your name in the top right and open your account page.

Fill in how you would actually want to be reached during the event: a phone number, a radio channel, a camp where someone can usually find you. Playa is not a place where email works reliably, and when somebody is standing in front of a broken thing you filed a ticket about, this is how they find you.

Everything on it is optional. While you are there, pick an icon and colour, or upload a picture, so your notes are recognisable in a list.`,
  },
  {
    text: "File a work order of your own",
    instructions: `Find something that genuinely needs attention and file it: open the asset and click Report a problem, or use New work order from the dashboard for something not tied to a specific thing.

Give it a short title, the kind of line you would say on the radio. Put the detail in the description underneath: what happened, what you already tried, what the next person needs to know.

If you cannot think of anything real, file one against a piece of gear you know is fine and cancel it afterwards. Better to practise now than at 2am.`,
  },
  {
    text: "Close this ticket",
    instructions: `Once the rest are ticked, use Close ticket at the top of this page.

Closing asks for a resolution code, which is a short controlled list rather than free text so patterns show up over time. For this one, General Repair is fine. Write a line in the resolution notes about anything that confused you, because that is genuinely useful to whoever is looking after this system.

A closed ticket becomes a read-only record. If you need it back, Reopen work order is at the bottom.`,
  },
];

const CARD_TITLE = "Finish the Chemistry tour";

async function main() {
  const users = await prisma.user.findMany({
    include: { memberships: { include: { department: true } } },
    orderBy: { displayName: "asc" },
  });

  // Where a ticket goes for someone with no membership of their own. Org admins
  // can work any department, so this is a real placement for them, not a fudge.
  const fallback = await prisma.department.findFirst({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  const plan: { user: (typeof users)[number]; departmentId: string; departmentName: string }[] = [];
  const blocked: string[] = [];
  const already: string[] = [];

  for (const user of users) {
    const existing = await prisma.workOrder.findFirst({
      where: { title: TUTORIAL_TITLE, assignedToUserId: user.id },
      select: { code: true },
    });
    if (existing) {
      already.push(`${user.displayName} (${existing.code})`);
      continue;
    }

    const own = user.memberships[0];
    if (own) {
      plan.push({ user, departmentId: own.departmentId, departmentName: own.department.name });
    } else if (user.isOrgAdmin || user.isDirector) {
      if (!fallback) throw new Error("No active department exists to file tutorials against.");
      plan.push({ user, departmentId: fallback.id, departmentName: `${fallback.name} (as admin)` });
    } else {
      // Filing this anyway would produce a ticket they can read and not use.
      blocked.push(`${user.displayName} <${user.email}>`);
    }
  }

  console.log(`users: ${users.length}`);
  if (already.length) console.log(`already have one: ${already.join(", ")}`);
  if (blocked.length) {
    console.log(`\nBLOCKED, no department and not an admin (they could not tick a task):`);
    for (const b of blocked) console.log(`  ${b}`);
  }
  console.log(`\nwould create ${plan.length} tutorial(s):`);
  for (const p of plan) console.log(`  ${p.user.displayName} -> ${p.departmentName}`);

  if (!APPLY) {
    console.log("\nDry run. Pass --apply to write.");
    return;
  }

  for (const { user, departmentId } of plan) {
    // One code at a time: the generator counts today's tickets per type, so
    // asking for several at once and creating them in a loop would collide.
    const code = await generateWorkOrderCode("GENERAL");

    const workOrder = await prisma.workOrder.create({
      data: {
        code,
        departmentId,
        type: "GENERAL",
        priority: "LOW",
        title: TUTORIAL_TITLE,
        description: TUTORIAL_DESCRIPTION,
        assignedToUserId: user.id,
        reportedByUserId: user.id,
        tasks: {
          create: TASKS.map((t, position) => ({
            text: t.text,
            instructions: t.instructions,
            position,
          })),
        },
      },
      select: { id: true, code: true },
    });

    const board = await ensurePersonalBoard(user.id);
    const firstColumn = await prisma.boardColumn.findFirst({
      where: { boardId: board.id },
      orderBy: { position: "asc" },
      select: { id: true },
    });
    if (!firstColumn) throw new Error(`personal board for ${user.displayName} has no columns`);

    const hasCard = await prisma.card.findFirst({
      where: { boardId: board.id, title: CARD_TITLE },
      select: { id: true },
    });
    if (!hasCard) {
      await prisma.card.create({
        data: {
          boardId: board.id,
          columnId: firstColumn.id,
          title: CARD_TITLE,
          ownerUserId: user.id,
          nextAction: `Work through ${workOrder.code}`,
          statusNotes: "Move me to Doing, then to Done when the ticket is closed.",
          createdByUserId: user.id,
          position: 0,
        },
      });
    }

    console.log(`  ${user.displayName}: ${workOrder.code} + kanban card`);
  }

  console.log(`\ndone: ${plan.length} tutorial(s) created`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
