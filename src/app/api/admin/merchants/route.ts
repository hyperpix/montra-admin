import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "25")
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || ""
    const sortBy = searchParams.get("sortBy") || "createdAt"
    const sortOrder = searchParams.get("sortOrder") || "desc"

    const where: Record<string, unknown> = {}
    if (search) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      where.OR = [
        { businessName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        ...(uuidRegex.test(search) ? [{ id: { equals: search } }] : []),
      ]
    }
    if (status) where.status = status

    const [merchants, total] = await Promise.all([
      prisma.merchant.findMany({
        where: where as any,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: { select: { transactions: true } },
        },
      }),
      prisma.merchant.count({ where: where as any }),
    ])

    // Get volume for each merchant
    const merchantsWithVolume = await Promise.all(
      merchants.map(async (m) => {
        const [volume, agentCount] = await Promise.all([
          prisma.transaction.aggregate({
            _sum: { amount: true },
            where: { merchantId: m.id, status: "completed" },
          }),
          prisma.agent.count({ where: { merchantId: m.id } }),
        ])
        return {
          ...m,
          totalVolume: volume._sum.amount || 0,
          transactionCount: m._count.transactions,
          agentCount,
        }
      })
    )

    return NextResponse.json({
      merchants: merchantsWithVolume,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
