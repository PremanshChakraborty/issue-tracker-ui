"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import PriorityRingChart from "@/components/dashboard/PriorityRingChart";
import ActivitySparkline from "@/components/dashboard/ActivitySparkline";
import InactivityRiskList from "@/components/dashboard/InactivityRiskList";
import RepoSummaryWidget from "@/components/dashboard/RepoSummaryWidget";
import DigestTimelineWidget from "@/components/dashboard/DigestTimelineWidget";
import QuickActionsWidget from "@/components/dashboard/QuickActionsWidget";
import AddIssueModal from "@/components/watchlist/AddIssueModal";
import { relativeTime } from "@/lib/utils";
import type { Watchlist, TrackerState, Notification, GlobalSettings } from "@/types";

interface Status {
  authenticated: boolean;
  installed: boolean;
  githubLogin: string;
  repoOwner: string;
  repoName: string;
  telegramConnected: boolean;
}

interface RepoData {
  watchlist: Watchlist;
  state: TrackerState;
  notifications: Notification[];
  settings: GlobalSettings;
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, sub }: {
  label: string; value: string | number; color?: string; sub?: string;
}) {
  return (
    <div className="glass" style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
      <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
        {label}
      </p>
      <p style={{ fontSize: "var(--text-2xl)", fontWeight: 800, letterSpacing: "-0.03em", color: color ?? "var(--text-primary)", lineHeight: 1 }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: "var(--space-1)" }}>{sub}</p>}
    </div>
  );
}

