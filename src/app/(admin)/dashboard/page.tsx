"use client"

import { useEffect, useState } from "react"
import {
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  DataTableSkeleton,
  Tag,
  Tile,
  InlineNotification,
} from "@carbon/react"
import { StatCard } from "@/components/admin/stat-card"
import { formatCurrency, formatRelativeTime, getStatusTagType, getRiskTagType } from "@/lib/utils"

interface DashboardData {
  merchants: {
    total: number
    active: number
    suspended: number
    underReview: number
  }
  volume: {
    today: number
    week: number
    month: number
  }
  transactions: {
    today: number
    successRate: number
  }
  agents: { total: number }
  alerts: {
    open: number
    critical: number
    high: number
  }
  recentAlerts: Array<{
    id: string
    title: string
    severity: string
    createdAt: string
    merchant: { businessName: string }
  }>
  recentMerchants: Array<{
    id: string
    businessName: string | null
    email: string | null
    status: string
    createdAt: string
  }>
  topMerchants: Array<{
    name: string
    volume: number
  }>
  disputeMerchants: Array<{
    id: string
    businessName: string | null
    riskScore: number | null
  }>
}

function getSeverityTagType(severity: string): "red" | "magenta" | "warm-gray" | "blue" | "gray" {
  switch (severity) {
    case "CRITICAL":
      return "red"
    case "HIGH":
      return "magenta"
    case "MEDIUM":
      return "warm-gray"
    case "LOW":
      return "blue"
    default:
      return "gray"
  }
}

const alertHeaders = [
  { key: "severity", header: "Severity" },
  { key: "title", header: "Title" },
  { key: "merchant", header: "Merchant" },
  { key: "time", header: "Time" },
]

const merchantHeaders = [
  { key: "business", header: "Business" },
  { key: "email", header: "Email" },
  { key: "status", header: "Status" },
  { key: "joined", header: "Joined" },
]

