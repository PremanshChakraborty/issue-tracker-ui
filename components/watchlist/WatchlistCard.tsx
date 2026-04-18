"use client";

import { useState } from "react";
import Link from "next/link";
import type { IssueConfig, IssueState, Notification } from "@/types";
import { relativeTime, daysSince, priorityBadgeClass, modeLabel, isSnoozeActive, encodeRef } from "@/lib/utils";
import IssueConfigForm from "./IssueConfigForm";
import SnoozeModal from "./SnoozeModal";

interface Props {
  issueRef: string;
  config: IssueConfig;
  issueState?: IssueState;
  latestNotif?: Notification;
  onRemove: (ref: string) => void;
  onUpdated: (ref: string, patch: Partial<IssueConfig>) => void;
}

export default function WatchlistCard({ issueRef, config, issueState, latestNotif, onRemove, onUpdated }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editValues, setEditValues] = useState<Partial<IssueConfig>>(config);
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [noteVal, setNoteVal] = useState(config.notes || "");

  const snoozed = isSnoozeActive(config.snooze_until);
  const elapsed = daysSince(issueState?.last_activity_at ?? null);
  const threshold = config.inactivity_threshold_days;
  const daysRemaining = threshold - elapsed;
  const riskPct = Math.min((elapsed / threshold) * 100, 100);

  const issueUrl = `https://github.com/${config.repo}/issues/${config.issue_number}`;
  const historyUrl = `/issues/${encodeRef(issueRef)}`;

  // ── Save edit ──────────────────────────────────────────────────────────────
  async function saveEdit() {
    setSaving(true);
    const encoded = issueRef.replace("/", "--").replace("#", "--");
    try {
      const res = await fetch(`/api/watchlist/${encodeURIComponent(encoded)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editValues),
      });
      if (res.ok) {
        onUpdated(issueRef, editValues);
        setEditMode(false);
      }
    } finally {
      setSaving(false);
    }
  }

  // ── Save inline note ───────────────────────────────────────────────────────
  async function saveNote() {
    const encoded = issueRef.replace("/", "--").replace("#", "--");
    await fetch(`/api/watchlist/${encodeURIComponent(encoded)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: noteVal }),
    });
    onUpdated(issueRef, { notes: noteVal });
    setEditingNote(false);
  }

  // ── Remove ─────────────────────────────────────────────────────────────────
  async function handleRemove() {
    if (!confirm(`Remove ${issueRef} from watchlist?`)) return;
    setRemoving(true);
    try {
      const res = await fetch("/api/watchlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: issueRef }),
      });
      if (res.ok) onRemove(issueRef);
    } finally {
      setRemoving(false);
    }
  }

  return (
    <>
      <div
        className="glass"
        style={{
          padding: "var(--space-5)",
          opacity: snoozed ? 0.55 : 1,
          transition: "opacity var(--transition-md)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Snoozed overlay */}
        {snoozed && (
          <div style={{
            position: "absolute",
            top: "var(--space-3)",
            right: "var(--space-3)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-1)",
            padding: "2px var(--space-2)",
            borderRadius: "var(--radius-full)",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-default)",
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
          }}>
            ⏸ Snoozed until {new Date(config.snooze_until!).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </div>
        )}

        {/* ── Main content ─────────────────────────────────────────────────── */}
        {!editMode ? (
          <>
            {/* Header row */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-3)", marginBottom: "var(--space-3)", flexWrap: "wrap" }}>
              <span className={priorityBadgeClass(config.priority)}>{config.priority}</span>
              <span className="badge badge-accent" style={{ textTransform: "none", fontSize: "var(--text-xs)" }}>{modeLabel(config.mode)}</span>
            </div>

            {/* Title + ref */}
            <div style={{ marginBottom: "var(--space-3)" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-2)", flexWrap: "wrap", marginBottom: 4 }}>
                <a
                  href={issueUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: "var(--text-base)", fontWeight: 600, color: "var(--text-primary)" }}
                >
                  {config.title}
                </a>
              </div>
              <code style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{issueRef}</code>
            </div>

            {/* Activity row */}
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", marginBottom: "var(--space-3)", flexWrap: "wrap" }}>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                Last activity: <strong style={{ color: "var(--text-secondary)" }}>{elapsed === 0 ? "today" : `${elapsed}d ago`}</strong>
              </span>

              {/* Inactivity countdown */}
              <span style={{
                fontSize: "var(--text-xs)",
                fontWeight: 600,
                padding: "1px var(--space-2)",
                borderRadius: "var(--radius-full)",
                background: daysRemaining <= 0 ? "var(--critical-bg)" : daysRemaining <= 3 ? "var(--watching-bg)" : "var(--bg-elevated)",
                color: daysRemaining <= 0 ? "var(--critical)" : daysRemaining <= 3 ? "var(--watching)" : "var(--text-muted)",
                border: `1px solid ${daysRemaining <= 0 ? "var(--critical-border)" : daysRemaining <= 3 ? "var(--watching-border)" : "var(--border-muted)"}`,
              }}>
                {daysRemaining <= 0 ? "⚠ Inactivity alert overdue" : `Inactivity alert in ${daysRemaining}d`}
              </span>
            </div>

            {/* Thin risk bar */}
            <div className="progress-bar" style={{ marginBottom: "var(--space-3)" }}>
              <div
                className={`progress-fill ${riskPct >= 80 ? "risk-high" : riskPct >= 50 ? "risk-medium" : "risk-low"}`}
                style={{ width: `${riskPct}%` }}
              />
            </div>

            {/* Latest notification snippet */}
            {latestNotif && (
              <div style={{
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-primary)",
                borderLeft: "3px solid var(--border-default)",
                marginBottom: "var(--space-3)",
              }}>
                <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 2 }}>
                  {relativeTime(latestNotif.timestamp)} · {latestNotif.payload.summary}
                </p>
                {latestNotif.payload.detail && (
                  <p style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    "{latestNotif.payload.detail}"
                  </p>
                )}
              </div>
            )}

            {/* Personal note */}
            {editingNote ? (
              <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
                <input
                  type="text"
                  className="input"
                  autoFocus
                  value={noteVal}
                  onChange={(e) => setNoteVal(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveNote(); if (e.key === "Escape") setEditingNote(false); }}
                  placeholder="Add a personal note…"
                  style={{ flex: 1 }}
                />
                <button className="btn-ghost" onClick={saveNote} style={{ fontSize: "var(--text-xs)" }}>Save</button>
              </div>
            ) : (
              noteVal && (
                <p
                  style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", cursor: "text", marginBottom: "var(--space-3)", fontStyle: "italic" }}
                  onClick={() => setEditingNote(true)}
                  title="Click to edit note"
                >
                  📝 {noteVal}
                </p>
              )
            )}
            {!noteVal && !editingNote && (
              <button
                className="btn-ghost"
                style={{ fontSize: "var(--text-xs)", marginBottom: "var(--space-3)", padding: "var(--space-1) var(--space-2)" }}
                onClick={() => setEditingNote(true)}
              >
                + Add note
              </button>
            )}

            {/* Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", justifyContent: "space-between", flexWrap: "wrap" }}>
              <Link href={historyUrl} style={{ fontSize: "var(--text-xs)", color: "var(--text-link)" }}>
                View history →
              </Link>

              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                <button
                  className="btn-ghost"
                  style={{ fontSize: "var(--text-xs)" }}
                  onClick={() => { setEditValues(config); setEditMode(true); }}
                >
                  Edit
                </button>
                <button
                  className="btn-ghost"
                  style={{ fontSize: "var(--text-xs)" }}
                  onClick={() => setSnoozeOpen(true)}
                >
                  {snoozed ? "Unsnooze" : "Snooze"}
                </button>
                <button
                  className="btn-danger"
                  style={{ fontSize: "var(--text-xs)" }}
                  disabled={removing}
                  onClick={handleRemove}
                >
                  {removing ? <div className="spinner spinner-sm" /> : "Remove"}
                </button>
              </div>
            </div>
          </>
        ) : (
          /* ── Edit mode ─────────────────────────────────────────────────── */
          <>
            <div style={{ marginBottom: "var(--space-5)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-4)" }}>
                <div>
                  <p style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>Edit Configuration</p>
                  <code style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{issueRef}</code>
                </div>
                <button className="modal-close" onClick={() => setEditMode(false)} aria-label="Cancel edit">✕</button>
              </div>
              <IssueConfigForm
                values={editValues}
                onChange={(patch) => setEditValues(prev => ({ ...prev, ...patch }))}
                mode={config.mode}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
              <button className="btn-ghost" onClick={() => setEditMode(false)}>Cancel</button>
              <button className="btn-primary" onClick={saveEdit} disabled={saving}>
                {saving ? <><div className="spinner spinner-sm" /> Saving…</> : "Save Changes"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Snooze modal */}
      {snoozeOpen && (
        <SnoozeModal
          issueRef={issueRef}
          currentSnooze={config.snooze_until}
          onClose={() => setSnoozeOpen(false)}
          onSnoozed={(until) => {
            onUpdated(issueRef, { snooze_until: until });
            setSnoozeOpen(false);
          }}
        />
      )}
    </>
  );
}