// ── Widget wrapper ────────────────────────────────────────────────────────────
function Widget({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div
      className="glass"
      style={{ padding: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </div>
  );
}

// ── Skeleton widget ───────────────────────────────────────────────────────────
function WidgetSkeleton() {
  return (
    <div className="glass" style={{ padding: "var(--space-5)" }}>
      <div className="skeleton" style={{ height: 14, width: 80, marginBottom: "var(--space-4)" }} />
      <div className="skeleton" style={{ height: 80 }} />
    </div>
  );
}

// ── Greeting ─────────────────────────────────────────────────────────────────
function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ── Dashboard Page ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const [data, setData] = useState<RepoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addIssueOpen, setAddIssueOpen] = useState(false);

  // ── Auth check ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((d: Status) => {
        if (!d.authenticated) { router.replace("/"); return; }
        if (!d.installed) { router.replace("/setup?step=repo"); return; }
        setStatus(d);
      })
      .catch(() => router.replace("/"));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch repo data ─────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [wl, st, notifs, sett] = await Promise.all([
        fetch("/api/repo/watchlist.json").then(r => r.json()),
        fetch("/api/repo/state.json").then(r => r.json()),
        fetch("/api/repo/notifications.json").then(r => r.json()),
        fetch("/api/repo/settings.json").then(r => r.json()),
      ]);

      const watchlist: Watchlist = wl.data ?? { issues: {} };
      const state: TrackerState = st.data ?? { last_run: null, last_digest_sent_at: null, issues: {} };
      const notifications: Notification[] = Array.isArray(notifs.data) ? notifs.data : [];
      const settings: GlobalSettings = sett.data ?? { cron_interval_minutes: 30 } as GlobalSettings;

      setData({ watchlist, state, notifications, settings });
    } catch (e) {
      console.error(e);
      setError("Failed to load tracker data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status) fetchData();
  }, [status, fetchData]);

  // ── Loading state ───────────────────────────────────────────────────────────
  if (!status) {
    return (
      <main style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="spinner spinner-lg" />
      </main>
    );
  }

  const total = data ? Object.keys(data.watchlist.issues).length : 0;

  return (
    <AppShell repoOwner={status.repoOwner} repoName={status.repoName} isActive={status.telegramConnected}>
      {/* Page background */}
      <div style={{
        minHeight: "100dvh",
        background: "radial-gradient(ellipse at 70% -5%, rgba(110,86,207,0.08) 0%, transparent 50%)",
        position: "relative",
      }}>
        {/* Subtle grid */}
        <div aria-hidden="true" style={{
          position: "fixed", inset: 0,
          backgroundImage: "linear-gradient(var(--border-muted) 1px, transparent 1px), linear-gradient(90deg, var(--border-muted) 1px, transparent 1px)",
          backgroundSize: "40px 40px", opacity: 0.15, pointerEvents: "none", zIndex: 0,
        }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Header */}
          <div className="page-header" id="dashboard-header">
            <div>
              <h1 className="page-title">
                {greeting()}, {status.githubLogin} {new Date().getHours() < 12 ? "☀️" : new Date().getHours() < 17 ? "⛅" : "🌙"}
              </h1>
              <p className="page-subtitle">
                {total === 0
                  ? "No issues in watchlist yet"
                  : `Monitoring ${total} issue${total !== 1 ? "s" : ""}`
                }
                {data?.state.last_run && (
                  <span style={{ color: "var(--text-muted)" }}>
                    {" "}· Last run{" "}
                    <span
                      className="tooltip"
                      title={new Date(data.state.last_run).toLocaleString()}
                    >
                      {relativeTime(data.state.last_run)}
                      <span className="tooltip-content">
                        {new Date(data.state.last_run).toLocaleString()}
                      </span>
                    </span>
                  </span>
                )}
              </p>
            </div>

            <button
              className="btn-primary"
              onClick={() => setAddIssueOpen(true)}
              id="dashboard-add-issue"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Issue
            </button>
          </div>

          {/* Error state */}
          {error && (
            <div style={{
              margin: "var(--space-6) var(--space-8)",
              padding: "var(--space-4)",
              borderRadius: "var(--radius-md)",
              background: "var(--critical-bg)",
              border: "1px solid var(--critical-border)",
              color: "var(--critical)",
              fontSize: "var(--text-sm)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <span>{error}</span>
              <button className="btn-ghost" onClick={fetchData} style={{ fontSize: "var(--text-xs)" }}>
                Retry
              </button>
            </div>
          )}

          {/* Dashboard body */}
          <div className="page-body">
            <div className="dashboard-grid">

              {/* Row 1: Priority (1 col) + Inactivity Risk (2 cols) */}
              {loading ? <WidgetSkeleton /> : data && (
                <Widget title="Priority Breakdown">
                  <PriorityRingChart watchlist={data.watchlist} />
                </Widget>
              )}

              {/* Activity — 2 cols desktop, 1 col tablet */}
              {loading ? (
                <div className="dash-sparkline"><WidgetSkeleton /></div>
              ) : data && (
                <div className="dash-sparkline">
                  <Widget title="7-Day Activity">
                    <ActivitySparkline notifications={data.notifications} />
                  </Widget>
                </div>
              )}

              {/* Row 2: Inactivity Risk (flex fill) + Quick Actions (fit-content) */}
              {loading ? (
                <div className="dash-full" style={{ display: "flex", gap: "var(--space-5)" }}>
                  <div style={{ flex: 1 }}><WidgetSkeleton /></div>
                  <div style={{ flexShrink: 0, width: 260 }}><WidgetSkeleton /></div>
                </div>
              ) : data && (
                <div className="dash-full" style={{ display: "flex", gap: "var(--space-5)", alignItems: "stretch" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Widget
                      title="Inactivity Risk"
                      action={
                        <a href="/watchlist" style={{ fontSize: "var(--text-xs)", color: "var(--text-link)" }}>
                          View all →
                        </a>
                      }
                    >
                      <InactivityRiskList watchlist={data.watchlist} state={data.state} />
                    </Widget>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    <Widget title="Quick Actions">
                      <QuickActionsWidget
                        repoOwner={status.repoOwner}
                        repoName={status.repoName}
                        cronIntervalMinutes={data.settings.cron_interval_minutes}
                        onAddIssue={() => setAddIssueOpen(true)}
                      />
                    </Widget>
                  </div>
                </div>
              )}

              {/* Row 3: Recent Activity (2 cols) + Repositories (1 col) */}
              {loading ? (
                <div className="dash-recent"><WidgetSkeleton /></div>
              ) : data && (
                <div className="dash-recent">
                  <Widget title="Recent Activity">
                    <DigestTimelineWidget notifications={data.notifications} />
                  </Widget>
                </div>
              )}

              {loading ? <WidgetSkeleton /> : data && (
                <Widget title="Repositories">
                  <RepoSummaryWidget watchlist={data.watchlist} />
                </Widget>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* Add Issue Modal */}
      {addIssueOpen && (
        <AddIssueModal
          existingRefs={data ? Object.keys(data.watchlist.issues) : []}
          onClose={() => setAddIssueOpen(false)}
          onAdded={() => { setAddIssueOpen(false); fetchData(); }}
        />
      )}
    </AppShell>
  );
}
