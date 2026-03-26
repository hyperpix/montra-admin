import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await requireAuth()
    const admin = await prisma.adminUser.findUnique({
      where: { id: session.admin_id },
      select: { name: true, email: true, twoFactorEnabled: true },
    })

    if (!admin) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json(admin)
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
