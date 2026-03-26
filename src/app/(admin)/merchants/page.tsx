"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
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
  Search,
  Dropdown,
  Pagination,
  OverflowMenu,
  OverflowMenuItem,
} from "@carbon/react"
import { formatCurrency, formatRelativeTime, getStatusTagType, getRiskTagType } from "@/lib/utils"

interface Merchant {
  id: string
  businessName: string | null
  email: string | null
  status: string
  totalVolume: number | string
  _count?: { transactions?: number; agents?: number }
  transactionCount?: number
  agentCount?: number
  riskScore: number | null
  lastActiveAt: string | null
  createdAt: string
}

interface MerchantsResponse {
  merchants: Merchant[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const STATUS_OPTIONS = [
  { id: "all", text: "All Statuses" },
  { id: "active", text: "Active" },
  { id: "suspended", text: "Suspended" },
  { id: "under_review", text: "Under Review" },
  { id: "deactivated", text: "Deactivated" },
]

const tableHeaders = [
  { key: "businessName", header: "Business Name" },
  { key: "email", header: "Email" },
  { key: "status", header: "Status" },
  { key: "volume", header: "Volume" },
  { key: "transactions", header: "Transactions" },
  { key: "agents", header: "Agents" },
  { key: "riskScore", header: "Risk Score" },
  { key: "lastActive", header: "Last Active" },
  { key: "created", header: "Created" },
  { key: "actions", header: "" },
]

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-"
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function MerchantsPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 25

  const fetchMerchants = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy: "createdAt",
        sortOrder: "desc",
      })
      if (search) params.set("search", search)
      if (status && status !== "all") params.set("status", status)

      const res = await fetch(`/api/admin/merchants?${params}`)
      if (!res.ok) throw new Error("Failed to fetch")
      const data: MerchantsResponse = await res.json()
      setMerchants(data.merchants)
      setTotalPages(data.totalPages)
      setTotal(data.total)
    } catch {
      console.error("Failed to fetch merchants")
    } finally {
      setLoading(false)
    }
  }, [page, search, status])

  useEffect(() => {
    fetchMerchants()
  }, [fetchMerchants])

  useEffect(() => {
    setPage(1)
  }, [search, status])

  const handleSuspend = async (id: string) => {
    const reason = prompt("Enter suspension reason:")
    if (!reason) return
    try {
      const res = await fetch(`/api/admin/merchants/${id}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      })
      if (res.ok) fetchMerchants()
    } catch {
      console.error("Failed to suspend merchant")
    }
  }

  const handleActivate = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/merchants/${id}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (res.ok) fetchMerchants()
    } catch {
      console.error("Failed to activate merchant")
    }
  }

  const tableRows = merchants.map((merchant) => ({
    id: merchant.id,
    businessName: merchant.businessName || "Unnamed",
    email: merchant.email || "N/A",
    status: merchant.status,
    volume: formatCurrency(parseFloat(String(merchant.totalVolume ?? 0))),
    transactions: (merchant._count?.transactions ?? merchant.transactionCount ?? 0).toLocaleString(),
    agents: String(merchant._count?.agents ?? merchant.agentCount ?? 0),
    riskScore: merchant.riskScore,
    lastActive: formatDate(merchant.lastActiveAt),
    created: formatDate(merchant.createdAt),
    actions: "",
  }))

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Merchants</h1>
        <p style={{ color: "var(--cds-text-secondary)", marginTop: "0.25rem" }}>
          Manage and monitor merchant accounts
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: "1rem" }}>
        <div style={{ flex: 1, maxWidth: 400 }}>
          <Search
            labelText="Search merchants"
            placeholder="Search by name, email, or ID..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            size="md"
          />
        </div>
        <div style={{ width: 200 }}>
          <Dropdown
            id="status-filter"
            titleText=""
            label="All Statuses"
            items={STATUS_OPTIONS}
            itemToString={(item: { id: string; text: string } | null) => item?.text || ""}
            selectedItem={STATUS_OPTIONS.find((opt) => opt.id === status) || STATUS_OPTIONS[0]}
            onChange={({ selectedItem }: { selectedItem: { id: string; text: string } | null }) => {
              setStatus(selectedItem?.id || "all")
            }}
            size="md"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <DataTableSkeleton
          columnCount={10}
          rowCount={10}
          showHeader={false}
          showToolbar={false}
        />
      ) : (
        <DataTable rows={tableRows} headers={tableHeaders} isSortable={false}>
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
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={headers.length}
                      style={{ textAlign: "center", padding: "3rem 0", color: "var(--cds-text-helper)" }}
                    >
                      No merchants found
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row: any) => {
                    const merchant = merchants.find((m) => m.id === row.id)
                    return (
                      <TableRow {...getRowProps({ row })} key={row.id}>
                        {row.cells.map((cell: any) => {
                          if (cell.info.header === "businessName") {
                            return (
                              <TableCell key={cell.id}>
                                <Link
                                  href={`/merchants/${row.id}`}
                                  style={{ color: "var(--cds-link-primary)", fontWeight: 500 }}
                                >
                                  {cell.value}
                                </Link>
                              </TableCell>
                            )
                          }
                          if (cell.info.header === "status") {
                            return (
                              <TableCell key={cell.id}>
                                <Tag type={getStatusTagType(cell.value)} size="sm">
                                  {cell.value.replace("_", " ")}
                                </Tag>
                              </TableCell>
                            )
                          }
                          if (cell.info.header === "riskScore") {
                            const score = cell.value as number | null
                            return (
                              <TableCell key={cell.id}>
                                {score !== null && score !== undefined ? (
                                  <Tag type={getRiskTagType(score)} size="sm">
                                    {score}
                                  </Tag>
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                            )
                          }
                          if (cell.info.header === "actions") {
                            return (
                              <TableCell key={cell.id}>
                                <OverflowMenu size="sm" flipped>
                                  <OverflowMenuItem
                                    itemText="View"
                                    onClick={() => {
                                      window.location.href = `/merchants/${row.id}`
                                    }}
                                  />
                                  {merchant?.status === "active" ? (
                                    <OverflowMenuItem
                                      itemText="Suspend"
                                      isDelete
                                      onClick={() => handleSuspend(row.id)}
                                    />
                                  ) : (
                                    <OverflowMenuItem
                                      itemText="Activate"
                                      onClick={() => handleActivate(row.id)}
                                    />
                                  )}
                                  <OverflowMenuItem itemText="Export" />
                                </OverflowMenu>
                              </TableCell>
                            )
                          }
                          return <TableCell key={cell.id}>{cell.value}</TableCell>
                        })}
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          )}
        </DataTable>
      )}

      {/* Pagination */}
      {!loading && total > 0 && (
        <Pagination
          totalItems={total}
          pageSize={limit}
          pageSizes={[25, 50, 100]}
          page={page}
          onChange={({ page: newPage }: { page: number; pageSize: number }) => {
            setPage(newPage)
          }}
        />
      )}
    </div>
  )
}
