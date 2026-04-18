"use client";

import { useState, useEffect, useRef } from "react";
import type { GlobalSettings, IssueMode } from "@/types";

// ── Common IANA timezones ─────────────────────────────────────────────────────
const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
  "Pacific/Auckland",
];

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ id, value, onChange }: { id: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      id={id}
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

// ── Section card ──────────────────────────────────────────────────────────────
function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="glass" style={{ padding: "var(--space-6)" }}>
      <div style={{ marginBottom: "var(--space-5)" }}>
        <h2 style={{ fontSize: "var(--text-base)", fontWeight: 700, letterSpacing: "-0.01em" }}>{title}</h2>
        {hint && <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: "var(--space-1)" }}>{hint}</p>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        {children}
      </div>
    </div>
  );
}

// ── SettingsForm ──────────────────────────────────────────────────────────────
interface Props {
  initial: GlobalSettings;
  sha: string;
}

export default function SettingsForm({ initial, sha }: Props) {
  const [values, setValues] = useState<GlobalSettings>(initial);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const currentSha = useRef(sha);

  // Detect dirty state
  useEffect(() => {
    setDirty(JSON.stringify(values) !== JSON.stringify(initial));
  }, [values, initial]);

  function patch<K extends keyof GlobalSettings>(key: K, val: GlobalSettings[K]) {
    setValues(prev => ({ ...prev, [key]: val }));
    setError(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: values, sha: currentSha.current }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "sha_conflict") {
          setError("Settings were updated elsewhere. Please refresh the page.");
        } else {
          setError(data.error ?? "Save failed.");
        }
        return;
      }
      setDirty(false);
      setSavedAt(new Date());
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>

      {/* Unsaved changes banner */}
      {dirty && (
        <div className="unsaved-banner">
          <span style={{ fontSize: "var(--text-sm)", color: "var(--watching)", fontWeight: 500 }}>
            ⚠ Unsaved changes
          </span>
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <button className="btn-ghost" style={{ fontSize: "var(--text-xs)" }} onClick={() => setValues(initial)}>
              Discard
            </button>
            <button className="btn-primary" style={{ fontSize: "var(--text-xs)" }} onClick={save} disabled={saving}>
              {saving ? <><div className="spinner spinner-sm" /> Saving…</> : "Save Settings"}
            </button>
          </div>
        </div>
      )}

      {/* ── Notification schedule ──────────────────────────────────────────── */}
      <Section title="Notification Schedule" hint="Controls how often the tracker checks for updates.">
        {/* Cron interval */}
        <div className="toggle-wrapper">
          <div>
            <label htmlFor="cron-interval" style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>Cron interval</label>
            <p className="field-hint">How often the tracker cron job runs and checks for new activity.</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexShrink: 0 }}>
            <input
              id="cron-interval"
              type="number"
              min={10}
              max={1440}
              step={10}
              className="input-number"
              value={values.cron_interval_minutes}
              onChange={(e) => patch("cron_interval_minutes", Number(e.target.value))}
            />
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", whiteSpace: "nowrap" }}>minutes</span>
          </div>
        </div>

        {/* Digest time */}
        <div className="toggle-wrapper">
          <div>
            <label htmlFor="digest-time" style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>Daily digest time</label>
            <p className="field-hint">Time of day to send the daily digest Telegram message.</p>
          </div>
          <input
            id="digest-time"
            type="time"
            className="input"
            style={{ width: "auto", flexShrink: 0 }}
            value={values.digest_time}
            onChange={(e) => patch("digest_time", e.target.value)}
          />
        </div>

        {/* Timezone */}
        <div className="toggle-wrapper">
          <div>
            <label htmlFor="timezone" style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>Timezone</label>
            <p className="field-hint">Used for quiet hours and digest time calculations.</p>
          </div>
          <select
            id="timezone"
            className="input"
            style={{ width: "auto", flexShrink: 0 }}
            value={values.timezone}
            onChange={(e) => patch("timezone", e.target.value)}
          >
            {TIMEZONES.map(tz => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>
      </Section>

      {/* ── Quiet hours ───────────────────────────────────────────────────── */}
      <Section title="Quiet Hours" hint="Suppress all non-critical notifications during this window.">
        {/* Start */}
        <div className="toggle-wrapper">
          <div>
            <label htmlFor="quiet-start" style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>Quiet hours start</label>
            <p className="field-hint">Notifications suppressed after this time.</p>
          </div>
          <input
            id="quiet-start"
            type="time"
            className="input"
            style={{ width: "auto", flexShrink: 0 }}
            value={values.quiet_hours_start}
            onChange={(e) => patch("quiet_hours_start", e.target.value)}
          />
        </div>

        {/* End */}
        <div className="toggle-wrapper">
          <div>
            <label htmlFor="quiet-end" style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>Quiet hours end</label>
            <p className="field-hint">Notifications resume at this time.</p>
          </div>
          <input
            id="quiet-end"
            type="time"
            className="input"
            style={{ width: "auto", flexShrink: 0 }}
            value={values.quiet_hours_end}
            onChange={(e) => patch("quiet_hours_end", e.target.value)}
          />
        </div>

        <div style={{
          padding: "var(--space-3)",
          borderRadius: "var(--radius-md)",
          background: "var(--bg-primary)",
          border: "1px solid var(--border-muted)",
          fontSize: "var(--text-xs)",
          color: "var(--text-muted)",
        }}>
          💡 Issues with <strong style={{ color: "var(--critical)" }}>critical priority</strong> + bypass enabled will still notify during quiet hours.
        </div>
      </Section>

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <Section title="Filters" hint="Reduce noise from low-signal activity.">
        {/* Filter bots */}
        <div className="toggle-wrapper">
          <div>
            <label style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>Filter bot accounts</label>
            <p className="field-hint">Skip comments from GitHub bots (Dependabot, Actions bot, etc.).</p>
          </div>
          <Toggle id="filter-bots" value={values.filter_bots} onChange={(v) => patch("filter_bots", v)} />
        </div>

        {/* Min comment length */}
        <div className="toggle-wrapper">
          <div>
            <label htmlFor="min-comment-length" style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>Minimum comment length</label>
            <p className="field-hint">Skip comments shorter than N characters. Filters "+1" and emoji reactions.</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexShrink: 0 }}>
            <input
              id="min-comment-length"
              type="number"
              min={0}
              max={500}
              step={5}
              className="input-number"
              value={values.min_comment_length}
              onChange={(e) => patch("min_comment_length", Number(e.target.value))}
            />
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>chars</span>
          </div>
        </div>
      </Section>

      {/* ── Defaults ──────────────────────────────────────────────────────── */}
      <Section title="Defaults" hint="Applied when adding a new issue without specifying a mode.">
        <div className="toggle-wrapper">
          <div>
            <label htmlFor="default-mode" style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>Default mode for new issues</label>
            <p className="field-hint">Fallback mode when no mode is explicitly chosen.</p>
          </div>
          <select
            id="default-mode"
            className="input"
            style={{ width: "auto", flexShrink: 0 }}
            value={values.default_mode}
            onChange={(e) => patch("default_mode", e.target.value as IssueMode)}
          >
            <option value="awaiting_reply">awaiting_reply</option>
            <option value="inactivity_watch">inactivity_watch</option>
            <option value="wip_watch">wip_watch</option>
          </select>
        </div>
      </Section>

      {/* Save feedback */}
      {error && (
        <div style={{
          padding: "var(--space-3) var(--space-4)",
          borderRadius: "var(--radius-md)",
          background: "var(--critical-bg)",
          border: "1px solid var(--critical-border)",
          fontSize: "var(--text-sm)",
          color: "var(--critical)",
        }}>
          {error}
        </div>
      )}

      {savedAt && !dirty && (
        <div style={{
          padding: "var(--space-3) var(--space-4)",
          borderRadius: "var(--radius-md)",
          background: "var(--success-bg)",
          border: "1px solid var(--success-border)",
          fontSize: "var(--text-sm)",
          color: "var(--success)",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          animation: "fadeIn 200ms ease forwards",
        }}>
          ✓ Settings saved at {savedAt.toLocaleTimeString()}
        </div>
      )}

      {/* Bottom save button (always visible) */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          className="btn-primary"
          onClick={save}
          disabled={saving || !dirty}
          id="settings-save"
          style={{ opacity: dirty ? 1 : 0.4 }}
        >
          {saving ? <><div className="spinner spinner-sm" /> Saving…</> : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
