import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { logAuditAction } from "@/lib/audit"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (session) {
      await logAuditAction({
        adminId: session.admin_id,
        action: "LOGOUT",
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      })
    }

    const response = NextResponse.json({ success: true })
    response.cookies.delete("admin_session")
    return response
  } catch {
    const response = NextResponse.json({ success: true })
    response.cookies.delete("admin_session")
    return response
  }
}
