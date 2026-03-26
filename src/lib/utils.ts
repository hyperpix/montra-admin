export function formatCurrency(amount: number, currency: string = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount)
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date))
}

export function formatRelativeTime(date: Date | string | null | undefined) {
  if (!date) return "unknown"
  const now = new Date()
  const d = new Date(date)
  if (isNaN(d.getTime())) return "unknown"
  const diff = now.getTime() - d.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 30) return `${days}d ago`
  return formatDate(date)
}

export function getRiskTagType(score: number): "green" | "gray" | "red" {
  if (score <= 30) return "green"
  if (score <= 60) return "gray"
  return "red"
}

export function getStatusTagType(status: string): "green" | "red" | "warm-gray" | "gray" {
  switch (status) {
    case "active": return "green"
    case "suspended": return "red"
    case "under_review": return "warm-gray"
    case "deactivated": return "gray"
    default: return "gray"
  }
}

export function getTxStatusTagType(status: string): "green" | "gray" | "red" | "blue" | "warm-gray" {
  switch (status) {
    case "completed": return "green"
    case "pending": return "gray"
    case "failed": return "red"
    case "refunded": return "blue"
    case "disputed": return "warm-gray"
    default: return "gray"
  }
}
