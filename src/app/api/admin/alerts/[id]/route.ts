import { NextRequest, NextResponse } from "next/server"
import { requireAuth, checkPermission } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logAuditAction } from "@/lib/audit"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    if (!checkPermission(session.role, ["SUPER_ADMIN", "ADMIN", "SUPPORT"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const { id } = await params
    const { status } = await request.json()

    const updateData: Record<string, unknown> = { status }
    if (status === "ACKNOWLEDGED") {
      updateData.acknowledgedById = session.admin_id
    }
    if (status === "RESOLVED") {
      updateData.resolvedById = session.admin_id
      updateData.resolvedAt = new Date()
    }

    const alert = await prisma.merchantAlert.update({
      where: { id },
      data: updateData as any,
    })

    const actionMap: Record<string, string> = {
      ACKNOWLEDGED: "ACKNOWLEDGE_ALERT",
      RESOLVED: "RESOLVE_ALERT",
      DISMISSED: "DISMISS_ALERT",
    }

    await logAuditAction({
      adminId: session.admin_id,
      action: actionMap[status] as any,
      targetMerchantId: alert.merchantId,
      metadata: { alertId: id, alertType: alert.type },
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
    })

    return NextResponse.json({ alert })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
