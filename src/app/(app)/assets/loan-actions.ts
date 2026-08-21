"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/dal";
import { recordAudit } from "@/lib/audit";
import {
  canManageLoans,
  canGrantLoanPrivilege,
  canLendOnBehalfOfOthers,
} from "@/lib/loans";

export type LoanFormState = { error?: string } | undefined;

const checkOutSchema = z.object({
  assetId: z.string().min(1),
  borrowerUserId: z.string().optional(),
  notes: z.string().optional(),
});

export async function checkOutAsset(
  _prevState: LoanFormState,
  formData: FormData,
): Promise<LoanFormState> {
  const user = await requireCurrentUser();
  const parsed = checkOutSchema.safeParse({
    assetId: formData.get("assetId"),
    borrowerUserId: formData.get("borrowerUserId") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const asset = await prisma.asset.findUniqueOrThrow({
    where: { id: parsed.data.assetId },
    include: { assetType: true },
  });
  if (!asset.assetType.loanable) {
    return { error: "This asset type isn't set up for checking out." };
  }
  if (!(await canManageLoans(asset.owningDepartmentId))) {
    return { error: "You don't have check-out access for this department." };
  }

  const borrowerUserId = parsed.data.borrowerUserId || user.id;
  if (borrowerUserId !== user.id && !(await canLendOnBehalfOfOthers(asset.owningDepartmentId))) {
    return { error: "Only a department lead can check something out for someone else." };
  }

  const open = await prisma.assetLoan.findFirst({
    where: { assetId: asset.id, checkedInAt: null },
    include: { borrower: true },
  });
  if (open) {
    return { error: `Already checked out to ${open.borrower?.displayName ?? "someone"}.` };
  }

  try {
    await prisma.assetLoan.create({
      data: {
        assetId: asset.id,
        borrowerUserId,
        checkedOutByUserId: user.id,
        checkedOutNotes: parsed.data.notes,
      },
    });
  } catch {
    // The partial unique index is the real guard against two people racing the
    // button; the check above only catches the non-concurrent case.
    return { error: "Someone just checked this out. Reload to see the current holder." };
  }

  await recordAudit({
    entityType: "Asset",
    entityId: asset.id,
    action: "checked out",
    userId: user.id,
    changes: { borrowerUserId },
  });

  revalidatePath(`/assets/${asset.assetTag}`);
  revalidatePath("/loans");
}

const checkInSchema = z.object({
  loanId: z.string().min(1),
  notes: z.string().optional(),
});

export async function checkInAsset(
  _prevState: LoanFormState,
  formData: FormData,
): Promise<LoanFormState> {
  const user = await requireCurrentUser();
  const parsed = checkInSchema.safeParse({
    loanId: formData.get("loanId"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const loan = await prisma.assetLoan.findUniqueOrThrow({
    where: { id: parsed.data.loanId },
    include: { asset: true },
  });
  if (loan.checkedInAt) return { error: "That loan is already closed." };
  if (!(await canManageLoans(loan.asset.owningDepartmentId))) {
    return { error: "You don't have check-in access for this department." };
  }

  // Guarded update so a double-submit can't overwrite the first check-in time.
  const updated = await prisma.assetLoan.updateMany({
    where: { id: loan.id, checkedInAt: null },
    data: {
      checkedInAt: new Date(),
      checkedInByUserId: user.id,
      checkedInNotes: parsed.data.notes,
    },
  });
  if (updated.count === 0) return { error: "That loan is already closed." };

  await recordAudit({
    entityType: "Asset",
    entityId: loan.assetId,
    action: "checked in",
    userId: user.id,
  });

  revalidatePath(`/assets/${loan.asset.assetTag}`);
  revalidatePath("/loans");
}

const privilegeSchema = z.object({
  userId: z.string().min(1),
  departmentId: z.string().min(1),
});

export async function grantLoanPrivilege(
  _prevState: LoanFormState,
  formData: FormData,
): Promise<LoanFormState> {
  const admin = await requireCurrentUser();
  const parsed = privilegeSchema.safeParse({
    userId: formData.get("userId"),
    departmentId: formData.get("departmentId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  if (!(await canGrantLoanPrivilege(parsed.data.departmentId))) {
    return { error: "You can only grant access for a department you lead." };
  }

  await prisma.assetLoanPrivilege.upsert({
    where: {
      userId_departmentId: { userId: parsed.data.userId, departmentId: parsed.data.departmentId },
    },
    update: {},
    create: { ...parsed.data, grantedByUserId: admin.id },
  });

  await recordAudit({
    entityType: "AssetLoanPrivilege",
    entityId: `${parsed.data.userId}:${parsed.data.departmentId}`,
    action: "granted",
    userId: admin.id,
  });

  revalidatePath("/loans/access");
}

export async function revokeLoanPrivilege(userId: string, departmentId: string) {
  const admin = await requireCurrentUser();
  if (!(await canGrantLoanPrivilege(departmentId))) {
    throw new Error("You can only revoke access for a department you lead.");
  }

  await prisma.assetLoanPrivilege.deleteMany({ where: { userId, departmentId } });

  await recordAudit({
    entityType: "AssetLoanPrivilege",
    entityId: `${userId}:${departmentId}`,
    action: "revoked",
    userId: admin.id,
  });

  revalidatePath("/loans/access");
}
