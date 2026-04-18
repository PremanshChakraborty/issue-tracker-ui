// ── Relative time formatting ──────────────────────────────────────────────────

export function relativeTime(isoTimestamp: string | null | undefined): string {
  if (!isoTimestamp) return "never";
  const now = Date.now();
  const then = new Date(isoTimestamp).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(isoTimestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Days since a timestamp ────────────────────────────────────────────────────

export function daysSince(isoTimestamp: string | null | undefined): number {
  if (!isoTimestamp) return 0;
  const diffMs = Date.now() - new Date(isoTimestamp).getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// ── Issue ref encoding for URL params ────────────────────────────────────────
// "nodejs/node#1234" → "nodejs--node--1234"  (double-dash separator to avoid conflicts)

export function encodeRef(ref: string): string {
  return ref.replace("/", "--").replace("#", "--");
}

export function decodeRef(encoded: string): string {
  const parts = encoded.split("--");
  if (parts.length < 3) return encoded;
  const num = parts[parts.length - 1];
  const repo = parts[parts.length - 2];
  const owner = parts.slice(0, parts.length - 2).join("--");
  return `${owner}/${repo}#${num}`;
}

// ── Priority color mapping ────────────────────────────────────────────────────

export function priorityColor(priority: string): string {
  switch (priority) {
    case "critical": return "var(--critical)";
    case "watching": return "var(--watching)";
    case "low":      return "var(--low)";
    default:         return "var(--text-muted)";
  }
}

export function priorityBadgeClass(priority: string): string {
  switch (priority) {
    case "critical": return "badge badge-error";
    case "watching": return "badge badge-warning";
    case "low":      return "badge badge-muted";
    default:         return "badge";
  }
}

// ── Mode label mapping ────────────────────────────────────────────────────────

export function modeLabel(mode: string): string {
  switch (mode) {
    case "awaiting_reply":   return "awaiting reply";
    case "inactivity_watch": return "inactivity watch";
    case "wip_watch":        return "wip watch";
    default:                 return mode;
  }
}

// ── Notification type label ───────────────────────────────────────────────────

export function notifTypeLabel(type: string): string {
  switch (type) {
    case "comment":       return "Comment";
    case "inactivity":    return "Inactivity";
    case "status_change": return "Status change";
    case "spike":         return "Activity spike";
    case "daily_digest":  return "Daily digest";
    default:              return type;
  }
}

export function notifTypeIcon(type: string): string {
  switch (type) {
    case "comment":       return "💬";
    case "inactivity":    return "⏰";
    case "status_change": return "🔄";
    case "spike":         return "⚡";
    case "daily_digest":  return "📋";
    default:              return "•";
  }
}

// ── isSnoozeActive ────────────────────────────────────────────────────────────

export function isSnoozeActive(snooze_until: string | null | undefined): boolean {
  if (!snooze_until) return false;
  return new Date(snooze_until).getTime() > Date.now();
}

// ── Group notifications by date ───────────────────────────────────────────────

export function groupByDate<T extends { timestamp: string }>(items: T[]): Array<{ date: string; items: T[] }> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const date = new Date(item.timestamp).toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    });
    if (!map.has(date)) map.set(date, []);
    map.get(date)!.push(item);
  }
  return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
}
