"use client";

import { useEffect, useState } from "react";

interface Props {
  repoOwner: string;
  repoName: string;
  getValidToken: () => Promise<string>;
  onComplete: () => void;
}

type PreflightState = "checking" | "ready" | "error";
type ActivateState = "idle" | "enabling-cron" | "dispatching" | "done" | "error";

interface PreflightError {
  message: string;
}

export default function Step5Activate({
  repoOwner,
  repoName,
  getValidToken,
  onComplete,
}: Props) {
  const [preflightState, setPreflightState] = useState<PreflightState>("checking");
  const [preflightError, setPreflightError] = useState<PreflightError | null>(null);
  const [activateState, setActivateState] = useState<ActivateState>("idle");
  const [activateError, setActivateError] = useState<string | null>(null);
  const [dispatchWarning, setDispatchWarning] = useState(false);

  useEffect(() => {
    runPreflight();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function runPreflight() {
    setPreflightState("checking");
    setPreflightError(null);

    try {
      const token = await getValidToken();
      const headers: HeadersInit = {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      };
      const base = `https://api.github.com/repos/${repoOwner}/${repoName}`;

      // Check workflow file exists
      const wfRes = await fetch(
        `${base}/contents/.github/workflows/tracker.yml`,
        { headers }
      );
      if (!wfRes.ok) {
        setPreflightError({
          message:
            "Workflow file not found. Make sure you created the repository from our template.",
        });
        setPreflightState("error");
        return;
      }

      // Check secrets exist
      const secretsRes = await fetch(`${base}/actions/secrets`, { headers });
      if (!secretsRes.ok) {
        setPreflightError({
          message: "Could not verify Telegram secrets. Try going back to step 4 and reconnecting.",
        });
        setPreflightState("error");
        return;
      }
      const secretsData = await secretsRes.json();
      const secretNames: string[] = (secretsData.secrets ?? []).map(
        (s: { name: string }) => s.name
      );
      const missing = ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"].filter(
        (s) => !secretNames.includes(s)
      );
      if (missing.length > 0) {
        setPreflightError({
          message: `Telegram secrets are missing (${missing.join(", ")}). Go back to step 4 and reconnect Telegram.`,
        });
        setPreflightState("error");
        return;
      }

      setPreflightState("ready");
    } catch {
      setPreflightError({
        message: "Pre-flight check failed. Please check your connection and try again.",
      });
      setPreflightState("error");
    }
  }

  async function activate() {
    setActivateState("enabling-cron");
    setActivateError(null);
    setDispatchWarning(false);

    try {
      const token = await getValidToken();
      const headers: HeadersInit = {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      };
      const base = `https://api.github.com/repos/${repoOwner}/${repoName}`;

      // A. Fetch current workflow file + SHA
      const fileRes = await fetch(`${base}/contents/.github/workflows/tracker.yml`, {
        headers,
      });
      if (!fileRes.ok) throw new Error("Could not fetch workflow file. Please try again.");
      const fileData = await fileRes.json();
      const sha: string = fileData.sha;
      const current = atob(fileData.content.replace(/\n/g, ""));

      // B. Inject cron schedule (add schedule trigger alongside existing workflow_dispatch)
      // Matches workflow_dispatch regardless of comments before it, but checks if schedule already exists just in case
      let activated = current;
      if (!current.includes("schedule:")) {
        activated = current.replace(
          "workflow_dispatch:",
          "schedule:\n    - cron: '*/30 * * * *'\n  workflow_dispatch:"
        );
      }

      // C. Commit the activated workflow
      const commitRes = await fetch(`${base}/contents/.github/workflows/tracker.yml`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          message: "feat: activate issue tracker cron schedule",
          content: btoa(activated),
          sha,
        }),
      });
      if (!commitRes.ok) throw new Error("Failed to enable cron schedule. Please try again.");

      // D. Dispatch an immediate run to verify setup
      setActivateState("dispatching");
      const dispatchRes = await fetch(
        `${base}/actions/workflows/tracker.yml/dispatches`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ ref: "main" }),
        }
      );
      if (!dispatchRes.ok) {
        // Non-fatal: cron schedule is committed, first run just won't trigger immediately
        setDispatchWarning(true);
      }

      setActivateState("done");
      setTimeout(onComplete, 1500);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Activation failed. Please try again.";
      setActivateError(message);
      setActivateState("error");
    }
  }

  const ACTIVATE_LABELS: Record<ActivateState, string> = {
    idle: "Activate Tracker 🚀",
    "enabling-cron": "Enabling cron schedule...",
    dispatching: "Starting first run...",
    done: "All done! Redirecting...",
    error: "Retry Activation",
  };

  const isActivating =
    activateState === "enabling-cron" ||
    activateState === "dispatching" ||
    activateState === "done";

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
          marginBottom: "var(--space-6)",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "var(--radius-md)",
            background: "var(--success-bg)",
            border: "1px solid var(--success-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--success)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 2L11 13" />
            <path d="M22 2L15 22 11 13 2 9l20-7z" />
          </svg>
        </div>
        <div>
          <h2
            style={{ fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--text-primary)" }}
          >
            Activate Your Tracker
          </h2>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
            Everything is in place — one click to go live
          </p>
        </div>
      </div>

      {/* Pre-flight loading */}
      {preflightState === "checking" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            padding: "var(--space-4)",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-muted)",
            borderRadius: "var(--radius-md)",
            marginBottom: "var(--space-5)",
          }}
        >
          <div className="spinner" />
          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
            Running pre-flight checks...
          </span>
        </div>
      )}

      {/* Pre-flight error */}
      {preflightState === "error" && preflightError && (
        <div
          className="slide-up"
          style={{
            padding: "var(--space-4)",
            background: "var(--critical-bg)",
            border: "1px solid var(--critical-border)",
            borderRadius: "var(--radius-md)",
            marginBottom: "var(--space-5)",
          }}
        >
          <p
            style={{
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              color: "var(--critical)",
              marginBottom: "var(--space-2)",
            }}
          >
            ✕ Pre-flight check failed
          </p>
          <p
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--text-secondary)",
              marginBottom: "var(--space-3)",
            }}
          >
            {preflightError.message}
          </p>
          <button
            className="btn-ghost"
            onClick={runPreflight}
            style={{ fontSize: "var(--text-xs)" }}
          >
            Retry Check
          </button>
        </div>
      )}

      {/* Summary + activate */}
      {preflightState === "ready" && (
        <>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-2)",
              marginBottom: "var(--space-5)",
            }}
          >
            {[
              { label: "Repository", value: `${repoOwner}/${repoName}`, mono: true },
              { label: "GitHub App", value: "Connected", mono: false },
              { label: "Telegram", value: "Connected", mono: false },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "var(--space-3) var(--space-4)",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-muted)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                  {item.label}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  <span className="step-check" style={{ width: 16, height: 16, fontSize: 9 }}>
                    ✓
                  </span>
                  <span
                    style={{
                      fontSize: item.mono ? "var(--text-xs)" : "var(--text-sm)",
                      fontWeight: 500,
                      color: "var(--text-primary)",
                      fontFamily: item.mono ? "var(--font-mono)" : undefined,
                    }}
                  >
                    {item.value}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* What happens on activate */}
          <div
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-muted)",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-4)",
              marginBottom: "var(--space-5)",
            }}
          >
            <p
              style={{
                fontSize: "var(--text-xs)",
                fontWeight: 600,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "var(--space-3)",
              }}
            >
              Clicking activate will
            </p>
            <ol
              style={{
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-2)",
              }}
            >
              {[
                "Enable the 30-minute tracking schedule",
                "Run the tracker immediately to verify setup",
              ].map((item, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "var(--space-2)",
                    fontSize: "var(--text-sm)",
                    color: "var(--text-secondary)",
                  }}
                >
                  <span
                    style={{ color: "var(--accent)", fontWeight: 700, flexShrink: 0, width: 18 }}
                  >
                    {i === 0 ? "①" : "②"}
                  </span>
                  {item}
                </li>
              ))}
            </ol>
          </div>
        </>
      )}

      {/* Dispatch non-fatal warning */}
      {dispatchWarning && (
        <div
          style={{
            padding: "var(--space-3)",
            background: "var(--watching-bg)",
            border: "1px solid var(--watching-border)",
            borderRadius: "var(--radius-md)",
            marginBottom: "var(--space-4)",
          }}
        >
          <p style={{ fontSize: "var(--text-xs)", color: "var(--watching)" }}>
            ⚠️ First run could not be dispatched — non-critical. Your tracker will start
            automatically on the next scheduled run (within 30 minutes).
          </p>
        </div>
      )}

      {/* Activation error */}
      {activateState === "error" && activateError && (
        <div
          className="slide-up"
          style={{
            padding: "var(--space-4)",
            background: "var(--critical-bg)",
            border: "1px solid var(--critical-border)",
            borderRadius: "var(--radius-md)",
            marginBottom: "var(--space-4)",
          }}
        >
          <p style={{ fontSize: "var(--text-sm)", color: "var(--critical)" }}>
            ✕ {activateError}
          </p>
        </div>
      )}

      {/* Activate button */}
      {preflightState === "ready" && (
        <button
          id="activate-tracker"
          className="btn-primary btn-lg"
          style={{ width: "100%", position: "relative" }}
          disabled={isActivating}
          onClick={activate}
        >
          {isActivating && (
            <div
              className="spinner"
              style={{ position: "absolute", left: "var(--space-4)" }}
            />
          )}
          {ACTIVATE_LABELS[activateState]}
        </button>
      )}
    </div>
  );
}
