"use client";

import { useState } from "react";

interface Props {
  issueRef: string;
  currentSnooze: string | null;
  onClose: () => void;
  onSnoozed: (until: string) => void;
}

const PRESETS = [
  { label: "1 day",   days: 1 },
  { label: "3 days",  days: 3 },
  { label: "1 week",  days: 7 },
  { label: "Until I return", days: 30 },
];

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  // Convert ISO to datetime-local format (YYYY-MM-DDTHH:mm)
  return iso.slice(0, 16);
}

export default function SnoozeModal({ issueRef, currentSnooze, onClose, onSnoozed }: Props) {
  const [customDate, setCustomDate] = useState(
    currentSnooze ? toDatetimeLocal(currentSnooze) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function applySnooze(until: string) {
    setSaving(true);
    setError(null);

    // Encode ref: "nodejs/node#1234" → "nodejs--node--1234"
    const encoded = issueRef.replace("/", "--").replace("#", "--");

    try {
      const res = await fetch(`/api/watchlist/${encodeURIComponent(encoded)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snooze_until: until }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to snooze.");
        return;
      }
      onSnoozed(until);
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 400 }} role="dialog" aria-modal="true" aria-label="Snooze issue">

        <div className="modal-header">
          <div>
            <h2 className="modal-title">Snooze Issue</h2>
            <code style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{issueRef}</code>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
            Silence all notifications for this issue until:
          </p>

          {/* Presets */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {PRESETS.map(({ label, days }) => (
              <button
                key={label}
                className="btn-ghost"
                style={{ justifyContent: "space-between" }}
                disabled={saving}
                onClick={() => applySnooze(addDays(days))}
              >
                <span>{label}</span>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                  {new Date(Date.now() + days * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </button>
            ))}
          </div>

          <hr className="divider" />

          {/* Custom date */}
          <div className="field">
            <label className="field-label" htmlFor="snooze-custom">Custom date</label>
            <input
              id="snooze-custom"
              type="datetime-local"
              className="input"
              value={customDate}
              min={new Date().toISOString().slice(0, 16)}
              onChange={(e) => setCustomDate(e.target.value)}
            />
          </div>

          {error && <p style={{ fontSize: "var(--text-xs)", color: "var(--critical)" }}>{error}</p>}
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            disabled={!customDate || saving}
            onClick={() => customDate && applySnooze(new Date(customDate).toISOString())}
            id="snooze-apply"
          >
            {saving ? <><div className="spinner spinner-sm" /> Saving…</> : "Apply Snooze"}
          </button>
        </div>
      </div>
    </div>
  );
}
