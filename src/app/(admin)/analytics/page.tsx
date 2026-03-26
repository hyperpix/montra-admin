"use client"

import { useEffect, useState } from "react"
import { Tile, Loading } from "@carbon/react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts"

interface AnalyticsData {
  totals: {
    volume: number | string
    transactions: number
    merchants: number
    agents: number
    customers: number
  }
  volumeByDay: { date: string; amount: number | string }[]
  agentStats: {
    totalInvocations: number
    totalRevenue: number | string
  }
  merchantStatusDistribution: { status: string; count: number }[]
}

const STATUS_COLORS: Record<string, string> = {
  active: "var(--cds-support-success)",
  suspended: "var(--cds-support-error)",
  under_review: "var(--cds-support-caution-minor)",
  inactive: "var(--cds-text-helper)",
  deactivated: "var(--cds-text-helper)",
  onboarding: "var(--cds-interactive)",
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value)
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/analytics/overview")
      .then((res) => res.json())
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <Loading withOverlay={false} />
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ textAlign: "center", color: "var(--cds-text-secondary)", padding: "5rem 0" }}>
        Failed to load analytics data.
      </div>
    )
  }

  const statCards = [
    { label: "Total Platform Volume", value: formatCurrency(parseFloat(String(data.totals.volume ?? 0))) },
    { label: "Total Transactions", value: formatNumber(data.totals.transactions) },
    { label: "Total Merchants", value: formatNumber(data.totals.merchants) },
    { label: "Total Agents", value: formatNumber(data.totals.agents) },
    { label: "Total Customers", value: formatNumber(data.totals.customers) },
  ]

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem", padding: "1.5rem" }}>
      <div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>Platform Analytics</h1>
        <p style={{ color: "var(--cds-text-secondary)", marginTop: "0.25rem", fontSize: "0.875rem" }}>
          Overview of platform performance and growth
        </p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
        {statCards.map((card) => (
          <Tile key={card.label}>
            <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)" }}>{card.label}</p>
            <p style={{ fontSize: "1.5rem", fontWeight: 600, marginTop: "0.25rem" }}>{card.value}</p>
          </Tile>
        ))}
      </div>

      {/* Transaction Volume Chart */}
      <Tile>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>
          Transaction Volume (Last 30 Days)
        </h2>
        <div style={{ height: "350px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.volumeByDay}>
              <defs>
                <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4589ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4589ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--cds-border-subtle)" />
              <XAxis
                dataKey="date"
                tick={{ fill: "var(--cds-text-helper)", fontSize: 12 }}
                tickFormatter={(v) => {
                  const d = new Date(v)
                  return `${d.getMonth() + 1}/${d.getDate()}`
                }}
              />
              <YAxis
                tick={{ fill: "var(--cds-text-helper)", fontSize: 12 }}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e0e0e0",
                  borderRadius: "4px",
                  color: "#161616",
                }}
                formatter={(value) => [formatCurrency(parseFloat(String(value || 0))), "Volume"]}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#4589ff"
                strokeWidth={2}
                fill="url(#volumeGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Tile>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "1.5rem" }}>
        {/* Merchant Status Distribution */}
        <Tile>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>
            Merchant Status Distribution
          </h2>
          <div style={{ height: "300px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.merchantStatusDistribution}
                layout="vertical"
                margin={{ left: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--cds-border-subtle)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "var(--cds-text-helper)", fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="status"
                  tick={{ fill: "var(--cds-text-helper)", fontSize: 12 }}
                  width={120}
                  tickFormatter={(v) =>
                    v
                      .replace(/_/g, " ")
                      .toLowerCase()
                      .replace(/\b\w/g, (c: string) => c.toUpperCase())
                  }
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e0e0e0",
                    borderRadius: "4px",
                    color: "#161616",
                  }}
                  formatter={(value) => [Number(value || 0), "Merchants"]}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {data.merchantStatusDistribution.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={STATUS_COLORS[entry.status] || "var(--cds-text-helper)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginTop: "1rem" }}>
            {data.merchantStatusDistribution.map((entry) => (
              <div key={entry.status} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div
                  style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    backgroundColor: STATUS_COLORS[entry.status] || "var(--cds-text-helper)",
                  }}
                />
                <span style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)" }}>
                  {entry.status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                  {" "}({entry.count})
                </span>
              </div>
            ))}
          </div>
        </Tile>

        {/* Agent Ecosystem Stats */}
        <Tile>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>
            Agent Ecosystem
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <Tile style={{ backgroundColor: "var(--cds-layer-01)" }}>
              <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)" }}>Total Invocations</p>
              <p style={{ fontSize: "1.75rem", fontWeight: 600, marginTop: "0.25rem" }}>
                {formatNumber(data.agentStats.totalInvocations ?? 0)}
              </p>
            </Tile>
            <Tile style={{ backgroundColor: "var(--cds-layer-01)" }}>
              <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)" }}>Total Revenue</p>
              <p style={{ fontSize: "1.75rem", fontWeight: 600, marginTop: "0.25rem" }}>
                {formatCurrency(parseFloat(String(data.agentStats.totalRevenue ?? 0)))}
              </p>
            </Tile>
            <Tile style={{ backgroundColor: "var(--cds-layer-01)" }}>
              <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)" }}>Avg Revenue per Agent</p>
              <p style={{ fontSize: "1.75rem", fontWeight: 600, marginTop: "0.25rem" }}>
                {data.totals.agents > 0
                  ? formatCurrency(parseFloat(String(data.agentStats.totalRevenue ?? 0)) / data.totals.agents)
                  : "$0"}
              </p>
            </Tile>
            <Tile style={{ backgroundColor: "var(--cds-layer-01)" }}>
              <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)" }}>Avg Invocations per Agent</p>
              <p style={{ fontSize: "1.75rem", fontWeight: 600, marginTop: "0.25rem" }}>
                {data.totals.agents > 0
                  ? formatNumber(
                      Math.round((data.agentStats.totalInvocations ?? 0) / data.totals.agents)
                    )
                  : "0"}
              </p>
            </Tile>
          </div>
        </Tile>
      </div>
    </div>
  )
}
