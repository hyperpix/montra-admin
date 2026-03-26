"use client"

import { Tile } from "@carbon/react"

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  trend?: { value: number; isPositive: boolean }
}

export function StatCard({ title, value, description, trend }: StatCardProps) {
  return (
    <Tile style={{ padding: "1.5rem" }}>
      <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)", marginBottom: "0.25rem" }}>{title}</p>
      <p style={{ fontSize: "1.75rem", fontWeight: 600 }}>{value}</p>
      {description && <p style={{ fontSize: "0.75rem", color: "var(--cds-text-helper)", marginTop: "0.25rem" }}>{description}</p>}
      {trend && (
        <p style={{ fontSize: "0.75rem", fontWeight: 500, marginTop: "0.25rem", color: trend.isPositive ? "var(--cds-support-success)" : "var(--cds-support-error)" }}>
          {trend.isPositive ? "+" : ""}{trend.value}%
        </p>
      )}
    </Tile>
  )
}