const riskHeaders = [
  { key: "business", header: "Business" },
  { key: "riskScore", header: "Risk Score" },
]

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/admin/dashboard/overview")
        if (!res.ok) {
          throw new Error(`Failed to fetch dashboard data: ${res.status}`)
        }
        const json = await res.json()
        setData(json)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Dashboard</h1>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "1rem" }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Tile key={i} style={{ height: 120 }} />
          ))}
        </div>
        <DataTableSkeleton columnCount={4} rowCount={5} showHeader={false} showToolbar={false} />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>Dashboard</h1>
        <InlineNotification
          kind="error"
          title="Failed to load dashboard"
          subtitle={error}
          lowContrast
          hideCloseButton
        />
      </div>
    )
  }

  if (!data) return null

  const alertRows = data.recentAlerts.map((alert) => ({
    id: alert.id,
    severity: alert.severity,
    title: alert.title,
    merchant: alert.merchant.businessName,
    time: formatRelativeTime(alert.createdAt),
  }))

  const merchantRows = data.recentMerchants.map((merchant) => ({
    id: merchant.id,
    business: merchant.businessName || "Unnamed",
    email: merchant.email || "N/A",
    status: merchant.status,
    joined: formatRelativeTime(merchant.createdAt),
  }))

  const riskRows = data.disputeMerchants.map((merchant) => ({
    id: merchant.id,
    business: merchant.businessName || "Unnamed",
    riskScore: merchant.riskScore ?? 0,
  }))

  return (
    <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Dashboard</h1>

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "1rem" }}>
        <StatCard
          title="Total Merchants"
          value={data.merchants.total}
          description={`${data.merchants.active} active, ${data.merchants.suspended} suspended`}
        />
        <StatCard
          title="Gross Volume"
          value={formatCurrency(data.volume.today)}
          description={`Week: ${formatCurrency(data.volume.week)}`}
        />
        <StatCard
          title="Transactions Today"
          value={data.transactions.today}
          description={`${data.transactions.successRate}% success rate`}
        />
        <StatCard
          title="Active Agents"
          value={data.agents.total}
        />
        <StatCard
          title="Open Alerts"
          value={data.alerts.open}
          description={`${data.alerts.critical} critical, ${data.alerts.high} high`}
        />
      </div>

      {/* Tables Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        {/* Recent Alerts */}
        <Tile style={{ padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>
            Recent Alerts
          </h2>
          {data.recentAlerts.length === 0 ? (
            <p style={{ fontSize: "0.875rem", color: "var(--cds-text-helper)" }}>No open alerts</p>
          ) : (
            <DataTable rows={alertRows} headers={alertHeaders} isSortable={false}>
              {({ rows, headers, getTableProps, getHeaderProps, getRowProps }: any) => (
                <Table {...getTableProps()} size="md">
                  <TableHead>
                    <TableRow>
                      {headers.map((header: any) => (
                        <TableHeader {...getHeaderProps({ header })} key={header.key}>
                          {header.header}
                        </TableHeader>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row: any) => (
                      <TableRow {...getRowProps({ row })} key={row.id}>
                        {row.cells.map((cell: any) => (
                          <TableCell key={cell.id}>
                            {cell.info.header === "severity" ? (
                              <Tag type={getSeverityTagType(cell.value)} size="sm">
                                {cell.value}
                              </Tag>
                            ) : (
                              cell.value
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </DataTable>
          )}
        </Tile>

        {/* Recently Onboarded Merchants */}
        <Tile style={{ padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>
            Recently Onboarded
          </h2>
          {data.recentMerchants.length === 0 ? (
            <p style={{ fontSize: "0.875rem", color: "var(--cds-text-helper)" }}>
              No recent merchants
            </p>
          ) : (
            <DataTable rows={merchantRows} headers={merchantHeaders} isSortable={false}>
              {({ rows, headers, getTableProps, getHeaderProps, getRowProps }: any) => (
                <Table {...getTableProps()} size="md">
                  <TableHead>
                    <TableRow>
                      {headers.map((header: any) => (
                        <TableHeader {...getHeaderProps({ header })} key={header.key}>
                          {header.header}
                        </TableHeader>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row: any) => (
                      <TableRow {...getRowProps({ row })} key={row.id}>
                        {row.cells.map((cell: any) => (
                          <TableCell key={cell.id}>
                            {cell.info.header === "status" ? (
                              <Tag type={getStatusTagType(cell.value)} size="sm">
                                {cell.value.replace("_", " ")}
                              </Tag>
                            ) : (
                              cell.value
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </DataTable>
          )}
        </Tile>

        {/* Top Merchants by Volume */}
        <Tile style={{ padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>
            Top Merchants by Volume
          </h2>
          {data.topMerchants.length === 0 ? (
            <p style={{ fontSize: "0.875rem", color: "var(--cds-text-helper)" }}>
              No transaction data
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {data.topMerchants.map((merchant, idx) => {
                const maxVolume = data.topMerchants[0]?.volume || 1
                const pct = Math.round((merchant.volume / maxVolume) * 100)
                return (
                  <div key={idx}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: "0.875rem",
                        marginBottom: "0.25rem",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 500,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: 200,
                        }}
                      >
                        {merchant.name}
                      </span>
                      <span style={{ color: "var(--cds-text-secondary)" }}>
                        {formatCurrency(merchant.volume)}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 8,
                        borderRadius: 4,
                        background: "var(--cds-layer-02)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          borderRadius: 4,
                          width: `${pct}%`,
                          background: "var(--cds-interactive)",
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Tile>

        {/* High Risk Merchants */}
        <Tile style={{ padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>
            High Risk Merchants
          </h2>
          {data.disputeMerchants.length === 0 ? (
            <p style={{ fontSize: "0.875rem", color: "var(--cds-text-helper)" }}>
              No high risk merchants
            </p>
          ) : (
            <DataTable rows={riskRows} headers={riskHeaders} isSortable={false}>
              {({ rows, headers, getTableProps, getHeaderProps, getRowProps }: any) => (
                <Table {...getTableProps()} size="md">
                  <TableHead>
                    <TableRow>
                      {headers.map((header: any) => (
                        <TableHeader {...getHeaderProps({ header })} key={header.key}>
                          {header.header}
                        </TableHeader>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row: any) => (
                      <TableRow {...getRowProps({ row })} key={row.id}>
                        {row.cells.map((cell: any) => (
                          <TableCell key={cell.id}>
                            {cell.info.header === "riskScore" ? (
                              <Tag type={getRiskTagType(cell.value)} size="sm">
                                {cell.value}
                              </Tag>
                            ) : (
                              cell.value
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </DataTable>
          )}
        </Tile>
      </div>
    </div>
  )
}
