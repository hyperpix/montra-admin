import { prisma } from "./prisma"
import type { AdminAction } from "@prisma/client"

export async function logAuditAction(params: {
  adminId: string
  action: AdminAction
  targetMerchantId?: string
  targetAdminId?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
}) {
  await prisma.adminAuditLog.create({
    data: {
      adminId: params.adminId,
      action: params.action,
      targetMerchantId: params.targetMerchantId || null,
      targetAdminId: params.targetAdminId || null,
      metadata: (params.metadata as any) ?? undefined,
      ipAddress: params.ipAddress || null,
    },
  })
}
