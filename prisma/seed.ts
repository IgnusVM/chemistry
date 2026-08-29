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
  const admin = bootstrapEmail
    ? await prisma.user.upsert({
        where: { email: bootstrapEmail },
        update: { isOrgAdmin: true },
        create: {
          email: bootstrapEmail,
          displayName: process.env.BOOTSTRAP_ADMIN_NAME?.trim() || bootstrapEmail.split("@")[0],
          isOrgAdmin: true,
        },
      })
    : null;

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
    { name: "Ready / Next Up", position: 1, color: "sky", woStatusOnMove: "OPEN", woStatusesShown: ["OPEN"] },
    { name: "In Progress", position: 2, color: "amber", woStatusOnMove: "IN_PROGRESS", woStatusesShown: ["IN_PROGRESS"] },
    { name: "Blocked", position: 3, color: "rose", woStatusOnMove: "WAITING_PARTS", woStatusesShown: ["WAITING_PARTS"] },
    { name: "Done / Archived", position: 4, color: "emerald", woStatusOnMove: "COMPLETE", woStatusesShown: ["COMPLETE", "CLOSED", "CANCELLED"] },
  ];

  const allDepartments = await prisma.department.findMany({ select: { id: true } });
  for (const dept of allDepartments) {
    const board = await prisma.board.upsert({
      where: { departmentId: dept.id },
      update: {},
      create: { departmentId: dept.id },
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

  console.log(
    `Seeded division "Ops" with ${OPS_DEPARTMENTS.length} departments, ${admin ? `org admin ${admin.email}, ` : "no org admin, "}Lamplighter asset type, ${storage.name}, and ${RESOLUTION_CODES.length} resolution codes. Task boards: ${allDepartments.length}.`,
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
