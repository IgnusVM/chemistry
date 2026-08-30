import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { CustomFieldDef } from "../src/lib/custom-fields";
import type { WorkOrderStatus } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const OPS_DEPARTMENTS: { name: string; slug: string; description: string | null }[] = [
  { name: "LNT", slug: "lnt", description: null },
  { name: "Lamplighters", slug: "lamplighters", description: "Solar lantern fleet: build, deploy, and maintain." },
  { name: "APW", slug: "apw", description: null },
  { name: "Quartermaster", slug: "quartermaster", description: null },
  { name: "Gate", slug: "gate", description: "Perimeter and entry operations." },
];

// Departments seeded before the real org list was known — remove if present and empty.
const OBSOLETE_SLUGS = ["dpw", "sanctuary", "rangers", "ice", "fire-safety", "effigy", "greeters", "medical", "comms"];

const LAMPLIGHTER_CUSTOM_FIELDS: CustomFieldDef[] = [
  { key: "panelLot", label: "Solar Panel Lot", type: "string" },
  { key: "boardBatch", label: "Control Board Batch", type: "string" },
  { key: "firmwareVersion", label: "Firmware Version", type: "string" },
  { key: "cellSerial", label: "Battery Cell Serial", type: "string" },
];

async function main() {
  // The first org admin comes from the environment, never from source. A
  // hardcoded address would make every deployment of this repo bootstrap
  // somebody else's account as its administrator.
  //
  // Unset is a legitimate state: the structural seed still runs, and the
  // instance simply has no admin until BOOTSTRAP_ADMIN_EMAIL is provided.
  // Re-running the seed later is how you grant it.
  const bootstrapEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();

  // The seed runs on every container start, so `update: { isOrgAdmin: true }`
  // did not bootstrap an administrator once -- it re-asserted the flag forever,
  // silently undoing any deliberate change on the next deploy. It reverted the
  // root Director's removed org-admin tag within minutes of setting it, and it
  // would equally have re-promoted anyone demoted on purpose.
  //
  // The recovery this exists for is still intact: an instance whose bootstrap
  // account has NO route to admin gets the flag back by re-running the seed.
  // An account that already has one is left exactly as configured.
  const existing = bootstrapEmail
    ? await prisma.user.findUnique({
        where: { email: bootstrapEmail },
        select: { id: true, email: true, isOrgAdmin: true, isDirector: true },
      })
    : null;

  const admin = !bootstrapEmail
    ? null
    : existing
      ? existing.isOrgAdmin || existing.isDirector
        ? existing
        : await prisma.user.update({ where: { id: existing.id }, data: { isOrgAdmin: true } })
      : await prisma.user.create({
          data: {
            email: bootstrapEmail,
            displayName: process.env.BOOTSTRAP_ADMIN_NAME?.trim() || bootstrapEmail.split("@")[0],
            isOrgAdmin: true,
          },
        });

  if (!admin) {
    console.log("BOOTSTRAP_ADMIN_EMAIL is not set — seeding structure only, with no org admin.");
    console.log("  Set it and re-run this seed to grant the first administrator.");
  }

  const ops = await prisma.division.upsert({
    where: { slug: "ops" },
    update: { name: "Ops" },
    create: { name: "Ops", slug: "ops" },
  });

  const departmentsBySlug = new Map<string, { id: string }>();
  for (const dept of OPS_DEPARTMENTS) {
    const record = await prisma.department.upsert({
      where: { slug: dept.slug },
      update: { name: dept.name, description: dept.description, divisionId: ops.id },
      create: { ...dept, divisionId: ops.id },
    });
    departmentsBySlug.set(dept.slug, record);
  }

  for (const slug of OBSOLETE_SLUGS) {
    const dept = await prisma.department.findUnique({
      where: { slug },
      include: { _count: { select: { assets: true, memberships: true, assetTypes: true } } },
    });
    if (!dept) continue;
    const empty = dept._count.assets === 0 && dept._count.memberships === 0 && dept._count.assetTypes === 0;
    if (empty) {
      await prisma.department.delete({ where: { id: dept.id } });
      console.log(`Removed obsolete placeholder department: ${slug}`);
    } else {
      console.log(`Left obsolete department "${slug}" in place — it has data attached, delete it manually if it's really gone.`);
    }
  }

  const lamplighters = departmentsBySlug.get("lamplighters")!;

  // Only when there is an admin to attach — otherwise leave the department
  // unled rather than inventing a placeholder user to own it.
  if (admin) {
    await prisma.departmentMembership.upsert({
      where: { userId_departmentId: { userId: admin.id, departmentId: lamplighters.id } },
      update: { role: "LEAD" },
      create: { userId: admin.id, departmentId: lamplighters.id, role: "LEAD" },
    });

    await prisma.department.update({
      where: { id: lamplighters.id },
      data: { leadUserId: admin.id },
    });
  }

  let storage = await prisma.location.findFirst({
    where: { name: "Home Base Storage", parentLocationId: null },
  });
  if (!storage) {
    storage = await prisma.location.create({
      data: { name: "Home Base Storage", type: "STORAGE_FACILITY" },
    });
  }

  const existingLamplighterType = await prisma.assetType.findFirst({
    where: { name: "Solar Lamplighter Lantern" },
  });
  if (existingLamplighterType) {
    await prisma.assetType.update({
      where: { id: existingLamplighterType.id },
      data: {
        manufacturer: "Alchemy Lamplighters",
        defaultDepartmentId: lamplighters.id,
        customFieldSchema: LAMPLIGHTER_CUSTOM_FIELDS,
      },
    });
  } else {
    await prisma.assetType.create({
      data: {
        name: "Solar Lamplighter Lantern",
        manufacturer: "Alchemy Lamplighters",
        defaultDepartmentId: lamplighters.id,
        customFieldSchema: LAMPLIGHTER_CUSTOM_FIELDS,
      },
    });
  }

  // CMMS resolution codes — what happened, not what was wrong.
  const RESOLUTION_CODES = [
    { code: "COULD_NOT_DUPLICATE", label: "Could Not Duplicate" },
    { code: "COULD_NOT_LOCATE", label: "Could Not Locate" },
    { code: "GENERAL_REPAIR", label: "General Repair" },
    { code: "MISC", label: "Misc" },
    { code: "ID10T", label: "ID10-t" },
    { code: "MAGIC", label: "Magic" },
    { code: "DEFERRED", label: "Deferred" },
  ];
  for (const rc of RESOLUTION_CODES) {
    await prisma.resolutionCode.upsert({
      where: { code: rc.code },
      update: { label: rc.label },
      create: rc,
    });
  }

  // Task board: one per department, created here rather than by any user
  // action so nobody ever meets the concept of "making a board" — they just
  // find their department's board already there. Idempotent, because this
  // seed runs on every container start.
  //
  // The status mapping is the load-bearing part. Every WorkOrderStatus must
  // appear in exactly one column's woStatusesShown, or a work-order card is
  // either invisible or duplicated. woStatusOnMove is a different question:
  // what a move INTO this column sets. Done shows three terminal statuses but
  // a move into it picks one.
  const DEFAULT_COLUMNS: {
    name: string;
    position: number;
    color: string;
    woStatusOnMove: WorkOrderStatus | null;
    woStatusesShown: WorkOrderStatus[];
  }[] = [
    { name: "Ideas / Backlog", position: 0, color: "slate", woStatusOnMove: null, woStatusesShown: [] },
    { name: "Ready / Next Up", position: 1, color: "sky", woStatusOnMove: "PENDING", woStatusesShown: ["PENDING"] },
    { name: "In Progress", position: 2, color: "amber", woStatusOnMove: "IN_PROGRESS", woStatusesShown: ["IN_PROGRESS"] },
    { name: "Blocked", position: 3, color: "rose", woStatusOnMove: "WAITING_PARTS", woStatusesShown: ["WAITING_PARTS"] },
    { name: "Done / Archived", position: 4, color: "emerald", woStatusOnMove: "COMPLETE", woStatusesShown: ["COMPLETE", "CANCELLED"] },
  ];

  const allDepartments = await prisma.department.findMany({ select: { id: true } });
  const allDivisions = await prisma.division.findMany({ select: { id: true } });

  // Divisions get a board too, visible only to the division lead and org
  // admins. Unlike a department board it gets no auto-created work order
  // cards -- a ticket shows up there only when someone attaches it to a card
  // deliberately.
  const boardOwners: ({ departmentId: string } | { divisionId: string })[] = [
    ...allDepartments.map((d) => ({ departmentId: d.id })),
    ...allDivisions.map((v) => ({ divisionId: v.id })),
  ];

  for (const owner of boardOwners) {
    const board = await prisma.board.upsert({
      where: "departmentId" in owner ? { departmentId: owner.departmentId } : { divisionId: owner.divisionId },
      update: {},
      create: owner,
    });
    // Columns are matched on (boardId, position) rather than deleted and
    // recreated: recreating would orphan every card on the board every time
    // the seed ran, which is once per deploy.
    for (const col of DEFAULT_COLUMNS) {
      const existing = await prisma.boardColumn.findFirst({
        where: { boardId: board.id, position: col.position },
      });
      if (existing) continue;
      await prisma.boardColumn.create({ data: { ...col, boardId: board.id } });
    }
  }

  // Backfill: any work order without a card gets one. Idempotent, and it also
  // covers work orders created while a board briefly did not exist.
  const orphanWorkOrders = await prisma.workOrder.findMany({
    where: { card: { is: null } },
    select: { id: true, title: true, description: true, departmentId: true },
  });
  let backfilled = 0;
  for (const wo of orphanWorkOrders) {
    const board = await prisma.board.findUnique({
      where: { departmentId: wo.departmentId },
      select: { id: true },
    });
    if (!board) continue;
    await prisma.card.create({
      // Title first: description is the long account of the problem, and a
      // card headed with 120 characters of it is unreadable on a board. Older
      // tickets predate the title field and still fall back to description.
      data: { boardId: board.id, workOrderId: wo.id, title: (wo.title || wo.description).slice(0, 120) },
    });
    backfilled++;
  }

  console.log(
    `Seeded division "Ops" with ${OPS_DEPARTMENTS.length} departments, ${admin ? `org admin ${admin.email}, ` : "no org admin, "}Lamplighter asset type, ${storage.name}, and ${RESOLUTION_CODES.length} resolution codes. Task boards: ${allDepartments.length} department + ${allDivisions.length} division, ${backfilled} work order card(s) backfilled.`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
