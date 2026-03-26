import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST() {
  try {
    const now = new Date()
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const alertsCreated: string[] = []

    const merchants = await prisma.merchant.findMany({
      where: { status: "active" },
      select: { id: true, businessName: true, setupCompletedSteps: true, lastActiveAt: true, createdAt: true },
    })

    for (const merchant of merchants) {
      // Check for duplicate alerts
      async function hasRecentAlert(type: string) {
        const existing = await prisma.merchantAlert.findFirst({
          where: {
            merchantId: merchant.id,
            type: type as any,
            createdAt: { gte: twentyFourHoursAgo },
          },
        })
        return !!existing
      }

      // HIGH_CHARGEBACK_RATE
      const totalTx = await prisma.transaction.count({
        where: { merchantId: merchant.id, createdAt: { gte: thirtyDaysAgo } },
      })
      const disputedTx = await prisma.transaction.count({
        where: { merchantId: merchant.id, status: "disputed", createdAt: { gte: thirtyDaysAgo } },
      })
      if (totalTx > 0 && (disputedTx / totalTx) > 0.01) {
        if (!(await hasRecentAlert("HIGH_CHARGEBACK_RATE"))) {
          await prisma.merchantAlert.create({
            data: {
              merchantId: merchant.id,
              type: "HIGH_CHARGEBACK_RATE",
              severity: "CRITICAL",
              title: `High chargeback rate for ${merchant.businessName}`,
              description: `Dispute rate is ${((disputedTx / totalTx) * 100).toFixed(2)}% (${disputedTx}/${totalTx}) in the last 30 days`,
              metadata: { disputeRate: disputedTx / totalTx, disputedCount: disputedTx, totalCount: totalTx },
            },
          })
          alertsCreated.push("HIGH_CHARGEBACK_RATE")
        }
      }

      // DORMANT_ACCOUNT
      if (merchant.lastActiveAt && merchant.lastActiveAt < thirtyDaysAgo) {
        if (!(await hasRecentAlert("DORMANT_ACCOUNT"))) {
          await prisma.merchantAlert.create({
            data: {
              merchantId: merchant.id,
              type: "DORMANT_ACCOUNT",
              severity: "LOW",
              title: `Dormant account: ${merchant.businessName}`,
              description: `Merchant hasn't been active for 30+ days`,
              metadata: { lastActive: merchant.lastActiveAt },
            },
          })
          alertsCreated.push("DORMANT_ACCOUNT")
        }
      }

      // KYC_INCOMPLETE — setupCompletedSteps is Int[], compare length against expected total (5)
      const totalExpectedSteps = 5
      const completedCount = (merchant.setupCompletedSteps || []).length
      if (completedCount < totalExpectedSteps && merchant.createdAt < sevenDaysAgo) {
        if (!(await hasRecentAlert("KYC_INCOMPLETE"))) {
          await prisma.merchantAlert.create({
            data: {
              merchantId: merchant.id,
              type: "KYC_INCOMPLETE",
              severity: "MEDIUM",
              title: `Incomplete onboarding: ${merchant.businessName}`,
              description: `Merchant has completed ${completedCount}/${totalExpectedSteps} steps after 7+ days`,
              metadata: { completedSteps: completedCount, totalSteps: totalExpectedSteps },
            },
          })
          alertsCreated.push("KYC_INCOMPLETE")
        }
      }

      // FAILED_WEBHOOKS — skipped: webhookEndpoint model has no failedCount field
    }

    return NextResponse.json({ success: true, alertsCreated: alertsCreated.length })
  } catch (error) {
    console.error("Cron error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
