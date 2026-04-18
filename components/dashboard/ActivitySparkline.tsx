"use client";

import type { Notification } from "@/types";

interface Props {
  notifications: Notification[];
}

interface DayBucket {
  date: string;
  label: string;
  count: number;
  hasCritical: boolean;
  hasWatching: boolean;
}

function getLast7DayBuckets(notifications: Notification[]): DayBucket[] {
  const buckets: DayBucket[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const label = i === 0 ? "Today" : i === 1 ? "Yest." : d.toLocaleDateString("en-US", { weekday: "short" });

    const dayNotifs = notifications.filter(n => n.timestamp.startsWith(dateStr));
    buckets.push({
      date: dateStr,
      label,
      count: dayNotifs.length,
      hasCritical: dayNotifs.some(n => n.priority_at_time === "critical"),
      hasWatching: dayNotifs.some(n => n.priority_at_time === "watching"),
    });
  }

  return buckets;
}

export default function ActivitySparkline({ notifications }: Props) {
  const buckets = getLast7DayBuckets(notifications);
  const maxCount = Math.max(...buckets.map(b => b.count), 1);
  const totalLast7 = buckets.reduce((s, b) => s + b.count, 0);
  const peakDay = buckets.reduce((best, b) => (b.count > best.count ? b : best), buckets[0]);

  const chartWidth = 280;
  const chartHeight = 72;
  const barWidth = 28;
  const barGap = 12;
  const totalW = barWidth + barGap;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      {/* SVG bar chart */}
      <svg width={chartWidth} height={chartHeight} style={{ overflow: "visible" }}>
        {buckets.map((bucket, i) => {
          const barH = maxCount > 0 ? Math.max((bucket.count / maxCount) * (chartHeight - 12), 4) : 4;
          const x = i * totalW;
          const y = chartHeight - barH - 12;
          const color = bucket.hasCritical
            ? "var(--critical)"
            : bucket.hasWatching
            ? "var(--watching)"
            : "var(--border-default)";
          const isPeak = bucket.date === peakDay.date && bucket.count > 0;

          return (
            <g key={bucket.date} className="chart-bar">
              {/* Bar */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx={4}
                fill={color}
                opacity={bucket.count === 0 ? 0.3 : 0.85}
              />
              {/* Peak marker */}
              {isPeak && (
                <text
                  x={x + barWidth / 2}
                  y={y - 4}
                  textAnchor="middle"
                  fontSize="9"
                  fill="var(--text-muted)"
                >
                  ↑{bucket.count}
                </text>
              )}
              {/* Day label */}
              <text
                x={x + barWidth / 2}
                y={chartHeight}
                textAnchor="middle"
                fontSize="10"
                fill="var(--text-muted)"
              >
                {bucket.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Summary line */}
      <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
        <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>{totalLast7}</span> notifications in last 7 days
        {peakDay.count > 0 && (
          <> · Peak: <span style={{ color: "var(--text-secondary)" }}>{peakDay.label}</span> ({peakDay.count})</>
        )}
      </p>
    </div>
  );
}
