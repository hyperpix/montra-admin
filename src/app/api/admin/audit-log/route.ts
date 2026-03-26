import { NextRequest, NextResponse } from "next/server"
import { requireAuth, checkPermission } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    if (!checkPermission(session.role, ["SUPER_ADMIN", "ADMIN"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const adminId = searchParams.get("adminId") || ""
    const action = searchParams.get("action") || ""

    const where: Record<string, unknown> = {}
    if (adminId) where.adminId = adminId
    if (action) where.action = action

    const [logs, total] = await Promise.all([
      prisma.adminAuditLog.findMany({
        where: where as any,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { admin: { select: { name: true, email: true } } },
      }),
      prisma.adminAuditLog.count({ where: where as any }),
    ])

    return NextResponse.json({ logs, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
