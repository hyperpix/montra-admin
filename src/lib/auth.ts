import jwt from "jsonwebtoken"
import { cookies } from "next/headers"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"
import * as OTPAuth from "otpauth"
import type { AdminRole } from "@prisma/client"

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-me"
const COOKIE_NAME = "admin_session"

export interface AdminSession {
  admin_id: string
  email: string
  role: AdminRole
  iat: number
  exp: number
}

export function createSession(adminId: string, email: string, role: AdminRole): string {
  return jwt.sign({ admin_id: adminId, email, role }, JWT_SECRET, { expiresIn: "1h" })
}

export async function getSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AdminSession
    return payload
  } catch {
    return null
  }
}

export async function requireAuth(): Promise<AdminSession> {
  const session = await getSession()
  if (!session) throw new Error("Unauthorized")
  const admin = await prisma.adminUser.findUnique({ where: { id: session.admin_id } })
  if (!admin || !admin.isActive) throw new Error("Unauthorized")
  return session
}

export function checkPermission(role: AdminRole, requiredRoles: AdminRole[]): boolean {
  return requiredRoles.includes(role)
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateTOTP(email: string): { secret: string; uri: string } {
  const totp = new OTPAuth.TOTP({
    issuer: "Montra Admin",
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  })
  return { secret: totp.secret.base32, uri: totp.toString() }
}

export function verifyTOTP(secret: string, token: string): boolean {
  const totp = new OTPAuth.TOTP({
    issuer: "Montra Admin",
    label: "admin",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  })
  const delta = totp.validate({ token, window: 1 })
  return delta !== null
}

export function generateBackupCodes(): string[] {
  const codes: string[] = []
  for (let i = 0; i < 10; i++) {
    const code = Array.from({ length: 8 }, () =>
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Math.floor(Math.random() * 36)]
    ).join("")
    codes.push(code)
  }
  return codes
}

export const ROLE_PERMISSIONS: Record<string, AdminRole[]> = {
  viewMerchants: ["SUPER_ADMIN", "ADMIN", "SUPPORT", "VIEWER"],
  viewTransactions: ["SUPER_ADMIN", "ADMIN", "SUPPORT", "VIEWER"],
  viewHeatmaps: ["SUPER_ADMIN", "ADMIN", "SUPPORT", "VIEWER"],
  suspendMerchant: ["SUPER_ADMIN", "ADMIN"],
  editMerchant: ["SUPER_ADMIN", "ADMIN"],
  viewSensitiveFields: ["SUPER_ADMIN"],
  manageAdminUsers: ["SUPER_ADMIN"],
  viewAuditLogs: ["SUPER_ADMIN", "ADMIN"],
  exportData: ["SUPER_ADMIN", "ADMIN", "SUPPORT"],
  manageAlerts: ["SUPER_ADMIN", "ADMIN", "SUPPORT"],
}
