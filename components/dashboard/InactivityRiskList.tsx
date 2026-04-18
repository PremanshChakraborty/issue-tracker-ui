"use client";

import type { IssueConfig, Watchlist, TrackerState } from "@/types";
import { priorityColor } from "@/lib/utils";

interface Props {
  watchlist: Watchlist;
  state: TrackerState;
}

interface RiskEntry {
  ref: string;
  config: IssueConfig;
  daysSinceActivity: number;
  threshold: number;
  riskPct: number;
  daysRemaining: number;
}

function daysSince(iso: string | null): number {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export default function InactivityRiskList({ watchlist, state }: Props) {
  const entries: RiskEntry[] = Object.entries(watchlist.issues)
    .map(([ref, config]) => {
      const issueState = state.issues[ref];
      const elapsed = issueState ? daysSince(issueState.last_activity_at) : 0;
      const threshold = config.inactivity_threshold_days;
      const riskPct = Math.min(Math.round((elapsed / threshold) * 100), 100);
      const daysRemaining = threshold - elapsed;
      return { ref, config, daysSinceActivity: elapsed, threshold, riskPct, daysRemaining };
    })
    .sort((a, b) => b.riskPct - a.riskPct)
    .slice(0, 5);

  if (entries.length === 0) {
    return (
      <div style={{ padding: "var(--space-6)", color: "var(--text-muted)", fontSize: "var(--text-sm)", textAlign: "center" }}>
        No issues in watchlist yet.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      {entries.map(({ ref, config, riskPct, daysRemaining }) => {
        const pColor = priorityColor(config.priority);
        const riskClass = riskPct >= 80 ? "risk-high" : riskPct >= 50 ? "risk-medium" : "risk-low";

        return (
          <div key={ref} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            {/* Priority dot */}
            <span className={`status-dot ${config.priority}`} style={{ flexShrink: 0 }} />

            {/* Issue ref */}
            <a
              href={`https://github.com/${config.repo}/issues/${config.issue_number}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--text-secondary)",
                textDecoration: "none",
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: "0 0 auto",
                maxWidth: 160,
              }}
              title={config.title}
            >
              {ref}
            </a>

            {/* Progress bar */}
            <div className="progress-bar">
              <div
                className={`progress-fill ${riskClass}`}
                style={{ width: `${riskPct}%` }}
              />
            </div>

            {/* Alert pill */}
            <span
              style={{
                fontSize: "var(--text-xs)",
                fontWeight: 600,
                color: daysRemaining <= 0 ? "var(--critical)" : daysRemaining <= 3 ? "var(--watching)" : "var(--text-muted)",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {daysRemaining <= 0 ? "⚠ Overdue" : `${daysRemaining}d`}
            </span>
          </div>
        );
      })}
    </div>
  );
}
