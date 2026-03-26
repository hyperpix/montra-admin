"use client"

import { useState, useEffect } from "react"
import {
  Tile,
  TextInput,
  PasswordInput,
  Button,
  Tag,
  InlineNotification,
  Loading,
} from "@carbon/react"

interface UserProfile {
  name: string
  email: string
  twoFactorEnabled: boolean
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Change password state
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [passwordSuccess, setPasswordSuccess] = useState("")
  const [passwordLoading, setPasswordLoading] = useState(false)

  // 2FA state
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null)
  const [showRegenConfirm, setShowRegenConfirm] = useState(false)
  const [twoFALoading, setTwoFALoading] = useState(false)

  useEffect(() => {
    fetch("/api/admin/profile")
      .then((res) => res.json())
      .then((data) => {
        setProfile(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError("")
    setPasswordSuccess("")

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.")
      return
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.")
      return
    }

    setPasswordLoading(true)
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      if (!res.ok) {
        const data = await res.json()
        setPasswordError(data.error || "Failed to change password.")
        return
      }

      setPasswordSuccess("Password changed successfully.")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch {
      setPasswordError("An unexpected error occurred.")
    } finally {
      setPasswordLoading(false)
    }
  }

  async function handleRegenerateBackupCodes() {
    setTwoFALoading(true)
    try {
      const res = await fetch("/api/admin/2fa/regenerate-backup-codes", {
        method: "POST",
      })

      if (res.ok) {
        const data = await res.json()
        setBackupCodes(data.backupCodes)
      }
    } catch {
      // handle error silently
    } finally {
      setTwoFALoading(false)
      setShowRegenConfirm(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <Loading withOverlay={false} />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: "42rem", margin: "0 auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Settings</h1>
        <p style={{ color: "var(--cds-text-secondary)", marginTop: "0.25rem" }}>
          Manage your account and security preferences
        </p>
      </div>

      {/* Account Info */}
      <Tile style={{ padding: "1.5rem" }}>
        <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.25rem" }}>
          Account Information
        </h3>
        <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)", marginBottom: "1rem" }}>
          Your account details (read-only)
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <TextInput
            id="name"
            labelText="Name"
            value={profile?.name || ""}
            readOnly
          />
          <TextInput
            id="email"
            labelText="Email"
            value={profile?.email || ""}
            readOnly
          />
        </div>
      </Tile>

      <hr style={{ border: "none", borderTop: "1px solid var(--cds-border-subtle)" }} />

      {/* Change Password */}
      <Tile style={{ padding: "1.5rem" }}>
        <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.25rem" }}>
          Change Password
        </h3>
        <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)", marginBottom: "1rem" }}>
          Update your account password
        </p>
        <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <PasswordInput
            id="current-password"
            labelText="Current Password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <PasswordInput
            id="new-password"
            labelText="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <PasswordInput
            id="confirm-password"
            labelText="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          {passwordError && (
            <InlineNotification
              kind="error"
              title=""
              subtitle={passwordError}
              hideCloseButton
              lowContrast
            />
          )}
          {passwordSuccess && (
            <InlineNotification
              kind="success"
              title=""
              subtitle={passwordSuccess}
              hideCloseButton
              lowContrast
            />
          )}

          <div>
            <Button type="submit" kind="primary" disabled={passwordLoading}>
              {passwordLoading ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </form>
      </Tile>

      <hr style={{ border: "none", borderTop: "1px solid var(--cds-border-subtle)" }} />

      {/* Two-Factor Authentication */}
      <Tile style={{ padding: "1.5rem" }}>
        <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.25rem" }}>
          Two-Factor Authentication
        </h3>
        <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)", marginBottom: "1rem" }}>
          Manage your 2FA settings and backup codes
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p>2FA Status</p>
              <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)" }}>
                {profile?.twoFactorEnabled
                  ? "Two-factor authentication is enabled"
                  : "Two-factor authentication is not enabled"}
              </p>
            </div>
            <Tag type={profile?.twoFactorEnabled ? "green" : "red"}>
              {profile?.twoFactorEnabled ? "Enabled" : "Disabled"}
            </Tag>
          </div>

          {profile?.twoFactorEnabled && (
            <>
              <hr style={{ border: "none", borderTop: "1px solid var(--cds-border-subtle)" }} />

              {!showRegenConfirm ? (
                <div>
                  <Button
                    kind="tertiary"
                    onClick={() => setShowRegenConfirm(true)}
                  >
                    Regenerate Backup Codes
                  </Button>
                </div>
              ) : (
                <div
                  style={{
                    background: "var(--cds-layer-02)",
                    border: "1px solid var(--cds-border-subtle)",
                    borderRadius: "0.5rem",
                    padding: "1rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  <p style={{ fontSize: "0.875rem", color: "var(--cds-support-warning)" }}>
                    Warning: This will invalidate all existing backup codes. Make
                    sure to save the new codes in a safe place.
                  </p>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <Button
                      kind="danger"
                      onClick={handleRegenerateBackupCodes}
                      disabled={twoFALoading}
                    >
                      {twoFALoading ? "Regenerating..." : "Confirm Regenerate"}
                    </Button>
                    <Button
                      kind="tertiary"
                      onClick={() => setShowRegenConfirm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {backupCodes && (
                <div
                  style={{
                    background: "var(--cds-layer-02)",
                    border: "1px solid var(--cds-border-subtle)",
                    borderRadius: "0.5rem",
                    padding: "1rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  <p style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                    Your new backup codes (save these securely):
                  </p>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "0.5rem",
                    }}
                  >
                    {backupCodes.map((code, i) => (
                      <code
                        key={i}
                        style={{
                          background: "var(--cds-layer-01)",
                          color: "var(--cds-support-success)",
                          padding: "0.375rem 0.75rem",
                          borderRadius: "0.25rem",
                          fontSize: "0.875rem",
                          fontFamily: "monospace",
                          textAlign: "center",
                        }}
                      >
                        {code}
                      </code>
                    ))}
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary)" }}>
                    These codes will not be shown again. Store them in a secure location.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </Tile>
    </div>
  )
}
