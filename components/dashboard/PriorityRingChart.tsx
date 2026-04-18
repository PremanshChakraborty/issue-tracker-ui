"use client";

import type { Watchlist } from "@/types";

interface Props {
  watchlist: Watchlist;
}

export default function PriorityRingChart({ watchlist }: Props) {
  const counts = { critical: 0, watching: 0, low: 0 };
  for (const config of Object.values(watchlist.issues)) {
    counts[config.priority]++;
  }
  const total = counts.critical + counts.watching + counts.low;

  // SVG donut params
  const size = 140;
  const cx = size / 2;
  const cy = size / 2;
  const r = 50;
  const strokeW = 18;
  const circumference = 2 * Math.PI * r;

  // Build arcs
  const segments = [
    { key: "critical", count: counts.critical, color: "var(--critical)", label: "Critical" },
    { key: "watching", count: counts.watching, color: "var(--watching)", label: "Watching" },
    { key: "low",      count: counts.low,      color: "var(--low)",      label: "Low" },
  ];

  // Gap between arcs in radians
  const gapAngle = total > 1 ? 0.04 : 0;
  let cumulativeAngle = -Math.PI / 2; // start at top

  const arcs = segments
    .filter(s => s.count > 0)
    .map(s => {
      const fraction = s.count / total;
      const sweepAngle = fraction * 2 * Math.PI - gapAngle;
      const startAngle = cumulativeAngle + gapAngle / 2;
      cumulativeAngle += fraction * 2 * Math.PI;

      // arc path
      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(startAngle + sweepAngle);
      const y2 = cy + r * Math.sin(startAngle + sweepAngle);
      const largeArc = sweepAngle > Math.PI ? 1 : 0;

      return { ...s, d: `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`, sweep: sweepAngle };
    });

  if (total === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-4)", padding: "var(--space-6)" }}>
        <svg width={size} height={size}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-elevated)" strokeWidth={strokeW} />
        </svg>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>No issues tracked</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-6)", flexWrap: "wrap" }}>
      {/* Donut */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <svg width={size} height={size}>
          {/* Background track */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-elevated)" strokeWidth={strokeW} />
          {/* Arcs */}
          {arcs.map((arc) => (
            <path
              key={arc.key}
              d={arc.d}
              fill="none"
              stroke={arc.color}
              strokeWidth={strokeW}
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 4px ${arc.color}40)` }}
            />
          ))}
        </svg>
        {/* Center label */}
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}>
          <span style={{ fontSize: "var(--text-2xl)", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1 }}>
            {total}
          </span>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>
            {total === 1 ? "issue" : "issues"}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {segments.map(({ key, count, color, label }) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
            <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>{label}</span>
            <span style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: count > 0 ? "var(--text-primary)" : "var(--text-muted)", marginLeft: "auto", paddingLeft: "var(--space-4)" }}>
              {count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
