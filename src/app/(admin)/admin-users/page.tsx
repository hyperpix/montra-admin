"use client"

import { useEffect, useState, useCallback } from "react"
import {
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableContainer,
  Tag,
  Toggle,
  Modal,
  TextInput,
  Dropdown,
  Button,
  OverflowMenu,
  OverflowMenuItem,
  InlineLoading,
  InlineNotification,
} from "@carbon/react"
import { Add } from "@carbon/icons-react"

interface AdminUser {
  id: string
  email: string
  name: string
  role: string
  twoFactorEnabled: boolean
  isActive: boolean
  lastLoginAt: string | null
  lastLoginIp: string | null
  createdAt: string
  avatarUrl: string | null
}

const ROLE_TAG_TYPE: Record<string, "red" | "blue" | "green" | "gray"> = {
  SUPER_ADMIN: "red",
  ADMIN: "blue",
  SUPPORT: "green",
  VIEWER: "gray",
}

const ROLES = [
  { id: "SUPER_ADMIN", text: "Super Admin" },
  { id: "ADMIN", text: "Admin" },
  { id: "SUPPORT", text: "Support" },
  { id: "VIEWER", text: "Viewer" },
]

const TABLE_HEADERS = [
  { key: "name", header: "Name" },
  { key: "email", header: "Email" },
  { key: "role", header: "Role" },
  { key: "twoFactor", header: "2FA" },
  { key: "active", header: "Active" },
  { key: "lastLogin", header: "Last Login" },
  { key: "actions", header: "" },
]

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<string | null>(null)
  const [formData, setFormData] = useState({ email: "", name: "", password: "", role: "ADMIN" })
  const [submitting, setSubmitting] = useState(false)
  const [notification, setNotification] = useState<{
    kind: "success" | "error"
    title: string
  } | null>(null)

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users")
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users)
      }
    } catch {
      setNotification({ kind: "error", title: "Failed to fetch users" })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleCreate = async () => {
    setSubmitting(true)
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        setModalOpen(false)
        setFormData({ email: "", name: "", password: "", role: "ADMIN" })
        setNotification({ kind: "success", title: "Admin user created successfully" })
        fetchUsers()
      } else {
        setNotification({ kind: "error", title: "Failed to create user" })
      }
    } catch {
      setNotification({ kind: "error", title: "Failed to create user" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (id: string, data: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        fetchUsers()
        setEditingRole(null)
        setNotification({ kind: "success", title: "User updated successfully" })
      } else {
        setNotification({ kind: "error", title: "Failed to update user" })
      }
    } catch {
      setNotification({ kind: "error", title: "Failed to update user" })
    }
  }

  const handleReset2FA = async (id: string) => {
    if (!confirm("Are you sure you want to reset 2FA for this user?")) return
    try {
      const res = await fetch(`/api/admin/users/${id}/reset-2fa`, { method: "POST" })
      if (res.ok) {
        fetchUsers()
        setNotification({ kind: "success", title: "2FA reset successfully" })
      } else {
        setNotification({ kind: "error", title: "Failed to reset 2FA" })
      }
    } catch {
      setNotification({ kind: "error", title: "Failed to reset 2FA" })
    }
  }

  const formatDate = (date: string | null) => {
    if (!date) return "Never"
    return new Date(date).toLocaleString()
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "400px" }}>
        <InlineLoading description="Loading users..." />
      </div>
    )
  }

  const tableRows = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    twoFactor: user.twoFactorEnabled,
    active: user.isActive,
    lastLogin: user.lastLoginAt,
    lastLoginIp: user.lastLoginIp,
  }))

  return (
    <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Notification */}
      {notification && (
        <InlineNotification
          kind={notification.kind}
          title={notification.title}
          onCloseButtonClick={() => setNotification(null)}
          style={{ marginBottom: "0" }}
        />
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Admin Users</h1>
          <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)", marginTop: "0.25rem" }}>
            Manage administrator accounts and permissions
          </p>
        </div>
        <Button
          kind="primary"
          renderIcon={Add}
          onClick={() => setModalOpen(true)}
        >
          Add Admin
        </Button>
      </div>

      {/* Add Admin Modal */}
      <Modal
        open={modalOpen}
        onRequestClose={() => setModalOpen(false)}
        onRequestSubmit={handleCreate}
        modalHeading="Create Admin User"
        primaryButtonText={submitting ? "Creating..." : "Create Admin User"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={submitting || !formData.email || !formData.name || !formData.password}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", paddingTop: "1rem" }}>
          <TextInput
            id="admin-name"
            labelText="Name"
            placeholder="Full name"
            value={formData.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData({ ...formData, name: e.target.value })
            }
          />
          <TextInput
            id="admin-email"
            labelText="Email"
            type="email"
            placeholder="admin@example.com"
            value={formData.email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData({ ...formData, email: e.target.value })
            }
          />
          <TextInput
            id="admin-password"
            labelText="Password"
            type="password"
            placeholder="Secure password"
            value={formData.password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData({ ...formData, password: e.target.value })
            }
          />
          <Dropdown
            id="admin-role"
            titleText="Role"
            label="Select a role"
            items={ROLES}
            itemToString={(item: { id: string; text: string } | null) => item?.text || ""}
            selectedItem={ROLES.find((r) => r.id === formData.role) || ROLES[1]}
            onChange={({ selectedItem }: { selectedItem: { id: string; text: string } | null }) => {
              if (selectedItem) setFormData({ ...formData, role: selectedItem.id })
            }}
          />
        </div>
      </Modal>

      {/* Data Table */}
      <DataTable rows={tableRows} headers={TABLE_HEADERS}>
        {({
          rows,
          headers,
          getHeaderProps,
          getRowProps,
          getTableProps,
          getTableContainerProps,
        }: any) => (
          <TableContainer {...getTableContainerProps()}>
            <Table {...getTableProps()}>
              <TableHead>
                <TableRow>
                  {headers.map((header: any) => {
                    const headerProps = getHeaderProps({ header })
                    return (
                      <TableHeader key={header.key} {...headerProps}>
                        {header.header}
                      </TableHeader>
                    )
                  })}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row: any) => {
                  const user = users.find((u) => u.id === row.id)
                  if (!user) return null
                  const rowProps = getRowProps({ row })
                  return (
                    <TableRow key={row.id} {...rowProps}>
                      {row.cells.map((cell: any) => {
                        if (cell.info.header === "role") {
                          return (
                            <TableCell key={cell.id}>
                              {editingRole === user.id ? (
                                <Dropdown
                                  id={`role-edit-${user.id}`}
                                  titleText=""
                                  label="Select role"
                                  items={ROLES}
                                  itemToString={(item: { id: string; text: string } | null) =>
                                    item?.text || ""
                                  }
                                  selectedItem={ROLES.find((r) => r.id === user.role)}
                                  onChange={({
                                    selectedItem,
                                  }: {
                                    selectedItem: { id: string; text: string } | null
                                  }) => {
                                    if (selectedItem) {
                                      handleUpdate(user.id, { role: selectedItem.id })
                                    }
                                  }}
                                  size="sm"
                                />
                              ) : (
                                <Tag type={ROLE_TAG_TYPE[user.role] || "gray"}>
                                  {user.role.replace("_", " ")}
                                </Tag>
                              )}
                            </TableCell>
                          )
                        }
                        if (cell.info.header === "twoFactor") {
                          return (
                            <TableCell key={cell.id}>
                              <Tag type={user.twoFactorEnabled ? "green" : "red"} size="sm">
                                {user.twoFactorEnabled ? "Enabled" : "Disabled"}
                              </Tag>
                            </TableCell>
                          )
                        }
                        if (cell.info.header === "active") {
                          return (
                            <TableCell key={cell.id}>
                              <Toggle
                                id={`toggle-active-${user.id}`}
                                size="sm"
                                toggled={user.isActive}
                                onToggle={(checked: boolean) =>
                                  handleUpdate(user.id, { isActive: checked })
                                }
                                labelA=""
                                labelB=""
                                hideLabel
                                labelText="Active status"
                              />
                            </TableCell>
                          )
                        }
                        if (cell.info.header === "lastLogin") {
                          return (
                            <TableCell key={cell.id}>
                              <div style={{ fontSize: "0.875rem" }}>
                                {formatDate(user.lastLoginAt)}
                              </div>
                              {user.lastLoginIp && (
                                <div style={{ fontSize: "0.75rem", color: "var(--cds-text-helper)" }}>
                                  {user.lastLoginIp}
                                </div>
                              )}
                            </TableCell>
                          )
                        }
                        if (cell.info.header === "actions") {
                          return (
                            <TableCell key={cell.id} style={{ textAlign: "right" }}>
                              <OverflowMenu flipped ariaLabel="Actions">
                                <OverflowMenuItem
                                  itemText="Edit Role"
                                  onClick={() =>
                                    setEditingRole(
                                      editingRole === user.id ? null : user.id
                                    )
                                  }
                                />
                                {user.twoFactorEnabled && (
                                  <OverflowMenuItem
                                    itemText="Reset 2FA"
                                    isDelete
                                    onClick={() => handleReset2FA(user.id)}
                                  />
                                )}
                                <OverflowMenuItem
                                  itemText={user.isActive ? "Deactivate" : "Activate"}
                                  onClick={() =>
                                    handleUpdate(user.id, { isActive: !user.isActive })
                                  }
                                />
                              </OverflowMenu>
                            </TableCell>
                          )
                        }
                        return (
                          <TableCell key={cell.id}>
                            {cell.value as React.ReactNode}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  )
                })}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={TABLE_HEADERS.length}
                      style={{ textAlign: "center", padding: "2rem", color: "var(--cds-text-helper)" }}
                    >
                      No admin users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DataTable>
    </div>
  )
}
