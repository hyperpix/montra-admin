import { NextRequest, NextResponse } from "next/server"
import { requireAuth, checkPermission, hashPassword } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logAuditAction } from "@/lib/audit"

export async function GET() {
  try {
    const session = await requireAuth()
    if (!checkPermission(session.role, ["SUPER_ADMIN"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const users = await prisma.adminUser.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, email: true, name: true, role: true, twoFactorEnabled: true,
        isActive: true, lastLoginAt: true, lastLoginIp: true, createdAt: true,
        avatarUrl: true,
      },
    })
    return NextResponse.json({ users })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    if (!checkPermission(session.role, ["SUPER_ADMIN"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const { email, name, password, role } = await request.json()
    if (!email || !name || !password || !role) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 })
    }

    const existing = await prisma.adminUser.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 })
    }

    const passwordHash = await hashPassword(password)
    const user = await prisma.adminUser.create({
      data: { email, name, passwordHash, role, createdById: session.admin_id },
    })

    await logAuditAction({
      adminId: session.admin_id,
      action: "MANAGE_ADMIN_USER",
      targetAdminId: user.id,
      metadata: { action: "created", email, role },
      ipAddress: "server",
    })

    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
