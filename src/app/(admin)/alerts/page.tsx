"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import {
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Tag,
  Button,
  Dropdown,
  Tile,
  Pagination,
  Loading,
} from "@carbon/react"
import {
  WarningAlt,
  InformationFilled,
  InformationSquare,
  Renew,
  CheckmarkFilled,
} from "@carbon/icons-react"
import { formatRelativeTime } from "@/lib/utils"

interface Alert {
  id: string
  type: string
  severity: string
  status: string
  title: string
  description: string
  createdAt: string
  merchant: { id: string; businessName: string }
  acknowledgedBy?: { name: string } | null
  resolvedBy?: { name: string } | null
}

interface AlertsResponse {
  alerts: Alert[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const ALERT_TYPES = [
  { id: "", text: "All Types" },
  { id: "HIGH_CHARGEBACK_RATE", text: "High Chargeback Rate" },
  { id: "DORMANT_ACCOUNT", text: "Dormant Account" },
  { id: "KYC_INCOMPLETE", text: "KYC Incomplete" },
  { id: "FAILED_WEBHOOKS", text: "Failed Webhooks" },
  { id: "UNUSUAL_ACTIVITY", text: "Unusual Activity" },
  { id: "COMPLIANCE_VIOLATION", text: "Compliance Violation" },
]

const STATUS_TABS = ["", "OPEN", "ACKNOWLEDGED", "RESOLVED", "DISMISSED"]
const STATUS_TAB_LABELS = ["All", "Open", "Acknowledged", "Resolved", "Dismissed"]

const SEVERITY_OPTIONS = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const

function severityTagType(severity: string): "red" | "magenta" | "warm-gray" | "blue" | "gray" {
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

function statusTagType(status: string): "red" | "warm-gray" | "green" | "gray" {
  switch (status) {
    case "OPEN":
      return "red"
    case "ACKNOWLEDGED":
      return "warm-gray"
    case "RESOLVED":
      return "green"
    case "DISMISSED":
      return "gray"
    default:
      return "gray"
  }
}

function SeverityIcon({ severity }: { severity: string }) {
  switch (severity) {
    case "CRITICAL":
      return <WarningAlt size={20} style={{ fill: "var(--cds-support-error)" }} />
    case "HIGH":
      return <WarningAlt size={20} style={{ fill: "var(--cds-support-warning)" }} />
    case "MEDIUM":
      return <InformationFilled size={20} style={{ fill: "var(--cds-support-caution-minor)" }} />
    case "LOW":
      return <InformationSquare size={20} style={{ fill: "var(--cds-support-info)" }} />
    default:
      return <InformationSquare size={20} style={{ fill: "var(--cds-border-strong)" }} />
  }
}

function formatType(type: string) {
  return type
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ")
}

export default function AlertsPage() {
  const [data, setData] = useState<AlertsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("")
  const [severityFilter, setSeverityFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [page, setPage] = useState(1)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const fetchAlerts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set("status", statusFilter)
      if (severityFilter) params.set("severity", severityFilter)
      if (typeFilter) params.set("type", typeFilter)
      params.set("page", page.toString())
      params.set("limit", "25")

      const res = await fetch(`/api/admin/alerts?${params.toString()}`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [statusFilter, severityFilter, typeFilter, page])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  async function updateAlert(id: string, status: string) {
    setUpdatingId(id)
    try {
      const res = await fetch(`/api/admin/alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        fetchAlerts()
      }
    } catch {
      // ignore
    } finally {
      setUpdatingId(null)
    }
  }

  const selectedTabIndex = STATUS_TABS.indexOf(statusFilter)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Alerts</h1>
          <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)", marginTop: "0.25rem" }}>
            Monitor and manage merchant alerts
            {data && ` \u00b7 ${data.total} total`}
          </p>
        </div>
        <Button
          kind="tertiary"
          size="sm"
          renderIcon={Renew}
          onClick={() => fetchAlerts()}
        >
          Refresh
        </Button>
      </div>

      {/* Status Tabs */}
      <Tabs
        selectedIndex={selectedTabIndex >= 0 ? selectedTabIndex : 0}
        onChange={({ selectedIndex }: { selectedIndex: number }) => {
          setStatusFilter(STATUS_TABS[selectedIndex])
          setPage(1)
        }}
      >
        <TabList aria-label="Alert status filters">
          {STATUS_TAB_LABELS.map((label) => (
            <Tab key={label}>{label}</Tab>
          ))}
        </TabList>
        <TabPanels>
          {STATUS_TAB_LABELS.map((label) => (
            <TabPanel key={label}>
              {/* Content rendered below outside TabPanels */}
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>

      {/* Filters Row */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        {/* Severity filter buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)" }}>Severity:</span>
          <Button
            kind={severityFilter === "" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => {
              setSeverityFilter("")
              setPage(1)
            }}
          >
            All
          </Button>
          {SEVERITY_OPTIONS.map((sev) => (
            <Button
              key={sev}
              kind={severityFilter === sev ? "secondary" : "ghost"}
              size="sm"
              onClick={() => {
                setSeverityFilter(severityFilter === sev ? "" : sev)
                setPage(1)
              }}
            >
              {sev.charAt(0) + sev.slice(1).toLowerCase()}
            </Button>
          ))}
        </div>

        {/* Type filter */}
        <div style={{ width: "220px" }}>
          <Dropdown
            id="type-filter"
            titleText=""
            label="All Types"
            items={ALERT_TYPES}
            itemToString={(item: { id: string; text: string } | null) => item?.text || ""}
            selectedItem={ALERT_TYPES.find((t) => t.id === typeFilter) || ALERT_TYPES[0]}
            onChange={({ selectedItem }: { selectedItem: { id: string; text: string } | null }) => {
              setTypeFilter(selectedItem?.id || "")
              setPage(1)
            }}
            size="sm"
          />
        </div>
      </div>

      {/* Alert Cards */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0" }}>
          <Loading description="Loading alerts..." withOverlay={false} />
        </div>
      ) : !data || data.alerts.length === 0 ? (
        <Tile style={{ textAlign: "center", padding: "3rem" }}>
          <CheckmarkFilled size={48} style={{ fill: "var(--cds-support-success)", marginBottom: "1rem" }} />
          <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.25rem" }}>
            No alerts found
          </h3>
          <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)" }}>
            {statusFilter || severityFilter || typeFilter
              ? "Try adjusting your filters"
              : "Everything looks good!"}
          </p>
        </Tile>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {data.alerts.map((alert) => (
            <Tile
              key={alert.id}
              style={{
                borderLeft: alert.status === "OPEN" ? "3px solid var(--cds-support-error)" : undefined,
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
                {/* Severity icon */}
                <div style={{ flexShrink: 0, marginTop: "2px" }}>
                  <SeverityIcon severity={alert.severity} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      flexWrap: "wrap",
                      marginBottom: "0.25rem",
                    }}
                  >
                    <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                      {alert.title}
                    </span>
                    <Tag type={severityTagType(alert.severity)} size="sm">
                      {alert.severity}
                    </Tag>
                    <Tag type={statusTagType(alert.status)} size="sm">
                      {alert.status.charAt(0) + alert.status.slice(1).toLowerCase()}
                    </Tag>
                    <Tag type="gray" size="sm">
                      {formatType(alert.type)}
                    </Tag>
                  </div>
                  <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)", marginBottom: "0.5rem" }}>
                    {alert.description}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      fontSize: "0.75rem",
                      color: "var(--cds-text-helper)",
                    }}
                  >
                    <Link
                      href={`/merchants/${alert.merchant.id}`}
                      style={{ color: "var(--cds-interactive)", textDecoration: "none" }}
                    >
                      {alert.merchant.businessName}
                    </Link>
                    <span>{formatRelativeTime(alert.createdAt)}</span>
                    {alert.acknowledgedBy && (
                      <span>Acknowledged by {alert.acknowledgedBy.name}</span>
                    )}
                    {alert.resolvedBy && (
                      <span>Resolved by {alert.resolvedBy.name}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                  {alert.status === "OPEN" && (
                    <>
                      <Button
                        kind="tertiary"
                        size="sm"
                        disabled={updatingId === alert.id}
                        onClick={() => updateAlert(alert.id, "ACKNOWLEDGED")}
                      >
                        Acknowledge
                      </Button>
                      <Button
                        kind="tertiary"
                        size="sm"
                        disabled={updatingId === alert.id}
                        onClick={() => updateAlert(alert.id, "RESOLVED")}
                      >
                        Resolve
                      </Button>
                      <Button
                        kind="ghost"
                        size="sm"
                        disabled={updatingId === alert.id}
                        onClick={() => updateAlert(alert.id, "DISMISSED")}
                      >
                        Dismiss
                      </Button>
                    </>
                  )}
                  {alert.status === "ACKNOWLEDGED" && (
                    <>
                      <Button
                        kind="tertiary"
                        size="sm"
                        disabled={updatingId === alert.id}
                        onClick={() => updateAlert(alert.id, "RESOLVED")}
                      >
                        Resolve
                      </Button>
                      <Button
                        kind="ghost"
                        size="sm"
                        disabled={updatingId === alert.id}
                        onClick={() => updateAlert(alert.id, "DISMISSED")}
                      >
                        Dismiss
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Tile>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <Pagination
          totalItems={data.total}
          pageSize={data.limit}
          pageSizes={[25]}
          page={data.page}
          onChange={({ page: newPage }: { page: number }) => setPage(newPage)}
        />
      )}
    </div>
  )
}
