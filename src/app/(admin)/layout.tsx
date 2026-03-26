"use client"

import { Theme, Header, HeaderName, HeaderGlobalBar, HeaderGlobalAction, SideNav, SideNavItems, SideNavLink } from "@carbon/react"
import { Notification, Settings, Logout, Dashboard, Enterprise, ChartBar, UserMultiple, DocumentTasks } from "@carbon/icons-react"
import { usePathname, useRouter } from "next/navigation"
import { useState, useEffect } from "react"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [alertCount, setAlertCount] = useState(0)
  const isLoginPage = pathname === "/login"

  // Poll alert count (must be before any early return to satisfy rules of hooks)
  useEffect(() => {
    if (isLoginPage) return
    const fetchAlerts = async () => {
      try {
        const res = await fetch("/api/admin/alerts/count")
        if (res.ok) { const data = await res.json(); setAlertCount(data.count) }
      } catch {}
    }
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 30000)
    return () => clearInterval(interval)
  }, [isLoginPage])

  // Don't show shell on login page
  if (isLoginPage) {
    return <Theme theme="white">{children}</Theme>
  }

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: Dashboard },
    { label: "Merchants", href: "/merchants", icon: Enterprise },
    { label: "Alerts", href: "/alerts", icon: Notification, badge: alertCount },
    { label: "Analytics", href: "/analytics", icon: ChartBar },
    { label: "Admin Users", href: "/admin-users", icon: UserMultiple },
    { label: "Audit Log", href: "/audit-log", icon: DocumentTasks },
    { label: "Settings", href: "/settings", icon: Settings },
  ]

  return (
    <Theme theme="white">
      <Header aria-label="Montra Admin">
        <a href="/dashboard" style={{ display: "flex", alignItems: "center", height: "100%", padding: "0 1rem", textDecoration: "none" }}>
          <img src="/logo.png" alt="Montra" style={{ height: "1.5rem" }} />
        </a>
        <HeaderGlobalBar>
          <HeaderGlobalAction aria-label="Alerts" onClick={() => router.push("/alerts")}>
            <Notification size={20} />
            {alertCount > 0 && (
              <span style={{
                position: "absolute", top: 8, right: 8, width: 8, height: 8,
                borderRadius: "50%", backgroundColor: "var(--cds-support-error)"
              }} />
            )}
          </HeaderGlobalAction>
          <HeaderGlobalAction aria-label="Logout" onClick={async () => {
            await fetch("/api/admin/auth/logout", { method: "POST" })
            router.push("/login")
          }}>
            <Logout size={20} />
          </HeaderGlobalAction>
        </HeaderGlobalBar>
        <SideNav aria-label="Side navigation" expanded isFixedNav>
          <SideNavItems>
            {navItems.map((item) => (
              <SideNavLink
                key={item.href}
                renderIcon={item.icon}
                href={item.href}
                isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault()
                  router.push(item.href)
                }}
              >
                {item.label}
                {item.badge && item.badge > 0 ? ` (${item.badge})` : ""}
              </SideNavLink>
            ))}
          </SideNavItems>
        </SideNav>
      </Header>
      <main style={{ marginLeft: "16rem", marginTop: "3rem", padding: "2rem" }}>
        {children}
      </main>
    </Theme>
  )
}
