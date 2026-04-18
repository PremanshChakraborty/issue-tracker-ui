"use client";

import type { Notification } from "@/types";
import { relativeTime, notifTypeIcon, notifTypeLabel } from "@/lib/utils";

interface Props {
  notification: Notification;
}

const TYPE_COLORS: Record<string, string> = {
  comment:      "var(--accent)",
  inactivity:   "var(--watching)",
  status_change:"var(--border-default)",
  spike:        "var(--critical)",
  daily_digest: "var(--success)",
};

const DELIVERED_LABEL: Record<string, { text: string; color: string }> = {
  telegram:      { text: "Telegram ✓", color: "var(--success)" },
  undelivered:   { text: "Undelivered", color: "var(--critical)" },
  frontend_only: { text: "UI only", color: "var(--text-muted)" },
};

export default function NotificationCard({ notification: n }: Props) {
  const borderColor = TYPE_COLORS[n.type] ?? "var(--border-default)";
  const delivered = DELIVERED_LABEL[n.delivered_to] ?? { text: n.delivered_to, color: "var(--text-muted)" };

  return (
    <div
      className="glass"
      style={{
        padding: "var(--space-4)",
        borderLeft: `3px solid ${borderColor}`,
        display: "flex",
        gap: "var(--space-4)",
      }}
    >
      {/* Icon */}
      <div style={{ fontSize: "var(--text-lg)", flexShrink: 0, lineHeight: 1.4 }}>
        {notifTypeIcon(n.type)}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Top row */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap", marginBottom: "var(--space-1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
            <span style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: borderColor, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {notifTypeLabel(n.type)}
            </span>
            {n.payload.actor && (
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                by <strong style={{ color: "var(--text-secondary)" }}>@{n.payload.actor}</strong>
              </span>
            )}
          </div>

          {/* Timestamp */}
          <div className="tooltip">
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
              {relativeTime(n.timestamp)}
            </span>
            <span className="tooltip-content">
              {new Date(n.timestamp).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Summary */}
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-primary)", fontWeight: 500, marginBottom: n.payload.detail ? "var(--space-1)" : 0 }}>
          {n.payload.summary}
        </p>

        {/* Detail */}
        {n.payload.detail && (
          <p style={{
            fontSize: "var(--text-xs)",
            color: "var(--text-secondary)",
            background: "var(--bg-primary)",
            border: "1px solid var(--border-muted)",
            borderRadius: "var(--radius-sm)",
            padding: "var(--space-2) var(--space-3)",
            marginTop: "var(--space-2)",
            fontStyle: "italic",
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
          } as React.CSSProperties}>
            {n.payload.detail}
          </p>
        )}

        {/* Footer row */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginTop: "var(--space-2)", flexWrap: "wrap" }}>
          <span style={{ fontSize: "var(--text-xs)", color: delivered.color }}>
            {delivered.text}
          </span>
          <span className="badge badge-muted" style={{ fontSize: "9px", textTransform: "none" }}>
            {n.mode_at_time.replace(/_/g, " ")}
          </span>
          <span className={`badge ${n.priority_at_time === "critical" ? "badge-error" : n.priority_at_time === "watching" ? "badge-warning" : "badge-muted"}`} style={{ fontSize: "9px" }}>
            {n.priority_at_time}
          </span>
        </div>
      </div>
    </div>
  );
}
