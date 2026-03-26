"use client"

import { useEffect, useState, useCallback } from "react"
import {
  DataTable,
  Table,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  DataTableSkeleton,
  Tag,
  Dropdown,
  Pagination,
  Button,
} from "@carbon/react"

interface AuditLog {
  id: string
  adminId: string
  action: string
  targetUserId: string | null
  targetAdminId: string | null
  ipAddress: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  admin: { name: string; email: string }
}

interface AdminOption {
  id: string
  name: string
  email: string
}

const ACTION_TAG_TYPES: Record<string, string> = {
  LOGIN: "blue",
  LOGOUT: "gray",
  LOGIN_FAILED: "red",
  MANAGE_ADMIN_USER: "purple",
  VIEW_USER_DATA: "cyan",
  MODIFY_USER_DATA: "orange",       // Carbon doesn't have orange, will use warm-gray or magenta
  MANAGE_SETTINGS: "warm-gray",
  EXPORT_DATA: "teal",
  TWO_FACTOR_SETUP: "green",
  TWO_FACTOR_VERIFY: "green",
}

const ACTION_TYPES = [
  "LOGIN", "LOGOUT", "LOGIN_FAILED", "MANAGE_ADMIN_USER",
  "VIEW_USER_DATA", "MODIFY_USER_DATA", "MANAGE_SETTINGS",
  "EXPORT_DATA", "TWO_FACTOR_SETUP", "TWO_FACTOR_VERIFY",
]

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [filterAdmin, setFilterAdmin] = useState("")
  const [filterAction, setFilterAction] = useState("")
  const [admins, setAdmins] = useState<AdminOption[]>([])
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const fetchAdmins = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users")
      if (res.ok) {
        const data = await res.json()
        setAdmins(data.users?.map((u: AdminOption) => ({ id: u.id, name: u.name, email: u.email })) || [])
      }
    } catch {
      // ignore
    }
  }, [])

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(pageSize) })
      if (filterAdmin) params.set("adminId", filterAdmin)
      if (filterAction) params.set("action", filterAction)

      const res = await fetch(`/api/admin/audit-log?${params}`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs)
        setTotalPages(data.totalPages)
        setTotal(data.total)
      }
    } catch {
      console.error("Failed to fetch audit logs")
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, filterAdmin, filterAction])

  useEffect(() => {
    fetchAdmins()
  }, [fetchAdmins])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  useEffect(() => {
    setPage(1)
  }, [filterAdmin, filterAction])

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString()
  }

  const getTarget = (log: AuditLog) => {
    if (log.targetUserId) return `User: ${log.targetUserId.slice(0, 8)}...`
    if (log.targetAdminId) return `Admin: ${log.targetAdminId.slice(0, 8)}...`
    return "-"
  }

  const formatMetadata = (metadata: Record<string, unknown> | null) => {
    if (!metadata) return "-"
    return JSON.stringify(metadata, null, 2)
  }

  const truncateMetadata = (metadata: Record<string, unknown> | null) => {
    if (!metadata) return "-"
    const str = JSON.stringify(metadata)
    if (str.length > 60) return str.slice(0, 60) + "..."
    return str
  }

  const adminDropdownItems = [
    { id: "", text: "All Admins" },
    ...admins.map((a) => ({ id: a.id, text: a.name })),
  ]

  const actionDropdownItems = [
    { id: "", text: "All Actions" },
    ...ACTION_TYPES.map((a) => ({ id: a, text: a.replace(/_/g, " ") })),
  ]

  const headers = [
    { key: "timestamp", header: "Timestamp" },
    { key: "admin", header: "Admin" },
    { key: "action", header: "Action" },
    { key: "target", header: "Target" },
    { key: "ipAddress", header: "IP Address" },
    { key: "details", header: "Details" },
  ]

  const rows = logs.map((log) => ({
    id: log.id,
    timestamp: formatDate(log.createdAt),
    admin: log.admin.name,
    adminEmail: log.admin.email,
    action: log.action,
    target: getTarget(log),
    ipAddress: log.ipAddress || "-",
    details: log.metadata,
    _rawAction: log.action,
  }))

  return (
    <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Audit Log</h1>
        <p style={{ color: "var(--cds-text-secondary)", marginTop: "0.25rem" }}>
          Track all administrator actions ({total} total entries)
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
        <div style={{ width: 200 }}>
          <Dropdown
            id="filter-admin"
            titleText=""
            label="All Admins"
            items={adminDropdownItems}
            itemToString={(item: { id: string; text: string } | null) => item?.text || ""}
            selectedItem={adminDropdownItems.find((i) => i.id === filterAdmin) || adminDropdownItems[0]}
            onChange={({ selectedItem }: { selectedItem: { id: string; text: string } | null }) => {
              setFilterAdmin(selectedItem?.id || "")
            }}
          />
        </div>
        <div style={{ width: 200 }}>
          <Dropdown
            id="filter-action"
            titleText=""
            label="All Actions"
            items={actionDropdownItems}
            itemToString={(item: { id: string; text: string } | null) => item?.text || ""}
            selectedItem={actionDropdownItems.find((i) => i.id === filterAction) || actionDropdownItems[0]}
            onChange={({ selectedItem }: { selectedItem: { id: string; text: string } | null }) => {
              setFilterAction(selectedItem?.id || "")
            }}
          />
        </div>
        {(filterAdmin || filterAction) && (
          <Button
            kind="ghost"
            size="sm"
            onClick={() => { setFilterAdmin(""); setFilterAction("") }}
            style={{ marginTop: "0.25rem" }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {loading ? (
        <DataTableSkeleton headers={headers} rowCount={10} columnCount={6} />
      ) : logs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "var(--cds-text-secondary)" }}>
          No audit logs found
        </div>
      ) : (
        <DataTable rows={rows} headers={headers}>
          {({ rows, headers, getTableProps, getHeaderProps, getRowProps }: any) => (
            <TableContainer>
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
                  {rows.map((row: any) => {
                    const rawLog = logs.find((l) => l.id === row.id)
                    return (
                      <TableRow {...getRowProps({ row })} key={row.id}>
                        {row.cells.map((cell: any) => {
                          if (cell.info.header === "action") {
                            const actionStr = String(cell.value)
                            const tagType = ACTION_TAG_TYPES[actionStr] || "gray"
                            return (
                              <TableCell key={cell.id}>
                                <Tag type={tagType as "red" | "green" | "blue" | "gray" | "cyan" | "purple" | "teal" | "warm-gray" | "magenta"}>
                                  {actionStr.replace(/_/g, " ")}
                                </Tag>
                              </TableCell>
                            )
                          }
                          if (cell.info.header === "admin") {
                            return (
                              <TableCell key={cell.id}>
                                <div>{cell.value as string}</div>
                                <div style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary)" }}>
                                  {rawLog?.admin.email}
                                </div>
                              </TableCell>
                            )
                          }
                          if (cell.info.header === "details") {
                            const metadata = rawLog?.metadata || null
                            return (
                              <TableCell key={cell.id} style={{ maxWidth: 300 }}>
                                {expandedRow === row.id ? (
                                  <div>
                                    <pre
                                      style={{
                                        fontSize: "0.75rem",
                                        background: "var(--cds-layer-02)",
                                        padding: "0.5rem",
                                        borderRadius: "0.25rem",
                                        overflow: "auto",
                                        maxHeight: 200,
                                        whiteSpace: "pre-wrap",
                                      }}
                                    >
                                      {formatMetadata(metadata)}
                                    </pre>
                                    <button
                                      style={{
                                        fontSize: "0.75rem",
                                        color: "var(--cds-link-primary)",
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        marginTop: "0.25rem",
                                      }}
                                      onClick={() => setExpandedRow(null)}
                                    >
                                      Collapse
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    style={{
                                      fontSize: "0.75rem",
                                      background: "none",
                                      border: "none",
                                      cursor: "pointer",
                                      textAlign: "left",
                                      color: "var(--cds-text-primary)",
                                    }}
                                    onClick={() => setExpandedRow(row.id)}
                                  >
                                    {truncateMetadata(metadata)}
                                  </button>
                                )}
                              </TableCell>
                            )
                          }
                          if (cell.info.header === "target" || cell.info.header === "ipAddress") {
                            return (
                              <TableCell key={cell.id} style={{ fontFamily: "monospace", fontSize: "0.875rem" }}>
                                {cell.value as string}
                              </TableCell>
                            )
                          }
                          return (
                            <TableCell key={cell.id}>
                              {cell.value as string}
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DataTable>
      )}

      {total > 0 && (
        <Pagination
          totalItems={total}
          pageSize={pageSize}
          pageSizes={[25, 50, 100]}
          page={page}
          onChange={({ page: newPage, pageSize: newPageSize }: { page: number; pageSize: number }) => {
            setPage(newPage)
            setPageSize(newPageSize)
          }}
        />
      )}
    </div>
  )
}
