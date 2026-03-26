import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyPassword } from "@/lib/auth"
import { logAuditAction } from "@/lib/audit"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 })
    }

    const admin = await prisma.adminUser.findUnique({ where: { email } })

    if (!admin || !admin.isActive) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const valid = await verifyPassword(password, admin.passwordHash)
    if (!valid) {
      await logAuditAction({
        adminId: admin.id,
        action: "FAILED_LOGIN",
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      })
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // Check if 2FA is set up
    if (!admin.twoFactorEnabled) {
      return NextResponse.json({
        adminId: admin.id,
        requireSetup2FA: true,
      })
    }

    return NextResponse.json({
      adminId: admin.id,
      requireSetup2FA: false,
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
