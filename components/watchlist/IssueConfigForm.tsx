"use client";

import { useState, useRef } from "react";
import type { IssueConfig, IssueMode, EventType } from "@/types";
import { ALL_EVENT_TYPES } from "@/types";

// ── Friendly event type labels ────────────────────────────────────────────────
const EVENT_LABELS: Record<EventType, string> = {
  comments:         "Comments",
  assigned:         "Assigned",
  unassigned:       "Unassigned",
  labeled:          "Labeled",
  unlabeled:        "Unlabeled",
  closed:           "Closed",
  reopened:         "Reopened",
  renamed:          "Renamed",
  "cross-referenced": "Cross-referenced",
  connected:        "PR linked",
  merged:           "PR merged",
  milestoned:       "Milestone added",
  demilestoned:     "Milestone removed",
  review_requested: "Review requested",
  mentioned:        "Mentioned",
};

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      className={`toggle${value ? " on" : ""}`}
      onClick={() => onChange(!value)}
    >
      <span className="toggle-thumb" />
    </button>
  );
}

// ── Tag Input ─────────────────────────────────────────────────────────────────
function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [inputVal, setInputVal] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function addTag(val: string) {
    const trimmed = val.trim().replace(/^@/, "");
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInputVal("");
  }

  return (
    <div
      className="tag-input-container"
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((tag) => (
        <span key={tag} className="tag">
          @{tag}
          <button
            type="button"
            className="tag-remove"
            onClick={(e) => { e.stopPropagation(); onChange(value.filter(t => t !== tag)); }}
            aria-label={`Remove ${tag}`}
          >
            ✕
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        className="tag-inner-input"
        value={inputVal}
        placeholder={value.length === 0 ? (placeholder ?? "Add username…") : ""}
        onChange={(e) => setInputVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(inputVal); }
          if (e.key === "Backspace" && !inputVal && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => { if (inputVal.trim()) addTag(inputVal); }}
      />
    </div>
  );
}

// ── IssueConfigForm ───────────────────────────────────────────────────────────
interface Props {
  values: Partial<IssueConfig>;
  onChange: (patch: Partial<IssueConfig>) => void;
  mode?: IssueMode;
}

export default function IssueConfigForm({ values, onChange, mode }: Props) {
  const priority = values.priority ?? "watching";
  const notifyOn = values.notify_on ?? [];

  function field(key: keyof IssueConfig, v: unknown) {
    onChange({ [key]: v });
  }

  function toggleEvent(evt: EventType) {
    const current = notifyOn;
    if (current.includes(evt)) {
      field("notify_on", current.filter(e => e !== evt));
    } else {
      field("notify_on", [...current, evt]);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>

      {/* Priority */}
      <div className="field">
        <label className="field-label">Priority</label>
        <div className="segmented-control" role="group" aria-label="Priority">
          {(["critical", "watching", "low"] as const).map((p) => (
            <button
              key={p}
              type="button"
              className={`segmented-option${priority === p ? ` selected-${p}` : ""}`}
              onClick={() => field("priority", p)}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Inactivity thresholds */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
        <div className="field">
          <label className="field-label">Inactivity alert</label>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <input
              type="number"
              min={1}
              max={90}
              className="input-number"
              value={values.inactivity_threshold_days ?? 14}
              onChange={(e) => field("inactivity_threshold_days", Number(e.target.value))}
            />
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>days</span>
          </div>
        </div>
        <div className="field">
          <label className="field-label">Re-alert every</label>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <input
              type="number"
              min={1}
              max={30}
              className="input-number"
              value={values.stale_re_alert_days ?? 7}
              onChange={(e) => field("stale_re_alert_days", Number(e.target.value))}
            />
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>days</span>
          </div>
        </div>
      </div>

      {/* Watch users */}
      <div className="field">
        <label className="field-label">Watch users</label>
        <TagInput
          value={values.watch_users ?? []}
          onChange={(v) => field("watch_users", v)}
          placeholder="Add GitHub username (Enter to add)…"
        />
        <p className="field-hint">Only notify when these users act. Leave empty to watch everyone.</p>
      </div>

      {/* Ignore users */}
      <div className="field">
        <label className="field-label">Ignore users</label>
        <TagInput
          value={values.ignore_users ?? []}
          onChange={(v) => field("ignore_users", v)}
          placeholder="Add GitHub username to ignore…"
        />
      </div>

      {/* Notify on */}
      <div className="field">
        <label className="field-label">Notify on</label>
        <div className="checkbox-group">
          {ALL_EVENT_TYPES.map((evt) => (
            <button
              key={evt}
              type="button"
              className={`checkbox-chip${notifyOn.includes(evt) ? " checked" : ""}`}
              onClick={() => toggleEvent(evt)}
            >
              {notifyOn.includes(evt) && <span style={{ fontSize: "9px" }}>✓</span>}
              {EVENT_LABELS[evt]}
            </button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {priority === "critical" && (
          <div className="toggle-wrapper">
            <div>
              <p style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>Bypass quiet hours</p>
              <p className="field-hint">Critical priority — send even during quiet hours</p>
            </div>
            <Toggle
              value={values.priority_bypass_quiet_hours ?? false}
              onChange={(v) => field("priority_bypass_quiet_hours", v)}
            />
          </div>
        )}
        <div className="toggle-wrapper">
          <div>
            <p style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>Auto-remove on close</p>
            <p className="field-hint">Remove from watchlist when this issue closes</p>
          </div>
          <Toggle
            value={values.auto_remove_on_close ?? false}
            onChange={(v) => field("auto_remove_on_close", v)}
          />
        </div>
      </div>

      {/* Notes */}
      <div className="field">
        <label className="field-label">Personal note</label>
        <textarea
          className="input"
          rows={2}
          placeholder="Your private context for this issue…"
          value={values.notes ?? ""}
          onChange={(e) => field("notes", e.target.value)}
          style={{ resize: "vertical" }}
        />
      </div>
    </div>
  );
}
