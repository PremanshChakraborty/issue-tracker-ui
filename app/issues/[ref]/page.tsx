"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import NotificationHistoryList from "@/components/issues/NotificationHistoryList";
import type { Watchlist, TrackerState, Notification, IssueConfig } from "@/types";
import { decodeRef, relativeTime, priorityBadgeClass, modeLabel, daysSince } from "@/lib/utils";

interface Status {
  authenticated: boolean;
  installed: boolean;
  repoOwner: string;
  repoName: string;
  telegramConnected: boolean;
}

export default function IssueHistoryPage() {
  const router = useRouter();
  const params = useParams();
  const rawRef = decodeURIComponent(String(params.ref));
  const issueRef = decodeRef(rawRef);

  const [status, setStatus] = useState<Status | null>(null);
  const [config, setConfig] = useState<IssueConfig | null>(null);
  const [issueState, setIssueState] = useState<TrackerState["issues"][string] | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Auth check
  useEffect(() => {
    fetch("/api/auth/status")
      .then(r => r.json())
      .then((d: Status) => {
        if (!d.authenticated) { router.replace("/"); return; }
        if (!d.installed) { router.replace("/setup?step=repo"); return; }
        setStatus(d);
      })
      .catch(() => router.replace("/"));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch data
  useEffect(() => {
    if (!status) return;
    (async () => {
      setLoading(true);
      try {
        const [wl, st, notifs] = await Promise.all([
          fetch("/api/repo/watchlist.json").then(r => r.json()),
          fetch("/api/repo/state.json").then(r => r.json()),
          fetch("/api/repo/notifications.json").then(r => r.json()),
        ]);
        const watchlist: Watchlist = wl.data ?? { issues: {} };
        const trackerState: TrackerState = st.data ?? { last_run: null, last_digest_sent_at: null, issues: {} };
        const allNotifs: Notification[] = Array.isArray(notifs.data) ? notifs.data : [];

        setConfig(watchlist.issues[issueRef] ?? null);
        setIssueState(trackerState.issues[issueRef] ?? null);
        setNotifications(allNotifs.filter(n => n.issue_ref === issueRef));
      } finally {
        setLoading(false);
      }
    })();
  }, [status, issueRef]);

  if (!status) {
    return (
      <main style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="spinner spinner-lg" />
      </main>
    );
  }

  const elapsed = daysSince(issueState?.last_activity_at ?? null);
  const issueUrl = config ? `https://github.com/${config.repo}/issues/${config.issue_number}` : "#";

  return (
    <AppShell repoOwner={status.repoOwner} repoName={status.repoName} isActive={status.telegramConnected}>
      <div style={{ minHeight: "100dvh" }}>

        {/* Back link */}
        <div style={{ padding: "var(--space-6) var(--space-8) 0" }}>
          <Link href="/watchlist" style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: "var(--space-1)" }}>
            ← Back to Watchlist
          </Link>
        </div>

        {loading ? (
          <div style={{ padding: "var(--space-8)" }}>
            <div className="skeleton" style={{ height: 28, width: 300, marginBottom: "var(--space-4)" }} />
            <div className="skeleton" style={{ height: 14, width: 200, marginBottom: "var(--space-6)" }} />
            <div className="skeleton" style={{ height: 80, marginBottom: "var(--space-4)" }} />
            <div className="skeleton" style={{ height: 80 }} />
          </div>
        ) : (
          <>
            {/* Issue header */}
            <div style={{ padding: "var(--space-5) var(--space-8) var(--space-4)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-2)", flexWrap: "wrap" }}>
                {config && <span className={priorityBadgeClass(config.priority)}>{config.priority}</span>}
                {config && <span className="badge badge-accent" style={{ textTransform: "none" }}>{modeLabel(config.mode)}</span>}
                <code style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{issueRef}</code>
              </div>

              <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "var(--space-2)" }}>
                {config?.title ?? issueRef}
              </h1>

              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", flexWrap: "wrap" }}>
                <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                  Last activity: <strong style={{ color: "var(--text-secondary)" }}>
                    {issueState?.last_activity_at ? relativeTime(issueState.last_activity_at) : "unknown"}
                  </strong>
                </span>
                {config && (
                  <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                    Inactivity threshold: <strong style={{ color: "var(--text-secondary)" }}>{config.inactivity_threshold_days}d</strong>
                    {elapsed >= config.inactivity_threshold_days && (
                      <span style={{ color: "var(--critical)", marginLeft: 4 }}>⚠ Alert overdue</span>
                    )}
                  </span>
                )}
                <a
                  href={issueUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost"
                  style={{ fontSize: "var(--text-xs)", textDecoration: "none", padding: "var(--space-1) var(--space-3)" }}
                >
                  View on GitHub ↗
                </a>
              </div>
            </div>

            {/* Config summary card */}
            {config && (
              <div style={{ padding: "0 var(--space-8) var(--space-5)" }}>
                <div className="glass" style={{ padding: "var(--space-4)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-6)", flexWrap: "wrap" }}>
                    <div>
                      <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 2 }}>Watch users</p>
                      <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                        {config.watch_users.length ? config.watch_users.map(u => `@${u}`).join(", ") : "Everyone"}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 2 }}>Snooze</p>
                      <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                        {config.snooze_until && new Date(config.snooze_until) > new Date()
                          ? `Until ${new Date(config.snooze_until).toLocaleDateString()}`
                          : "None"}
                      </p>
                    </div>
                    {config.notes && (
                      <div>
                        <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 2 }}>Note</p>
                        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontStyle: "italic" }}>
                          {config.notes}
                        </p>
                      </div>
                    )}
                    <div style={{ marginLeft: "auto" }}>
                      <Link href="/watchlist" className="btn-ghost" style={{ fontSize: "var(--text-xs)", textDecoration: "none" }}>
                        Edit config ↗
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notification count header */}
            <div style={{ padding: "0 var(--space-8)", marginBottom: "var(--space-5)" }}>
              <p style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Notification History ({notifications.length} event{notifications.length !== 1 ? "s" : ""})
              </p>
            </div>

            {/* Timeline */}
            <div style={{ padding: "0 var(--space-8) var(--space-12)" }}>
              <NotificationHistoryList notifications={notifications} />
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
