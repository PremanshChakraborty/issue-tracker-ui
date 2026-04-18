"use client";

import type { Notification } from "@/types";
import { groupByDate } from "@/lib/utils";
import NotificationCard from "./NotificationCard";

interface Props {
  notifications: Notification[];
}

export default function NotificationHistoryList({ notifications }: Props) {
  if (notifications.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </div>
        <div>
          <p style={{ fontWeight: 600 }}>No notifications yet</p>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginTop: 4 }}>
            Notifications will appear here after the next tracker run.
          </p>
        </div>
      </div>
    );
  }

  // Sort newest-first
  const sorted = [...notifications].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const groups = groupByDate(sorted);

  return (
    <div className="timeline">
      {groups.map(({ date, items }) => (
        <div key={date} style={{ marginBottom: "var(--space-6)" }}>
          {/* Date heading */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            marginBottom: "var(--space-3)",
          }}>
            <span style={{
              fontSize: "var(--text-xs)",
              fontWeight: 700,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              whiteSpace: "nowrap",
            }}>
              {date}
            </span>
            <div style={{ flex: 1, height: 1, background: "var(--border-muted)" }} />
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              {items.length} event{items.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Notification cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {items.map((n) => (
              <NotificationCard key={n.id} notification={n} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
