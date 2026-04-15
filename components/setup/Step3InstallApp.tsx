"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  expectedRepoOwner: string | null;
  expectedRepoName: string | null;
  initialMismatch: { actual: string; expected: string } | null;
  onComplete: (owner: string, repo: string) => void;
}

type PollState = "idle" | "polling" | "timeout" | "mismatch";

const GITHUB_APP_SLUG = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG ?? "";
const POLL_INTERVAL_MS = 3000;
const TIMEOUT_MS = 5 * 60 * 1000;

export default function Step3InstallApp({
  expectedRepoOwner,
  expectedRepoName,
  initialMismatch,
  onComplete,
}: Props) {
  const [pollState, setPollState] = useState<PollState>(
    initialMismatch ? "mismatch" : "idle"
  );
  const [mismatch, setMismatch] = useState(initialMismatch);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const installUrl = GITHUB_APP_SLUG
    ? `https://github.com/apps/${GITHUB_APP_SLUG}/installations/new`
    : "#";

  function stopPolling() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }

  function startPolling() {
    setPollState("polling");

    timeoutRef.current = setTimeout(() => {
      stopPolling();
      setPollState("timeout");
    }, TIMEOUT_MS);

    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/auth/status");
        const data = await res.json();
        if (!data.installed) return;

        // Check repo match
        if (expectedRepoOwner && expectedRepoName) {
          const ownerOk = data.repoOwner === expectedRepoOwner;
          const nameOk = data.repoName === expectedRepoName;
          if (!ownerOk || !nameOk) {
            stopPolling();
            setMismatch({
              actual: `${data.repoOwner}/${data.repoName}`,
              expected: `${expectedRepoOwner}/${expectedRepoName}`,
            });
            setPollState("mismatch");
            return;
          }
        }

        stopPolling();
        onComplete(data.repoOwner, data.repoName);
      } catch {
        // Network error — keep polling
      }
    }, POLL_INTERVAL_MS);
  }

  useEffect(() => () => stopPolling(), []);

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
            background: "var(--accent-muted)",
            border: "1px solid rgba(110,86,207,0.3)",
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
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </div>
        <div>
          <h2
            style={{ fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--text-primary)" }}
          >
            Connect the GitHub App
          </h2>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
            Grant access to your tracker repository
          </p>
        </div>
      </div>

      {/* Mismatch error */}
      {pollState === "mismatch" && mismatch && (
        <div
          className="slide-up"
          style={{
            padding: "var(--space-4)",
            background: "var(--watching-bg)",
            border: "1px solid var(--watching-border)",
            borderRadius: "var(--radius-md)",
            marginBottom: "var(--space-4)",
          }}
        >
          <p
            style={{
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              color: "var(--watching)",
              marginBottom: "var(--space-2)",
            }}
          >
            ⚠️ App installed on wrong repository
          </p>
          <div
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--text-secondary)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-1)",
              marginBottom: "var(--space-3)",
            }}
          >
            <div>
              Installed on: <code>{mismatch.actual}</code>
            </div>
            <div>
              Expected: <code>{mismatch.expected}</code>
            </div>
          </div>
          <a
            href={installUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost"
            style={{ display: "inline-flex", fontSize: "var(--text-xs)", textDecoration: "none" }}
            onClick={() => setTimeout(startPolling, 500)}
          >
            Reinstall on correct repo ↗
          </a>
        </div>
      )}

      {/* Timeout error */}
      {pollState === "timeout" && (
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
          <p
            style={{
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              color: "var(--critical)",
              marginBottom: "var(--space-1)",
            }}
          >
            ✕ Installation not detected
          </p>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
            The GitHub redirect may have failed. Click Try Again below to retry.
          </p>
        </div>
      )}

      {/* Repo target info */}
      {expectedRepoOwner && expectedRepoName && (
        <div
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-muted)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-3) var(--space-4)",
            marginBottom: "var(--space-5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Installing on
          </span>
          <code style={{ fontSize: "var(--text-sm)", color: "var(--text-primary)" }}>
            {expectedRepoOwner}/{expectedRepoName}
          </code>
        </div>
      )}

      {/* Instructions */}
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
          After clicking Install
        </p>
        <ol style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {[
            'Select "Only select repositories"',
            `Choose: ${expectedRepoOwner ?? "your-name"}/${expectedRepoName ?? "your-repo"}`,
            "Click Install & Authorize",
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
                style={{
                  color: "var(--accent)",
                  fontWeight: 700,
                  flexShrink: 0,
                  width: 18,
                }}
              >
                {i + 1}.
              </span>
              {item}
            </li>
          ))}
        </ol>
      </div>

      {/* Install button or polling state */}
      {pollState !== "polling" ? (
        <a
          id="install-github-app"
          href={installUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary btn-lg"
          style={{ display: "flex", width: "100%", textDecoration: "none" }}
          onClick={() => setTimeout(startPolling, 500)}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
          </svg>
          {pollState === "timeout" || pollState === "mismatch"
            ? "Try Again"
            : "Install GitHub App"}
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            style={{ marginLeft: "auto" }}
          >
            <line x1="7" y1="17" x2="17" y2="7" />
            <polyline points="7 7 17 7 17 17" />
          </svg>
        </a>
      ) : (
        <>
          <div
            className="fade-in"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
              padding: "var(--space-4)",
              background: "var(--accent-muted)",
              border: "1px solid rgba(110,86,207,0.3)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <div className="spinner" />
            <div>
              <p
                style={{
                  fontSize: "var(--text-sm)",
                  fontWeight: 500,
                  color: "var(--text-primary)",
                }}
              >
                Waiting for installation...
              </p>
              <p
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--text-secondary)",
                  marginTop: 2,
                }}
              >
                Complete the GitHub prompt, then return here
              </p>
            </div>
          </div>
          <button
            className="btn-ghost"
            style={{ width: "100%", marginTop: "var(--space-3)", fontSize: "var(--text-xs)" }}
            onClick={() => {
              stopPolling();
              setPollState("idle");
            }}
          >
            Cancel
          </button>
        </>
      )}
    </div>
  );
}
