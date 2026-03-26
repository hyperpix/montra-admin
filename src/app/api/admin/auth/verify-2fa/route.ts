import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createSession, verifyTOTP } from "@/lib/auth"
import { logAuditAction } from "@/lib/audit"

export async function POST(request: NextRequest) {
  try {
    const { adminId, code } = await request.json()

    const admin = await prisma.adminUser.findUnique({ where: { id: adminId } })
    if (!admin || !admin.twoFactorEnabled || !admin.twoFactorSecret) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const valid = verifyTOTP(admin.twoFactorSecret, code)
    if (!valid) {
      // Try backup codes
      const backupIndex = admin.twoFactorBackupCodes.indexOf(code)
      if (backupIndex === -1) {
        return NextResponse.json({ error: "Invalid code" }, { status: 401 })
      }
      // Consume backup code
      const updatedCodes = [...admin.twoFactorBackupCodes]
      updatedCodes.splice(backupIndex, 1)
      await prisma.adminUser.update({
        where: { id: adminId },
        data: { twoFactorBackupCodes: updatedCodes },
      })
    }

    const token = createSession(admin.id, admin.email, admin.role)
    const ip = request.headers.get("x-forwarded-for") || "unknown"

    await prisma.adminUser.update({
      where: { id: adminId },
      data: { lastLoginAt: new Date(), lastLoginIp: ip },
    })

    await logAuditAction({ adminId: admin.id, action: "LOGIN", ipAddress: ip })

    const response = NextResponse.json({ success: true })
    response.cookies.set("admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 3600, // 1 hour
      path: "/",
    })
    return response
  } catch (error) {
    console.error("2FA verify error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
