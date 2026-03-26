import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    await requireAuth()

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Merchant growth
    const merchantsByMonth = await prisma.merchant.groupBy({
      by: ["createdAt"],
      _count: true,
      where: { createdAt: { gte: new Date(now.getFullYear() - 1, now.getMonth(), 1) } },
    })

    // Platform totals
    const [totalVolume, totalTransactions, totalMerchants, totalAgents, totalCustomers] = await Promise.all([
      prisma.transaction.aggregate({ _sum: { amount: true }, where: { status: "COMPLETED" } }),
      prisma.transaction.count(),
      prisma.merchant.count(),
      prisma.agent.count(),
      prisma.customer.count(),
    ])

    // Transaction volume by day (last 30 days)
    const recentTransactions = await prisma.transaction.findMany({
      where: { createdAt: { gte: thirtyDaysAgo }, status: "COMPLETED" },
      select: { amount: true, createdAt: true },
    })

    // Group by day
    const volumeByDay: Record<string, number> = {}
    recentTransactions.forEach((tx) => {
      const day = tx.createdAt.toISOString().split("T")[0]
      volumeByDay[day] = (volumeByDay[day] || 0) + Number(tx.amount)
    })

    // Agent stats (no invocation/revenue tracking in current schema)
    const agentStats = { totalInvocations: 0, totalRevenue: 0 }

    // Status distribution
    const statusDist = await prisma.merchant.groupBy({
      by: ["status"],
      _count: true,
    })

    return NextResponse.json({
      totals: {
        volume: totalVolume._sum.amount || 0,
        transactions: totalTransactions,
        merchants: totalMerchants,
        agents: totalAgents,
        customers: totalCustomers,
      },
      volumeByDay: Object.entries(volumeByDay).map(([date, amount]) => ({ date, amount })).sort((a, b) => a.date.localeCompare(b.date)),
      agentStats: {
        totalInvocations: agentStats.totalInvocations,
        totalRevenue: agentStats.totalRevenue,
      },
      merchantStatusDistribution: statusDist.map((s) => ({ status: s.status, count: s._count })),
    })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
