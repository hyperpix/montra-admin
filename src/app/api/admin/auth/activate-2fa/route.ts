import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createSession, verifyTOTP } from "@/lib/auth"
import { logAuditAction } from "@/lib/audit"

export async function POST(request: NextRequest) {
  try {
    const { adminId, code } = await request.json()
    const admin = await prisma.adminUser.findUnique({ where: { id: adminId } })
    if (!admin || !admin.twoFactorSecret) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const valid = verifyTOTP(admin.twoFactorSecret, code)
    if (!valid) {
      return NextResponse.json({ error: "Invalid code. Please try again." }, { status: 401 })
    }

    const ip = request.headers.get("x-forwarded-for") || "unknown"
    await prisma.adminUser.update({
      where: { id: adminId },
      data: {
        twoFactorEnabled: true,
        lastLoginAt: new Date(),
        lastLoginIp: ip,
      },
    })

    await logAuditAction({ adminId: admin.id, action: "LOGIN", ipAddress: ip })

    const token = createSession(admin.id, admin.email, admin.role)
    const response = NextResponse.json({ success: true })
    response.cookies.set("admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 3600,
      path: "/",
    })
    return response
  } catch (error) {
    console.error("Activate 2FA error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
