"use client";

import type { Notification } from "@/types";
import { relativeTime, notifTypeIcon, notifTypeLabel } from "@/lib/utils";
import { encodeRef } from "@/lib/utils";
import Link from "next/link";

interface Props {
  notifications: Notification[];
}

export default function DigestTimelineWidget({ notifications }: Props) {
  const recent = [...notifications]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);

  if (recent.length === 0) {
    return (
      <div style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)", textAlign: "center", padding: "var(--space-4)" }}>
        No notifications sent yet.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      {recent.map((notif) => (
        <Link
          key={notif.id}
          href={`/issues/${encodeRef(notif.issue_ref)}`}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "var(--space-3)",
            padding: "var(--space-3)",
            borderRadius: "var(--radius-md)",
            background: "var(--bg-primary)",
            border: "1px solid var(--border-muted)",
            textDecoration: "none",
            transition: "border-color var(--transition), background var(--transition)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--border-default)";
            (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--border-muted)";
            (e.currentTarget as HTMLElement).style.background = "var(--bg-primary)";
          }}
        >
          {/* Type icon */}
          <span style={{ fontSize: "var(--text-base)", flexShrink: 0, lineHeight: 1.4 }}>
            {notifTypeIcon(notif.type)}
          </span>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "var(--space-2)", marginBottom: 2 }}>
              <code style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {notif.issue_ref}
              </code>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", flexShrink: 0 }}>
                {relativeTime(notif.timestamp)}
              </span>
            </div>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {notifTypeLabel(notif.type)} · {notif.payload.summary}
            </p>
          </div>
        </Link>
      ))}

      <Link
        href="/watchlist"
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--text-link)",
          textAlign: "right",
          display: "block",
          marginTop: "var(--space-1)",
        }}
      >
        View all →
      </Link>
    </div>
  );
}
