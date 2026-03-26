import { NextRequest, NextResponse } from "next/server"
import { requireAuth, checkPermission } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logAuditAction } from "@/lib/audit"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    if (!checkPermission(session.role, ["SUPER_ADMIN"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const { id } = await params
    const body = await request.json()
    const allowedFields = ["name", "role", "isActive"]
    const updateData: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) updateData[field] = body[field]
    }

    const user = await prisma.adminUser.update({ where: { id }, data: updateData as any })

    await logAuditAction({
      adminId: session.admin_id,
      action: "MANAGE_ADMIN_USER",
      targetAdminId: id,
      metadata: { action: "updated", changes: updateData },
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
    })

    return NextResponse.json({ user })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
