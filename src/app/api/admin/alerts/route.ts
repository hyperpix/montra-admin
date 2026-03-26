import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || ""
    const severity = searchParams.get("severity") || ""
    const type = searchParams.get("type") || ""
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "25")

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (severity) where.severity = severity
    if (type) where.type = type

    const [alerts, total] = await Promise.all([
      prisma.merchantAlert.findMany({
        where: where as any,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          merchant: { select: { id: true, businessName: true } },
          acknowledgedBy: { select: { name: true } },
          resolvedBy: { select: { name: true } },
        },
      }),
      prisma.merchantAlert.count({ where: where as any }),
    ])

    return NextResponse.json({ alerts, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
