"use client";

import type { Watchlist } from "@/types";

interface Props {
  watchlist: Watchlist;
}

export default function RepoSummaryWidget({ watchlist }: Props) {
  // Group by repo
  const repoMap = new Map<string, { critical: number; watching: number; low: number; total: number }>();

  for (const config of Object.values(watchlist.issues)) {
    const existing = repoMap.get(config.repo) ?? { critical: 0, watching: 0, low: 0, total: 0 };
    existing[config.priority]++;
    existing.total++;
    repoMap.set(config.repo, existing);
  }

  const repos = Array.from(repoMap.entries()).sort((a, b) => b[1].total - a[1].total);

  if (repos.length === 0) {
    return (
      <div style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)", textAlign: "center", padding: "var(--space-6)" }}>
        No repositories tracked yet.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      {repos.map(([repo, counts]) => (
        <div
          key={repo}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            padding: "var(--space-3) var(--space-4)",
            background: "var(--bg-primary)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-muted)",
          }}
        >
          {/* Repo name */}
          <a
            href={`https://github.com/${repo}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              color: "var(--text-primary)",
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {repo}
          </a>

          {/* Priority breakdown */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexShrink: 0 }}>
            {counts.critical > 0 && (
              <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: "var(--text-xs)", color: "var(--critical)" }}>
                <span className="status-dot critical" />
                {counts.critical}
              </span>
            )}
            {counts.watching > 0 && (
              <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: "var(--text-xs)", color: "var(--watching)" }}>
                <span className="status-dot watching" />
                {counts.watching}
              </span>
            )}
            {counts.low > 0 && (
              <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: "var(--text-xs)", color: "var(--low)" }}>
                <span className="status-dot low" />
                {counts.low}
              </span>
            )}
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginLeft: "var(--space-1)" }}>
              {counts.total} issue{counts.total !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
