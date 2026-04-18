"use client";

import Link from "next/link";

interface Props {
  repoOwner: string;
  repoName: string;
  cronIntervalMinutes?: number;
  onAddIssue?: () => void;
}

export default function QuickActionsWidget({ repoOwner, repoName, cronIntervalMinutes = 30, onAddIssue }: Props) {
  const actionsUrl = `https://github.com/${repoOwner}/${repoName}/actions`;
  const watchlistUrl = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/main/watchlist.json`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      {/* Add issue */}
      <button
        className="btn-primary"
        style={{ width: "100%", justifyContent: "center" }}
        onClick={onAddIssue}
        id="quick-add-issue"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add Issue
      </button>

      {/* Run tracker */}
      <a
        href={actionsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-ghost"
        style={{ width: "100%", justifyContent: "center", textDecoration: "none" }}
        id="quick-run-tracker"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        Run Tracker ↗
      </a>

      {/* View JSON */}
      <a
        href={watchlistUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-ghost"
        style={{ width: "100%", justifyContent: "center", textDecoration: "none" }}
        id="quick-view-json"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
        </svg>
        View JSON ↗
      </a>

      {/* Cron schedule info */}
      <p style={{
        fontSize: "var(--text-xs)",
        color: "var(--text-muted)",
        textAlign: "center",
        borderTop: "1px solid var(--border-muted)",
        paddingTop: "var(--space-3)",
      }}>
        Runs every {cronIntervalMinutes} minutes
      </p>
    </div>
  );
}
