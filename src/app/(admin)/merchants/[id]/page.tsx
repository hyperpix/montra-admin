"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Button,
  Tag,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Tile,
  ProgressBar,
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  Pagination,
  TextInput,
  NumberInput,
  Dropdown,
  TextArea,
  Modal,
  Loading,
  Link,
} from "@carbon/react"
import {
  ArrowLeft,
  Save,
  StopOutline,
  Checkmark,
  WarningAlt,
} from "@carbon/icons-react"
import {
  formatCurrency,
  formatDate,
  formatRelativeTime,
  getRiskTagType,
  getStatusTagType,
  getTxStatusTagType,
} from "@/lib/utils"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Merchant {
  id: string
  businessName: string | null
  email: string | null
  phone: string | null
  address: string | null
  industry: string | null
  website: string | null
  status: string
  riskScore: number | null
  adminNotes: string | null
  posthog_distinct_id: string | null
  totalVolume: number | string
  avgTicket: number | string
  disputeRate: number
  refundRate: number
  setupCompletedSteps: number[] | null
  onboarding?: {
    completedSteps: number
    totalSteps: number
  }
  statusHistory: Array<{
    status: string
    changedAt: string
    changedBy: string
    reason: string | null
  }>
  createdAt: string
  updatedAt: string
}

interface Transaction {
  id: string
  amount: number | string
  currency: string
  status: string
  net: number | string | null
  fee: number | string | null
  type: string | null
  customerEmail: string | null
  paymentMethod: string | null
  createdAt: string
}

interface Agent {
  id: string
  name: string
  endpointUrl: string
  x402PriceUsd: number | string
  status: string
  createdAt: string
}

