"use client";

import { useState } from "react";
import type { IssueMode, IssueConfig } from "@/types";
import { MODE_DEFAULTS } from "@/types";
import IssueConfigForm from "./IssueConfigForm";

// ── URL validation ─────────────────────────────────────────────────────────────
function parseGitHubIssueUrl(url: string): { owner: string; repo: string; number: number } | null {
  try {
    const u = new URL(url.trim());
    if (u.hostname !== "github.com") return null;
    const parts = u.pathname.replace(/^\//, "").split("/");
    if (parts.length < 4 || parts[2] !== "issues") return null;
    const num = parseInt(parts[3], 10);
    if (isNaN(num) || num <= 0) return null;
    return { owner: parts[0], repo: parts[1], number: num };
  } catch {
    return null;
  }
}

// ── Mode cards ────────────────────────────────────────────────────────────────
const MODE_OPTIONS: Array<{ mode: IssueMode; emoji: string; title: string; desc: string; priority: string }> = [
  {
    mode: "awaiting_reply",
    emoji: "🔴",
    title: "Awaiting Reply",
    desc: "I commented asking for assignment or clarification — waiting for a response.",
    priority: "critical",
  },
  {
    mode: "inactivity_watch",
    emoji: "🟡",
    title: "Inactivity Watch",
    desc: "Waiting for the right moment to jump in when the issue goes quiet enough.",
    priority: "watching",
  },
  {
    mode: "wip_watch",
    emoji: "⚫",
    title: "WIP Watch",
    desc: "Someone else is working on it — I'll monitor in case they stall or drop it.",
    priority: "low",
  },
];

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  existingRefs: string[];
  onClose: () => void;
  onAdded: () => void;
}

interface PreviewData {
  title: string;
  state: string;
  ref: string;
}

