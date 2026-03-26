import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    await requireAuth()

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(todayStart)
    weekStart.setDate(weekStart.getDate() - 7)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [
      totalMerchants,
      activeMerchants,
      suspendedMerchants,
      underReviewMerchants,
      todayTransactions,
      todayVolume,
      weekVolume,
      monthVolume,
      totalAgents,
      openAlerts,
      criticalAlerts,
      highAlerts,
      recentAlerts,
      recentMerchants,
    ] = await Promise.all([
      prisma.merchant.count(),
      prisma.merchant.count({ where: { status: "active" } }),
      prisma.merchant.count({ where: { status: "suspended" } }),
      prisma.merchant.count({ where: { status: "under_review" } }),
      prisma.transaction.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { createdAt: { gte: todayStart }, status: "completed" },
      }),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { createdAt: { gte: weekStart }, status: "completed" },
      }),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { createdAt: { gte: monthStart }, status: "completed" },
      }),
      prisma.agent.count({ where: { status: "active" } }),
      prisma.merchantAlert.count({ where: { status: "OPEN" } }),
      prisma.merchantAlert.count({ where: { status: "OPEN", severity: "CRITICAL" } }),
      prisma.merchantAlert.count({ where: { status: "OPEN", severity: "HIGH" } }),
      prisma.merchantAlert.findMany({
        where: { status: "OPEN" },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { merchant: { select: { businessName: true } } },
      }),
      prisma.merchant.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, businessName: true, email: true, status: true, createdAt: true },
      }),
    ])

    // Successful transactions today
    const successfulToday = await prisma.transaction.count({
      where: { createdAt: { gte: todayStart }, status: "completed" },
    })
    const successRate = todayTransactions > 0 ? Math.round((successfulToday / todayTransactions) * 100) : 0

    // Top merchants by volume
    const topMerchants = await prisma.transaction.groupBy({
      by: ["merchantId"],
      _sum: { amount: true },
      where: { status: "completed" },
      orderBy: { _sum: { amount: "desc" } },
      take: 10,
    })

    const topMerchantDetails = await Promise.all(
      topMerchants.map(async (m) => {
        const merchant = await prisma.merchant.findUnique({
          where: { id: m.merchantId },
          select: { businessName: true },
        })
        return { name: merchant?.businessName || "Unknown", volume: m._sum.amount || 0 }
      })
    )

    // High dispute rate merchants (riskScore may be null for some merchants)
    const disputeMerchants = await prisma.merchant.findMany({
      where: { riskScore: { not: null, gte: 60 } },
      orderBy: { riskScore: "desc" },
      take: 5,
      select: { id: true, businessName: true, riskScore: true },
    })

    return NextResponse.json({
      merchants: {
        total: totalMerchants,
        active: activeMerchants,
        suspended: suspendedMerchants,
        underReview: underReviewMerchants,
      },
      volume: {
        today: todayVolume._sum.amount || 0,
        week: weekVolume._sum.amount || 0,
        month: monthVolume._sum.amount || 0,
      },
      transactions: {
        today: todayTransactions,
        successRate,
      },
      agents: { total: totalAgents },
      alerts: {
        open: openAlerts,
        critical: criticalAlerts,
        high: highAlerts,
      },
      recentAlerts,
      recentMerchants,
      topMerchants: topMerchantDetails,
      disputeMerchants,
    })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Dashboard error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
