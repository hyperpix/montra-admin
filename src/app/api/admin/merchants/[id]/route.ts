import { NextRequest, NextResponse } from "next/server"
import { requireAuth, checkPermission } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logAuditAction } from "@/lib/audit"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    const { id } = await params

    const merchant = await prisma.merchant.findUnique({
      where: { id },
      include: {
        _count: { select: { transactions: true, customers: true } },
        statusHistory: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { changedBy: { select: { name: true } } },
        },
      },
    })

    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 })
    }

    // Query agent count separately (agents FK references users, not merchants)
    const agentCount = await prisma.agent.count({ where: { merchantId: id } })

    // Get volume stats
    const [totalVolume, avgTicket, todayVolume] = await Promise.all([
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { merchantId: id, status: "completed" },
      }),
      prisma.transaction.aggregate({
        _avg: { amount: true },
        where: { merchantId: id, status: "completed" },
      }),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          merchantId: id,
          status: "completed",
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ])

    const disputeCount = await prisma.transaction.count({
      where: { merchantId: id, status: "disputed" },
    })
    const refundCount = await prisma.transaction.count({
      where: { merchantId: id, status: "refunded" },
    })
    const totalTx = await prisma.transaction.count({ where: { merchantId: id } })
    const disputeRate = totalTx > 0 ? (disputeCount / totalTx) * 100 : 0
    const refundRate = totalTx > 0 ? (refundCount / totalTx) * 100 : 0

    await logAuditAction({
      adminId: session.admin_id,
      action: "VIEW_MERCHANT",
      targetMerchantId: id,
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
    })

    const statusHistory = (merchant.statusHistory ?? []).map((h) => ({
      status: h.newStatus,
      changedAt: h.createdAt.toISOString(),
      changedBy: h.changedBy?.name ?? "Unknown",
      reason: h.reason ?? null,
    }))

    return NextResponse.json({
      merchant: { ...merchant, statusHistory },
      stats: {
        totalVolume: totalVolume._sum.amount || 0,
        avgTicket: avgTicket._avg.amount || 0,
        todayVolume: todayVolume._sum.amount || 0,
        disputeRate: Math.round(disputeRate * 100) / 100,
        refundRate: Math.round(refundRate * 100) / 100,
        transactionCount: merchant._count.transactions,
        agentCount,
        customerCount: merchant._count.customers,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    if (!checkPermission(session.role, ["SUPER_ADMIN", "ADMIN"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const { id } = await params
    const body = await request.json()

    const allowedFields = ["businessName", "email", "phone", "adminNotes", "riskScore"]
    const updateData: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) updateData[field] = body[field]
    }

    const merchant = await prisma.merchant.update({
      where: { id },
      data: updateData as any,
    })

    await logAuditAction({
      adminId: session.admin_id,
      action: "EDIT_MERCHANT",
      targetMerchantId: id,
      metadata: { changes: updateData },
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
    })

    return NextResponse.json({ merchant })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
