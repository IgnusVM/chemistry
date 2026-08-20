import "server-only";
import type { Prisma } from "@/generated/prisma/client";

export type AssetListParams = {
  q?: string;
  department?: string;
  status?: string;
  type?: string;
};

export function buildAssetWhere(params: AssetListParams): Prisma.AssetWhereInput {
  const where: Prisma.AssetWhereInput = {};
  if (params.department) where.owningDepartmentId = params.department;
  if (params.status) where.status = params.status as Prisma.EnumAssetStatusFilter["equals"];
  if (params.type) where.assetTypeId = params.type;
  if (params.q) {
    where.OR = [
      { assetTag: { contains: params.q, mode: "insensitive" } },
      { name: { contains: params.q, mode: "insensitive" } },
    ];
  }
  return where;
}
