"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Tile,
  TextInput,
  Button,
  InlineLoading,
  InlineNotification,
} from "@carbon/react"

export default function AdminLoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<"credentials" | "2fa" | "setup-2fa">("credentials")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [totpCode, setTotpCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [adminId, setAdminId] = useState("")
  const [qrCodeUri, setQrCodeUri] = useState("")
  const [backupCodes, setBackupCodes] = useState<string[]>([])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setAdminId(data.adminId)
      if (data.requireSetup2FA) {
        const setupRes = await fetch("/api/admin/auth/setup-2fa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adminId: data.adminId }),
        })
        const setupData = await setupRes.json()
        setQrCodeUri(setupData.qrCodeDataUrl)
        setBackupCodes(setupData.backupCodes)
        setStep("setup-2fa")
      } else {
        setStep("2fa")
      }
    } catch {
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify2FA(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/admin/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId, code: totpCode }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      router.push("/dashboard")
      router.refresh()
    } catch {
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  async function handleActivate2FA(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/admin/auth/activate-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId, code: totpCode }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      router.push("/dashboard")
      router.refresh()
    } catch {
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--cds-background)",
      }}
    >
      <Tile style={{ width: "100%", maxWidth: "28rem", padding: "2rem" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <img src="/logo.png" alt="Montra" style={{ height: "2rem", marginBottom: "0.5rem" }} />
          <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)" }}>
            {step === "credentials" && "Sign in to the admin panel"}
            {step === "2fa" && "Enter your 2FA code"}
            {step === "setup-2fa" && "Set up two-factor authentication"}
          </p>
        </div>

        {error && (
          <div style={{ marginBottom: "1rem" }}>
            <InlineNotification
              kind="error"
              title=""
              subtitle={error}
              hideCloseButton
              lowContrast
            />
          </div>
        )}

        {step === "credentials" && (
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <TextInput
              id="email"
              type="email"
              labelText="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder=""
              required
            />
            <TextInput
              id="password"
              type="password"
              labelText="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" kind="primary" disabled={loading} style={{ width: "100%" }}>
              {loading ? <InlineLoading description="Signing in..." /> : "Sign In"}
            </Button>
          </form>
        )}

        {step === "2fa" && (
          <form onSubmit={handleVerify2FA} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <TextInput
              id="totp"
              labelText="Authentication Code"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              placeholder="000000"
              maxLength={6}
              required
              autoFocus
              style={{ textAlign: "center", fontSize: "1.5rem", letterSpacing: "0.25em" }}
            />
            <Button type="submit" kind="primary" disabled={loading} style={{ width: "100%" }}>
              {loading ? <InlineLoading description="Verifying..." /> : "Verify"}
            </Button>
            <Button
              kind="ghost"
              size="sm"
              onClick={() => setStep("credentials")}
              style={{ width: "100%" }}
            >
              Back to login
            </Button>
          </form>
        )}

        {step === "setup-2fa" && (
          <form onSubmit={handleActivate2FA} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)", marginBottom: "0.75rem" }}>
                Scan this QR code with your authenticator app
              </p>
              {qrCodeUri && (
                <img
                  src={qrCodeUri}
                  alt="2FA QR Code"
                  style={{ margin: "0 auto 1rem", borderRadius: "0.5rem" }}
                />
              )}
            </div>
            {backupCodes.length > 0 && (
              <div
                style={{
                  background: "var(--cds-layer-02)",
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                }}
              >
                <p style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary)", marginBottom: "0.5rem", fontWeight: 500 }}>
                  Backup codes (save these!):
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0.25rem",
                  }}
                >
                  {backupCodes.map((code) => (
                    <code
                      key={code}
                      style={{
                        fontSize: "0.75rem",
                        fontFamily: "monospace",
                        color: "var(--cds-text-primary)",
                      }}
                    >
                      {code}
                    </code>
                  ))}
                </div>
              </div>
            )}
            <TextInput
              id="setup-totp"
              labelText="Enter code from authenticator"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              placeholder="000000"
              maxLength={6}
              required
              style={{ textAlign: "center", fontSize: "1.5rem", letterSpacing: "0.25em" }}
            />
            <Button type="submit" kind="primary" disabled={loading} style={{ width: "100%" }}>
              {loading ? <InlineLoading description="Activating..." /> : "Activate 2FA & Sign In"}
            </Button>
          </form>
        )}
      </Tile>
    </div>
  )
}
