import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { CustomFieldDef } from "../src/lib/custom-fields";

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
  const ignus = await prisma.user.upsert({
    where: { email: "steven.a.strength@gmail.com" },
    update: { isOrgAdmin: true },
    create: {
      email: "steven.a.strength@gmail.com",
      displayName: "Steven",
      playaName: "Ignus",
      isOrgAdmin: true,
    },
  });

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

  await prisma.departmentMembership.upsert({
    where: { userId_departmentId: { userId: ignus.id, departmentId: lamplighters.id } },
    update: { role: "LEAD" },
    create: { userId: ignus.id, departmentId: lamplighters.id, role: "LEAD" },
  });

  await prisma.department.update({
    where: { id: lamplighters.id },
    data: { leadUserId: ignus.id },
  });

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

  // GEMS resolution codes — what happened, not what was wrong.
  const RESOLUTION_CODES = [
    { code: "COULD_NOT_DUPLICATE", label: "Could Not Duplicate" },
    { code: "COULD_NOT_LOCATE", label: "Could Not Locate" },
    { code: "GENERAL_REPAIR", label: "General Repair" },
    { code: "MISC", label: "Misc" },
    { code: "ID10T", label: "ID10t" },
    { code: "MAGIC", label: "Magic" },
  ];
  for (const rc of RESOLUTION_CODES) {
    await prisma.resolutionCode.upsert({
      where: { code: rc.code },
      update: { label: rc.label },
      create: rc,
    });
  }

  console.log(
    `Seeded division "Ops" with ${OPS_DEPARTMENTS.length} departments, org admin ${ignus.email}, Lamplighter asset type, ${storage.name}, and ${RESOLUTION_CODES.length} resolution codes.`,
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
