import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateTOTP, generateBackupCodes } from "@/lib/auth"
import QRCode from "qrcode"

export async function POST(request: NextRequest) {
  try {
    const { adminId } = await request.json()
    const admin = await prisma.adminUser.findUnique({ where: { id: adminId } })
    if (!admin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 })
    }

    const { secret, uri } = generateTOTP(admin.email)
    const backupCodes = generateBackupCodes()
    const qrCodeDataUrl = await QRCode.toDataURL(uri)

    // Store secret temporarily (will be confirmed on activate)
    await prisma.adminUser.update({
      where: { id: adminId },
      data: {
        twoFactorSecret: secret,
        twoFactorBackupCodes: backupCodes,
      },
    })

    return NextResponse.json({ qrCodeDataUrl, backupCodes })
  } catch (error) {
    console.error("Setup 2FA error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