export default function AddIssueModal({ existingRefs, onClose, onAdded }: Props) {
  const [step, setStep] = useState<"url" | "config">("url");

  // Step A state
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [selectedMode, setSelectedMode] = useState<IssueMode>("inactivity_watch");

  // Step B state
  const [configOverrides, setConfigOverrides] = useState<Partial<IssueConfig>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── URL resolution ──────────────────────────────────────────────────────────
  async function resolveUrl(raw: string) {
    setUrlError(null);
    setPreview(null);
    const parsed = parseGitHubIssueUrl(raw);
    if (!parsed) {
      setUrlError("Must be a valid GitHub issue URL (github.com/owner/repo/issues/N)");
      return;
    }

    const ref = `${parsed.owner}/${parsed.repo}#${parsed.number}`;
    if (existingRefs.includes(ref)) {
      setUrlError("You're already watching this issue.");
      return;
    }

    setPreviewing(true);
    try {
      const res = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/issues/${parsed.number}`, {
        headers: { Accept: "application/vnd.github.v3+json" },
      });
      if (!res.ok) {
        setUrlError(res.status === 404 ? "Issue not found — check the URL." : "Could not reach GitHub API.");
        return;
      }
      const data = await res.json();
      setPreview({ title: data.title, state: data.state, ref });
    } catch {
      setUrlError("Could not reach GitHub API.");
    } finally {
      setPreviewing(false);
    }
  }

  function handleUrlChange(val: string) {
    setUrl(val);
    if (urlError) setUrlError(null);
    if (preview) setPreview(null);
  }

  // ── Submit (Step B) ─────────────────────────────────────────────────────────
  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, mode: selectedMode, overrides: configOverrides }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.message ?? "Failed to add issue.");
        return;
      }
      onAdded();
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Effective config preview for step B ────────────────────────────────────
  const modeDefaults = MODE_DEFAULTS[selectedMode] as Partial<IssueConfig>;
  const effectiveConfig: Partial<IssueConfig> = { ...modeDefaults, ...configOverrides };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Add Issue to Watchlist">

        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">
              {step === "url" ? "Add Issue to Watchlist" : "Configure Monitoring"}
            </h2>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 4 }}>
              Step {step === "url" ? "1" : "2"} of 2
            </p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* ── Step A: URL + Mode ─────────────────────────────────────────────── */}
        {step === "url" && (
          <>
            <div className="modal-body">
              {/* URL field */}
              <div className="field">
                <label className="field-label" htmlFor="add-issue-url">GitHub Issue URL</label>
                <div style={{ position: "relative" }}>
                  <input
                    id="add-issue-url"
                    type="url"
                    className={`input${urlError ? " input-error" : ""}`}
                    placeholder="https://github.com/owner/repo/issues/123"
                    value={url}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    onBlur={() => { if (url.trim()) resolveUrl(url); }}
                    onKeyDown={(e) => { if (e.key === "Enter") resolveUrl(url); }}
                    autoFocus
                  />
                  {previewing && (
                    <div className="spinner spinner-sm" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }} />
                  )}
                </div>
                {urlError && (
                  <p style={{ fontSize: "var(--text-xs)", color: "var(--critical)" }}>{urlError}</p>
                )}
                {preview && (
                  <div style={{
                    padding: "var(--space-3)",
                    borderRadius: "var(--radius-md)",
                    background: "var(--success-bg)",
                    border: "1px solid var(--success-border)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                      <span style={{ fontSize: "var(--text-xs)", color: "var(--success)" }}>✓</span>
                      <code style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>{preview.ref}</code>
                      {preview.state === "closed" && (
                        <span className="badge badge-muted" style={{ fontSize: "9px" }}>Closed</span>
                      )}
                    </div>
                    <p style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-primary)" }}>{preview.title}</p>
                    {preview.state === "closed" && (
                      <p style={{ fontSize: "var(--text-xs)", color: "var(--watching)" }}>⚠ This issue is closed — you can still watch it.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Mode selection */}
              <div className="field">
                <label className="field-label">Why are you watching this?</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  {MODE_OPTIONS.map(({ mode, emoji, title, desc }) => (
                    <div
                      key={mode}
                      className={`mode-card${selectedMode === mode ? " selected" : ""}`}
                      onClick={() => setSelectedMode(mode)}
                      role="radio"
                      aria-checked={selectedMode === mode}
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") setSelectedMode(mode); }}
                    >
                      <div className="mode-card-icon">{emoji}</div>
                      <div>
                        <p style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>{title}</p>
                        <p style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-ghost" onClick={onClose}>Cancel</button>
              <button
                className="btn-primary"
                disabled={!preview}
                onClick={() => setStep("config")}
                id="add-issue-next"
              >
                Configure →
              </button>
            </div>
          </>
        )}

        {/* ── Step B: Config ────────────────────────────────────────────────── */}
        {step === "config" && (
          <>
            <div className="modal-body">
              {/* Summary */}
              {preview && (
                <div style={{
                  padding: "var(--space-3) var(--space-4)",
                  borderRadius: "var(--radius-md)",
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-muted)",
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                }}>
                  <code style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {preview.ref}
                  </code>
                  <span className="badge badge-accent" style={{ fontSize: "9px", textTransform: "none" }}>
                    {selectedMode.replace(/_/g, " ")} defaults applied
                  </span>
                </div>
              )}

              <IssueConfigForm
                values={effectiveConfig}
                onChange={(patch) => setConfigOverrides(prev => ({ ...prev, ...patch }))}
                mode={selectedMode}
              />

              {submitError && (
                <p style={{ fontSize: "var(--text-xs)", color: "var(--critical)" }}>{submitError}</p>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setStep("url")}>← Back</button>
              <button
                className="btn-primary"
                onClick={handleSubmit}
                disabled={submitting}
                id="add-issue-submit"
              >
                {submitting ? <><div className="spinner spinner-sm" /> Adding…</> : "Add to Watchlist ✓"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
