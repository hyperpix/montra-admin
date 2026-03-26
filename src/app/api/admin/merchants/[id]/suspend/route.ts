import { NextRequest, NextResponse } from "next/server"
import { requireAuth, checkPermission } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logAuditAction } from "@/lib/audit"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    if (!checkPermission(session.role, ["SUPER_ADMIN", "ADMIN"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const { id } = await params
    const { reason } = await request.json()

    const merchant = await prisma.merchant.findUnique({ where: { id } })
    if (!merchant) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await prisma.$transaction([
      prisma.merchant.update({
        where: { id },
        data: {
          status: "suspended",
          suspendedAt: new Date(),
          suspendedBy: session.admin_id,
          suspensionReason: reason,
        },
      }),
      prisma.merchantStatusHistory.create({
        data: {
          merchantId: id,
          previousStatus: merchant.status || "unknown",
          newStatus: "suspended",
          changedById: session.admin_id,
          reason,
        },
      }),
    ])

    await logAuditAction({
      adminId: session.admin_id,
      action: "SUSPEND_MERCHANT",
      targetMerchantId: id,
      metadata: { reason, previousStatus: merchant.status },
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
