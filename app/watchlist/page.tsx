"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import WatchlistCard from "@/components/watchlist/WatchlistCard";
import AddIssueModal from "@/components/watchlist/AddIssueModal";
import type { Watchlist, TrackerState, Notification, IssueConfig, IssueMode, Priority } from "@/types";

// ── Filter/Sort controls ──────────────────────────────────────────────────────
type ModeFilter = IssueMode | "all";
type PriorityFilter = Priority | "all";
type SortKey = "risk" | "activity" | "added";

interface Status {
  authenticated: boolean;
  installed: boolean;
  repoOwner: string;
  repoName: string;
  telegramConnected: boolean;
}

export default function WatchlistPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const [watchlist, setWatchlist] = useState<Watchlist>({ issues: {} });
  const [state, setState] = useState<TrackerState>({ last_run: null, last_digest_sent_at: null, issues: {} });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  // Filters
  const [modeFilter, setModeFilter] = useState<ModeFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("risk");

  // ── Auth + data fetch ───────────────────────────────────────────────────────
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [wl, st, notifs] = await Promise.all([
        fetch("/api/repo/watchlist.json").then(r => r.json()),
        fetch("/api/repo/state.json").then(r => r.json()),
        fetch("/api/repo/notifications.json").then(r => r.json()),
      ]);
      setWatchlist(wl.data ?? { issues: {} });
      setState(st.data ?? { last_run: null, last_digest_sent_at: null, issues: {} });
      setNotifications(Array.isArray(notifs.data) ? notifs.data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (status) fetchData(); }, [status, fetchData]);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function latestNotifForIssue(ref: string): Notification | undefined {
    return notifications
      .filter(n => n.issue_ref === ref)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  }

  function daysSince(iso: string | null): number {
    if (!iso) return 0;
    return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  }

  function riskScore(ref: string, config: IssueConfig): number {
    const elapsed = daysSince(state.issues[ref]?.last_activity_at ?? null);
    return elapsed / config.inactivity_threshold_days;
  }

  // ── Filtered + sorted entries ───────────────────────────────────────────────
  const entries = Object.entries(watchlist.issues)
    .filter(([, c]) => modeFilter === "all" || c.mode === modeFilter)
    .filter(([, c]) => priorityFilter === "all" || c.priority === priorityFilter)
    .sort(([refA, a], [refB, b]) => {
      if (sortKey === "risk") return riskScore(refB, b) - riskScore(refA, a);
      if (sortKey === "activity") {
        const aLast = state.issues[refA]?.last_activity_at ?? a.added_at;
        const bLast = state.issues[refB]?.last_activity_at ?? b.added_at;
        return new Date(bLast).getTime() - new Date(aLast).getTime();
      }
      return new Date(b.added_at).getTime() - new Date(a.added_at).getTime();
    });

  // ── Optimistic update helpers ───────────────────────────────────────────────
  function handleRemove(ref: string) {
    setWatchlist(prev => {
      const issues = { ...prev.issues };
      delete issues[ref];
      return { issues };
    });
  }

  function handleUpdated(ref: string, patch: Partial<IssueConfig>) {
    setWatchlist(prev => ({
      issues: { ...prev.issues, [ref]: { ...prev.issues[ref], ...patch } },
    }));
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (!status) {
    return (
      <main style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="spinner spinner-lg" />
      </main>
    );
  }

  const total = Object.keys(watchlist.issues).length;

  return (
    <AppShell repoOwner={status.repoOwner} repoName={status.repoName} isActive={status.telegramConnected}>
      <div style={{ minHeight: "100dvh" }}>

        {/* Header */}
        <div className="page-header" id="watchlist-header">
          <div>
            <h1 className="page-title">Watchlist</h1>
            <p className="page-subtitle">
              {loading ? "Loading…" : `${total} issue${total !== 1 ? "s" : ""} monitored`}
            </p>
          </div>
          <button
            className="btn-primary"
            onClick={() => setAddOpen(true)}
            id="watchlist-add-button"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Issue
          </button>
        </div>

        {/* Filter bar */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
          padding: "var(--space-4) var(--space-8)",
          borderBottom: "1px solid var(--border-muted)",
          flexWrap: "wrap",
        }}>
          {/* Mode filter */}
          <div style={{ display: "flex", gap: "var(--space-1)" }}>
            {(["all", "awaiting_reply", "inactivity_watch", "wip_watch"] as ModeFilter[]).map((f) => (
              <button
                key={f}
                className={`btn-ghost${modeFilter === f ? " active" : ""}`}
                style={{
                  fontSize: "var(--text-xs)",
                  padding: "var(--space-1) var(--space-3)",
                  background: modeFilter === f ? "var(--accent-muted)" : undefined,
                  color: modeFilter === f ? "#a89ee0" : undefined,
                  borderColor: modeFilter === f ? "rgba(110,86,207,0.25)" : undefined,
                }}
                onClick={() => setModeFilter(f)}
              >
                {f === "all" ? "All modes" : f.replace(/_/g, " ")}
              </button>
            ))}
          </div>

          {/* Priority filter */}
          <div style={{ display: "flex", gap: "var(--space-1)", marginLeft: "auto" }}>
            {(["all", "critical", "watching", "low"] as PriorityFilter[]).map((f) => (
              <button
                key={f}
                className={`btn-ghost${priorityFilter === f ? " active" : ""}`}
                style={{
                  fontSize: "var(--text-xs)",
                  padding: "var(--space-1) var(--space-3)",
                  background: priorityFilter === f ? "var(--bg-elevated)" : undefined,
                  color: priorityFilter === f
                    ? f === "critical" ? "var(--critical)"
                    : f === "watching" ? "var(--watching)"
                    : f === "low" ? "var(--low)"
                    : "var(--text-primary)"
                    : undefined,
                }}
                onClick={() => setPriorityFilter(f)}
              >
                {f === "all" ? "All priorities" : f}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            className="input"
            style={{ width: "auto", padding: "var(--space-1) var(--space-3)", fontSize: "var(--text-xs)" }}
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
          >
            <option value="risk">Sort: Inactivity risk</option>
            <option value="activity">Sort: Last activity</option>
            <option value="added">Sort: Date added</option>
          </select>
        </div>

        {/* Content */}
        <div className="page-body">
          {loading ? (
            <div className="watchlist-grid">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="glass" style={{ padding: "var(--space-5)", height: 140 }}>
                  <div className="skeleton" style={{ height: 12, width: 80, marginBottom: "var(--space-3)" }} />
                  <div className="skeleton" style={{ height: 18, width: "60%", marginBottom: "var(--space-2)" }} />
                  <div className="skeleton" style={{ height: 10, width: "40%" }} />
                </div>
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <div>
                <p style={{ fontWeight: 600 }}>
                  {total === 0 ? "No issues in watchlist yet" : "No issues match your filters"}
                </p>
                <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginTop: 4 }}>
                  {total === 0 ? "Add your first GitHub issue to start monitoring." : "Try adjusting the filters above."}
                </p>
              </div>
              {total === 0 && (
                <button className="btn-primary" onClick={() => setAddOpen(true)}>
                  Add First Issue
                </button>
              )}
            </div>
          ) : (
            <div className="watchlist-grid">
              {entries.map(([ref, config]) => (
                <WatchlistCard
                  key={ref}
                  issueRef={ref}
                  config={config}
                  issueState={state.issues[ref]}
                  latestNotif={latestNotifForIssue(ref)}
                  onRemove={handleRemove}
                  onUpdated={handleUpdated}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {addOpen && (
        <AddIssueModal
          existingRefs={Object.keys(watchlist.issues)}
          onClose={() => setAddOpen(false)}
          onAdded={() => { setAddOpen(false); fetchData(); }}
        />
      )}
    </AppShell>
  );
}
