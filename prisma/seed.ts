import { PrismaClient, AlertType, AlertSeverity } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  // -------------------------------------------------------------------------
  // 1. Create SUPER_ADMIN user (skip if already exists)
  // -------------------------------------------------------------------------
  const email = process.env.ADMIN_INITIAL_EMAIL || "admin@montra.fi"
  const password = process.env.ADMIN_INITIAL_PASSWORD || "ChangeMe123!"

  const existing = await prisma.adminUser.findUnique({ where: { email } })
  if (existing) {
    console.log("Admin user already exists:", email)
  } else {
    const passwordHash = await bcrypt.hash(password, 12)
    const admin = await prisma.adminUser.create({
      data: {
        email,
        passwordHash,
        name: "Super Admin",
        role: "SUPER_ADMIN",
      },
    })
    console.log("Created SUPER_ADMIN:", admin.email)
    console.log("Login with this email and set up 2FA on first login.")
  }

  // -------------------------------------------------------------------------
  // 2. Create sample alerts (only if merchants already exist in the DB)
  // -------------------------------------------------------------------------
  const merchantCount = await prisma.merchant.count()
  if (merchantCount === 0) {
    console.log("No merchants found in DB — skipping alert seeding.")
    return
  }

  const alertCount = await prisma.merchantAlert.count()
  if (alertCount > 0) {
    console.log("Alerts already exist — skipping alert seeding.")
    return
  }

  // Grab up to 3 merchants to attach sample alerts to
  const merchants = await prisma.merchant.findMany({ take: 3 })

  const alertsData = [
    {
      merchantId: merchants[0].id,
      type: "HIGH_CHARGEBACK_RATE" as AlertType,
      severity: "CRITICAL" as AlertSeverity,
      title: `High chargeback rate for ${merchants[0].businessName || "merchant"}`,
      description: "Dispute rate is 5.2% in the last 30 days",
      metadata: { disputeRate: 0.052 },
    },
    ...(merchants[1]
      ? [
          {
            merchantId: merchants[1].id,
            type: "UNUSUAL_VOLUME_SPIKE" as AlertType,
            severity: "HIGH" as AlertSeverity,
            title: `Unusual volume spike for ${merchants[1].businessName || "merchant"}`,
            description: "Transaction volume is 4x the 30-day average",
            metadata: { multiplier: 4 },
          },
        ]
      : []),
    ...(merchants[2]
      ? [
          {
            merchantId: merchants[2].id,
            type: "KYC_INCOMPLETE" as AlertType,
            severity: "MEDIUM" as AlertSeverity,
            title: `Incomplete onboarding: ${merchants[2].businessName || "merchant"}`,
            description: "Merchant has not completed all setup steps after 7+ days",
            metadata: {},
          },
        ]
      : []),
  ]

  await prisma.merchantAlert.createMany({ data: alertsData })
  console.log(`Seeded ${alertsData.length} sample alerts.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