interface ActivityLog {
  id: string
  timestamp: string
  admin: string
  action: string
  details: string | null
  ipAddress: string | null
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MerchantDetailPage() {
  const params = useParams()
  const router = useRouter()
  const merchantId = params.id as string

  // Core state
  const [merchant, setMerchant] = useState<Merchant | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Transactions state
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [txPage, setTxPage] = useState(1)
  const [txTotal, setTxTotal] = useState(0)
  const [txLoading, setTxLoading] = useState(false)

  // Agents state
  const [agents, setAgents] = useState<Agent[]>([])
  const [agentsLoading, setAgentsLoading] = useState(false)

  // Activity state
  const [activity, setActivity] = useState<ActivityLog[]>([])
  const [actPage, setActPage] = useState(1)
  const [actTotal, setActTotal] = useState(0)
  const [actLoading, setActLoading] = useState(false)

  // Settings form state
  const [formData, setFormData] = useState({
    businessName: "",
    email: "",
    phone: "",
    riskScore: 0,
    adminNotes: "",
    status: "",
  })
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  // Suspend / Activate modal
  const [actionModalOpen, setActionModalOpen] = useState(false)
  const [actionType, setActionType] = useState<"suspend" | "activate">("suspend")
  const [actionReason, setActionReason] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  const PER_PAGE = 20

  // ---------------------------------------------------------------------------
  // Fetch merchant
  // ---------------------------------------------------------------------------

  const fetchMerchant = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/merchants/${merchantId}`)
      if (!res.ok) throw new Error("Failed to fetch merchant")
      const data = await res.json()
      const merged = { ...data.merchant, ...data.stats }
      setMerchant(merged)
      setFormData({
        businessName: merged.businessName || "",
        email: merged.email || "",
        phone: merged.phone || "",
        riskScore: merged.riskScore ?? 0,
        adminNotes: merged.adminNotes || "",
        status: merged.status || "",
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [merchantId])

  useEffect(() => {
    fetchMerchant()
  }, [fetchMerchant])

  // ---------------------------------------------------------------------------
  // Fetch transactions
  // ---------------------------------------------------------------------------

  const fetchTransactions = useCallback(
    async (page: number) => {
      try {
        setTxLoading(true)
        const res = await fetch(
          `/api/admin/merchants/${merchantId}/transactions?page=${page}&limit=${PER_PAGE}`
        )
        if (!res.ok) throw new Error("Failed to fetch transactions")
        const data = await res.json()
        setTransactions(data.transactions || data.data || [])
        setTxTotal(data.total ?? 0)
      } catch {
        // silently handle
      } finally {
        setTxLoading(false)
      }
    },
    [merchantId]
  )

  // ---------------------------------------------------------------------------
  // Fetch agents
  // ---------------------------------------------------------------------------

  const fetchAgents = useCallback(async () => {
    try {
      setAgentsLoading(true)
      const res = await fetch(`/api/admin/merchants/${merchantId}/agents`)
      if (!res.ok) throw new Error("Failed to fetch agents")
      const data = await res.json()
      setAgents(data.agents || data.data || [])
    } catch {
      // silently handle
    } finally {
      setAgentsLoading(false)
    }
  }, [merchantId])

  // ---------------------------------------------------------------------------
  // Fetch activity
  // ---------------------------------------------------------------------------

  const fetchActivity = useCallback(
    async (page: number) => {
      try {
        setActLoading(true)
        const res = await fetch(
          `/api/admin/merchants/${merchantId}/activity?page=${page}&limit=${PER_PAGE}`
        )
        if (!res.ok) throw new Error("Failed to fetch activity")
        const data = await res.json()
        setActivity(data.logs || data.data || [])
        setActTotal(data.total ?? 0)
      } catch {
        // silently handle
      } finally {
        setActLoading(false)
      }
    },
    [merchantId]
  )

  // ---------------------------------------------------------------------------
  // Tab change handler — lazy load data
  // ---------------------------------------------------------------------------

  const handleTabChange = (evt: { selectedIndex: number }) => {
    const tabNames = ["overview", "transactions", "agents", "heatmaps", "activity", "settings"]
    const value = tabNames[evt.selectedIndex]
    if (value === "transactions" && transactions.length === 0) {
      fetchTransactions(txPage)
    }
    if (value === "agents" && agents.length === 0) {
      fetchAgents()
    }
    if (value === "activity" && activity.length === 0) {
      fetchActivity(actPage)
    }
  }

  // ---------------------------------------------------------------------------
  // Save settings
  // ---------------------------------------------------------------------------

  const handleSave = async () => {
    try {
      setSaving(true)
      setSaveMessage(null)
      const res = await fetch(`/api/admin/merchants/${merchantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error("Failed to save")
      setSaveMessage("Saved successfully")
      await fetchMerchant()
      setTimeout(() => setSaveMessage(null), 3000)
    } catch {
      setSaveMessage("Failed to save changes")
    } finally {
      setSaving(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Suspend / Activate action
  // ---------------------------------------------------------------------------

  const handleAction = async () => {
    try {
      setActionLoading(true)
      const endpoint =
        actionType === "suspend"
          ? `/api/admin/merchants/${merchantId}/suspend`
          : `/api/admin/merchants/${merchantId}/activate`
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: actionReason }),
      })
      if (!res.ok) throw new Error(`Failed to ${actionType}`)
      setActionModalOpen(false)
      setActionReason("")
      await fetchMerchant()
    } catch {
      // silently handle
    } finally {
      setActionLoading(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Loading / Error states
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "24rem" }}>
        <Loading withOverlay={false} small />
      </div>
    )
  }

  if (error || !merchant) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "24rem", gap: "1rem" }}>
        <WarningAlt size={48} />
        <p>{error || "Merchant not found"}</p>
        <Button kind="secondary" onClick={() => router.push("/merchants")}>
          Back to Merchants
        </Button>
      </div>
    )
  }

  const txTotalPages = Math.ceil(txTotal / PER_PAGE)
  const actTotalPages = Math.ceil(actTotal / PER_PAGE)
  const onboardingCompleted = merchant.setupCompletedSteps
    ? merchant.setupCompletedSteps.length
    : merchant.onboarding?.completedSteps ?? 0
  const onboardingTotal = merchant.onboarding?.totalSteps ?? 5
  const onboardingPercent = onboardingTotal > 0
    ? Math.round((onboardingCompleted / onboardingTotal) * 100)
    : 0

  // ---------------------------------------------------------------------------
  // DataTable helpers
  // ---------------------------------------------------------------------------

  const txHeaders = [
    { key: "id", header: "ID" },
    { key: "amount", header: "Amount" },
    { key: "status", header: "Status" },
    { key: "customerEmail", header: "Customer Email" },
    { key: "paymentMethod", header: "Payment Method" },
    { key: "createdAt", header: "Date" },
  ]

  const txRows = transactions.map((tx) => ({
    id: tx.id,
    amount: formatCurrency(parseFloat(String(tx.amount)), tx.currency),
    status: tx.status,
    customerEmail: tx.customerEmail || "N/A",
    paymentMethod: tx.paymentMethod || "N/A",
    createdAt: formatDate(tx.createdAt),
  }))

  const agentHeaders = [
    { key: "name", header: "Name" },
    { key: "endpointUrl", header: "Endpoint" },
    { key: "x402PriceUsd", header: "x402 Price (USD)" },
    { key: "status", header: "Status" },
    { key: "createdAt", header: "Created" },
  ]

  const agentRows = agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    endpointUrl: agent.endpointUrl,
    x402PriceUsd: `$${parseFloat(String(agent.x402PriceUsd ?? 0)).toFixed(2)}`,
    status: agent.status,
    createdAt: formatDate(agent.createdAt),
  }))

  const actHeaders = [
    { key: "timestamp", header: "Timestamp" },
    { key: "admin", header: "Admin" },
    { key: "action", header: "Action" },
    { key: "details", header: "Details" },
    { key: "ipAddress", header: "IP Address" },
  ]

  const actRows = activity.map((log) => ({
    id: log.id,
    timestamp: formatDate(log.timestamp),
    admin: log.admin,
    action: log.action,
    details: log.details || "\u2014",
    ipAddress: log.ipAddress || "\u2014",
  }))

  const statusItems = [
    { id: "active", text: "Active" },
    { id: "suspended", text: "Suspended" },
    { id: "under_review", text: "Under Review" },
    { id: "deactivated", text: "Deactivated" },
  ]

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                             */}
      {/* ------------------------------------------------------------------ */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Button
            kind="ghost"
            hasIconOnly
            renderIcon={ArrowLeft}
            iconDescription="Back"
            onClick={() => router.push("/merchants")}
          />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>
                {merchant.businessName || "Unnamed"}
              </h1>
              <Tag type={getStatusTagType(merchant.status ?? "active")} size="md">
                {(merchant.status ?? "active").replace("_", " ")}
              </Tag>
              <Tag type={getRiskTagType(merchant.riskScore ?? 0)} size="md">
                Risk: {merchant.riskScore ?? 0}
              </Tag>
            </div>
            <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)", marginTop: "0.25rem" }}>
              ID: {merchant.id} &middot; Created {formatRelativeTime(merchant.createdAt)}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {merchant.status === "active" ? (
            <Button
              kind="danger"
              size="md"
              renderIcon={StopOutline}
              onClick={() => {
                setActionType("suspend")
                setActionModalOpen(true)
              }}
            >
              Suspend
            </Button>
          ) : (
            <Button
              kind="primary"
              size="md"
              renderIcon={Checkmark}
              onClick={() => {
                setActionType("activate")
                setActionModalOpen(true)
              }}
            >
              Activate
            </Button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Suspend / Activate Modal                                           */}
      {/* ------------------------------------------------------------------ */}
      <Modal
        open={actionModalOpen}
        danger={actionType === "suspend"}
        modalHeading={actionType === "suspend" ? "Suspend Merchant" : "Activate Merchant"}
        primaryButtonText={actionLoading ? "Processing..." : actionType === "suspend" ? "Suspend" : "Activate"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={actionLoading || !actionReason.trim()}
        onRequestClose={() => {
          setActionModalOpen(false)
          setActionReason("")
        }}
        onRequestSubmit={handleAction}
        onSecondarySubmit={() => {
          setActionModalOpen(false)
          setActionReason("")
        }}
      >
        <p style={{ marginBottom: "1rem" }}>
          {actionType === "suspend"
            ? "This will immediately suspend the merchant and halt all transactions. Please provide a reason."
            : "This will reactivate the merchant account. Please provide a reason."}
        </p>
        <TextArea
          id="action-reason"
          labelText="Reason"
          placeholder="Enter reason..."
          value={actionReason}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setActionReason(e.target.value)}
        />
      </Modal>

      {/* ------------------------------------------------------------------ */}
      {/* Tabs                                                               */}
      {/* ------------------------------------------------------------------ */}
      <Tabs onChange={handleTabChange}>
        <TabList aria-label="Merchant details">
          <Tab>Overview</Tab>
          <Tab>Transactions</Tab>
          <Tab>Agents</Tab>
          <Tab>Heatmaps</Tab>
          <Tab>Activity</Tab>
          <Tab>Settings</Tab>
        </TabList>
        <TabPanels>
          {/* ============================================================== */}
          {/* OVERVIEW TAB                                                    */}
          {/* ============================================================== */}
          <TabPanel>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", paddingTop: "1rem" }}>
              {/* Stat cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                <Tile>
                  <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)" }}>Total Volume</p>
                  <p style={{ fontSize: "1.5rem", fontWeight: 600, marginTop: "0.25rem" }}>
                    {formatCurrency(parseFloat(String(merchant.totalVolume ?? 0)))}
                  </p>
                </Tile>
                <Tile>
                  <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)" }}>Avg Ticket</p>
                  <p style={{ fontSize: "1.5rem", fontWeight: 600, marginTop: "0.25rem" }}>
                    {formatCurrency(parseFloat(String(merchant.avgTicket ?? 0)))}
                  </p>
                </Tile>
                <Tile>
                  <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)" }}>Dispute Rate</p>
                  <p style={{ fontSize: "1.5rem", fontWeight: 600, marginTop: "0.25rem" }}>
                    {(merchant.disputeRate ?? 0).toFixed(2)}%
                  </p>
                </Tile>
                <Tile>
                  <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)" }}>Refund Rate</p>
                  <p style={{ fontSize: "1.5rem", fontWeight: 600, marginTop: "0.25rem" }}>
                    {(merchant.refundRate ?? 0).toFixed(2)}%
                  </p>
                </Tile>
              </div>

              {/* Business info + Onboarding */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "1.5rem" }}>
                {/* Business info */}
                <Tile>
                  <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>Business Information</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {[
                      { label: "Business Name", value: merchant.businessName || "Unnamed" },
                      { label: "Email", value: merchant.email || "N/A" },
                      { label: "Phone", value: merchant.phone || "N/A" },
                      { label: "Address", value: merchant.address || "N/A" },
                      { label: "Industry", value: merchant.industry || "N/A" },
                    ].map((item) => (
                      <div key={item.label}>
                        <p style={{ fontSize: "0.75rem", color: "var(--cds-text-helper)" }}>{item.label}</p>
                        <p style={{ fontSize: "0.875rem" }}>{item.value}</p>
                      </div>
                    ))}
                    <div>
                      <p style={{ fontSize: "0.75rem", color: "var(--cds-text-helper)" }}>Website</p>
                      {merchant.website ? (
                        <Link href={merchant.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.875rem" }}>
                          {merchant.website}
                        </Link>
                      ) : (
                        <p style={{ fontSize: "0.875rem" }}>N/A</p>
                      )}
                    </div>
                  </div>
                </Tile>

                {/* Onboarding + Status History */}
                <Tile>
                  <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>Onboarding Progress</h3>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                    <span style={{ color: "var(--cds-text-secondary)" }}>
                      {onboardingCompleted} / {onboardingTotal} steps completed
                    </span>
                    <span style={{ fontWeight: 500 }}>{onboardingPercent}%</span>
                  </div>
                  <ProgressBar
                    value={onboardingPercent}
                    max={100}
                    label=""
                    hideLabel
                    size="small"
                  />

                  {/* Status history timeline */}
                  <div style={{ marginTop: "1.5rem" }}>
                    <h4 style={{ fontSize: "0.875rem", fontWeight: 500, marginBottom: "0.75rem" }}>Status History</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      {merchant.statusHistory && merchant.statusHistory.length > 0 ? (
                        merchant.statusHistory.map((entry, i) => (
                          <div
                            key={i}
                            style={{
                              paddingLeft: "1rem",
                              borderLeft: "2px solid var(--cds-border-subtle)",
                              position: "relative",
                            }}
                          >
                            <div
                              style={{
                                position: "absolute",
                                left: "-5px",
                                top: "6px",
                                width: "8px",
                                height: "8px",
                                borderRadius: "50%",
                                backgroundColor: "var(--cds-text-helper)",
                              }}
                            />
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                              <Tag type={getStatusTagType(entry.status)} size="sm">
                                {entry.status.replace("_", " ")}
                              </Tag>
                              <span style={{ fontSize: "0.75rem", color: "var(--cds-text-helper)" }}>
                                {formatRelativeTime(entry.changedAt)}
                              </span>
                            </div>
                            <p style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary)", marginTop: "0.25rem" }}>
                              by {entry.changedBy}
                              {entry.reason && ` \u2014 ${entry.reason}`}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p style={{ fontSize: "0.875rem", color: "var(--cds-text-helper)" }}>No status history available</p>
                      )}
                    </div>
                  </div>
                </Tile>
              </div>

              {/* Admin notes (read-only on overview) */}
              <Tile>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Admin Notes</h3>
                {merchant.adminNotes ? (
                  <p style={{ fontSize: "0.875rem", whiteSpace: "pre-wrap" }}>{merchant.adminNotes}</p>
                ) : (
                  <p style={{ fontSize: "0.875rem", color: "var(--cds-text-helper)", fontStyle: "italic" }}>
                    No admin notes yet. Add notes from the Settings tab.
                  </p>
                )}
              </Tile>
            </div>
          </TabPanel>

          {/* ============================================================== */}
          {/* TRANSACTIONS TAB                                                */}
          {/* ============================================================== */}
          <TabPanel>
            <div style={{ paddingTop: "1rem" }}>
              {txLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0" }}>
                  <Loading withOverlay={false} small />
                </div>
              ) : transactions.length === 0 ? (
                <Tile>
                  <p style={{ textAlign: "center", color: "var(--cds-text-helper)", padding: "3rem 0" }}>No transactions found</p>
                </Tile>
              ) : (
                <>
                  <DataTable rows={txRows} headers={txHeaders} isSortable>
                    {({ rows, headers, getTableProps, getHeaderProps, getRowProps }: any) => (
                      <Table {...getTableProps()}>
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
                                  {cell.info.header === "id" ? (
                                    <span style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
                                      {String(cell.value).substring(0, 8)}
                                    </span>
                                  ) : cell.info.header === "status" ? (
                                    <Tag type={getTxStatusTagType(cell.value)} size="sm">
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
                  {txTotalPages > 1 && (
                    <Pagination
                      totalItems={txTotal}
                      pageSize={PER_PAGE}
                      pageSizes={[PER_PAGE]}
                      page={txPage}
                      onChange={({ page }: { page: number }) => {
                        setTxPage(page)
                        fetchTransactions(page)
                      }}
                    />
                  )}
                </>
              )}
            </div>
          </TabPanel>

          {/* ============================================================== */}
          {/* AGENTS TAB                                                      */}
          {/* ============================================================== */}
          <TabPanel>
            <div style={{ paddingTop: "1rem" }}>
              {agentsLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0" }}>
                  <Loading withOverlay={false} small />
                </div>
              ) : agents.length === 0 ? (
                <Tile>
                  <p style={{ textAlign: "center", color: "var(--cds-text-helper)", padding: "3rem 0" }}>No agents found</p>
                </Tile>
              ) : (
                <DataTable rows={agentRows} headers={agentHeaders} isSortable>
                  {({ rows, headers, getTableProps, getHeaderProps, getRowProps }: any) => (
                    <Table {...getTableProps()}>
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
                                {cell.info.header === "endpointUrl" ? (
                                  <span style={{ fontFamily: "monospace", fontSize: "0.75rem", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", display: "inline-block" }}>
                                    {cell.value}
                                  </span>
                                ) : cell.info.header === "status" ? (
                                  <Tag type={cell.value === "active" ? "green" : "gray"} size="sm">
                                    {cell.value === "active" ? "Active" : "Inactive"}
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
            </div>
          </TabPanel>

          {/* ============================================================== */}
          {/* HEATMAPS TAB                                                    */}
          {/* ============================================================== */}
          <TabPanel>
            <div style={{ paddingTop: "1rem" }}>
              <Tile>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>PostHog Heatmaps</h3>
                {merchant.posthog_distinct_id ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <Tile style={{ backgroundColor: "var(--cds-layer-01)" }}>
                      <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)" }}>PostHog Distinct ID</p>
                      <p style={{ fontFamily: "monospace", fontSize: "0.875rem", marginTop: "0.25rem" }}>
                        {merchant.posthog_distinct_id}
                      </p>
                    </Tile>
                    <div style={{
                      border: "2px dashed var(--cds-border-subtle)",
                      borderRadius: "4px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "5rem 1.5rem",
                    }}>
                      <p style={{ color: "var(--cds-text-secondary)", textAlign: "center" }}>PostHog heatmaps will be loaded here</p>
                      <p style={{ color: "var(--cds-text-helper)", fontSize: "0.875rem", textAlign: "center", marginTop: "0.5rem", maxWidth: "28rem" }}>
                        Configure your PostHog project URL and embed the heatmap iframe for this merchant. The distinct ID above can be used to filter session recordings and heatmap data.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    border: "2px dashed var(--cds-border-subtle)",
                    borderRadius: "4px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "5rem 1.5rem",
                  }}>
                    <p style={{ color: "var(--cds-text-secondary)", textAlign: "center" }}>PostHog heatmaps will be loaded here</p>
                    <p style={{ color: "var(--cds-text-helper)", fontSize: "0.875rem", textAlign: "center", marginTop: "0.5rem", maxWidth: "28rem" }}>
                      No PostHog distinct ID configured for this merchant. Set up PostHog integration in the merchant&apos;s dashboard to enable session recording and heatmap data.
                    </p>
                  </div>
                )}
              </Tile>
            </div>
          </TabPanel>

          {/* ============================================================== */}
          {/* ACTIVITY TAB                                                    */}
          {/* ============================================================== */}
          <TabPanel>
            <div style={{ paddingTop: "1rem" }}>
              {actLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0" }}>
                  <Loading withOverlay={false} small />
                </div>
              ) : activity.length === 0 ? (
                <Tile>
                  <p style={{ textAlign: "center", color: "var(--cds-text-helper)", padding: "3rem 0" }}>No activity logs found</p>
                </Tile>
              ) : (
                <>
                  <DataTable rows={actRows} headers={actHeaders} isSortable>
                    {({ rows, headers, getTableProps, getHeaderProps, getRowProps }: any) => (
                      <Table {...getTableProps()}>
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
                                  {cell.info.header === "action" ? (
                                    <Tag type="gray" size="sm">{cell.value}</Tag>
                                  ) : cell.info.header === "ipAddress" ? (
                                    <span style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{cell.value}</span>
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
                  {actTotalPages > 1 && (
                    <Pagination
                      totalItems={actTotal}
                      pageSize={PER_PAGE}
                      pageSizes={[PER_PAGE]}
                      page={actPage}
                      onChange={({ page }: { page: number }) => {
                        setActPage(page)
                        fetchActivity(page)
                      }}
                    />
                  )}
                </>
              )}
            </div>
          </TabPanel>

          {/* ============================================================== */}
          {/* SETTINGS TAB                                                    */}
          {/* ============================================================== */}
          <TabPanel>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", paddingTop: "1rem" }}>
              <Tile>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1.5rem" }}>Merchant Settings</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
                  <TextInput
                    id="s-businessName"
                    labelText="Business Name"
                    value={formData.businessName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, businessName: e.target.value })
                    }
                  />
                  <TextInput
                    id="s-email"
                    labelText="Email"
                    type="email"
                    value={formData.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                  <TextInput
                    id="s-phone"
                    labelText="Phone"
                    value={formData.phone}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                  <NumberInput
                    id="s-riskScore"
                    label="Risk Score (0-100)"
                    min={0}
                    max={100}
                    value={formData.riskScore}
                    onChange={(_e: any, { value }: any) =>
                      setFormData({ ...formData, riskScore: value })
                    }
                  />
                </div>

                <div style={{ marginTop: "1.5rem", maxWidth: "16rem" }}>
                  <Dropdown
                    id="s-status"
                    titleText="Status"
                    label="Select status"
                    items={statusItems}
                    itemToString={(item: { id: string; text: string } | null) => item?.text ?? ""}
                    selectedItem={statusItems.find((s) => s.id === formData.status) || null}
                    onChange={({ selectedItem }: { selectedItem: { id: string; text: string } | null }) => {
                      if (selectedItem) {
                        setFormData({ ...formData, status: selectedItem.id })
                      }
                    }}
                  />
                </div>

                <div style={{ marginTop: "1.5rem" }} id="settings-notes">
                  <TextArea
                    id="s-notes"
                    labelText="Admin Notes"
                    rows={5}
                    value={formData.adminNotes}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setFormData({ ...formData, adminNotes: e.target.value })
                    }
                    placeholder="Add internal notes about this merchant..."
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "1.5rem" }}>
                  <Button
                    kind="primary"
                    renderIcon={Save}
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                  {saveMessage && (
                    <p style={{
                      fontSize: "0.875rem",
                      color: saveMessage.includes("success") ? "var(--cds-support-success)" : "var(--cds-support-error)",
                    }}>
                      {saveMessage}
                    </p>
                  )}
                </div>
              </Tile>

              {/* Quick actions */}
              <Tile>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>Quick Actions</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                  {merchant.status === "active" ? (
                    <Button
                      kind="danger"
                      renderIcon={StopOutline}
                      onClick={() => {
                        setActionType("suspend")
                        setActionModalOpen(true)
                      }}
                    >
                      Suspend Merchant
                    </Button>
                  ) : (
                    <Button
                      kind="primary"
                      renderIcon={Checkmark}
                      onClick={() => {
                        setActionType("activate")
                        setActionModalOpen(true)
                      }}
                    >
                      Activate Merchant
                    </Button>
                  )}
                </div>
              </Tile>
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  )
}
