"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Status {
  authenticated: boolean;
  installed: boolean;
  githubLogin: string;
  repoOwner: string;
  repoName: string;
  telegramConnected: boolean;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((data: Status) => {
        if (!data.authenticated) { router.replace("/"); return; }
        if (!data.installed) { router.replace("/setup?step=repo"); return; }
        setStatus(data);
      })
      .catch(() => router.replace("/"));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!status) {
    return (
      <main
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div className="spinner spinner-lg" />
      </main>
    );
  }

  const repoUrl = `https://github.com/${status.repoOwner}/${status.repoName}`;
  const actionsUrl = `${repoUrl}/actions`;

  return (
    <main
      style={{
        minHeight: "100dvh",
        padding: "var(--space-10) var(--space-6)",
        background:
          "radial-gradient(ellipse at 50% -10%, rgba(110,86,207,0.12) 0%, transparent 55%)",
      }}
    >
      {/* Subtle grid */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage:
            "linear-gradient(var(--border-muted) 1px, transparent 1px), linear-gradient(90deg, var(--border-muted) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          opacity: 0.2,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div
        style={{ maxWidth: 640, margin: "0 auto", position: "relative", zIndex: 1 }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: "var(--space-8)",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
              <span className="badge badge-success">● Active</span>
            </div>
            <h1
              style={{
                fontSize: "var(--text-2xl)",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                marginBottom: "var(--space-1)",
              }}
            >
              Issue Tracker
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>
              Welcome back,{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                {session?.user?.githubLogin ?? status.githubLogin}
              </strong>
            </p>
          </div>

          <button
            className="btn-ghost"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            Sign out
          </button>
        </div>

        {/* Status cards */}
        <div
          style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}
        >
          {/* Repository */}
          <div
            className="glass"
            style={{
              padding: "var(--space-5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "var(--radius-md)",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--text-secondary)">
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              </div>
              <div>
                <p
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 3,
                  }}
                >
                  Repository
                </p>
                <code
                  style={{
                    fontSize: "var(--text-sm)",
                    color: "var(--text-primary)",
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    fontWeight: 600,
                  }}
                >
                  {status.repoOwner}/{status.repoName}
                </code>
              </div>
            </div>
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <a
                href={actionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost"
                style={{ fontSize: "var(--text-xs)", textDecoration: "none" }}
              >
                Actions ↗
              </a>
              <a
                href={repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost"
                style={{ fontSize: "var(--text-xs)", textDecoration: "none" }}
              >
                Repo ↗
              </a>
            </div>
          </div>

          {/* GitHub App */}
          <div
            className="glass"
            style={{
              padding: "var(--space-5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
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
                <p
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 3,
                  }}
                >
                  GitHub App
                </p>
                <p style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-primary)" }}>
                  Connected
                </p>
              </div>
            </div>
            <span className="badge badge-success">✓ Active</span>
          </div>

          {/* Telegram */}
          <div
            className="glass"
            style={{
              padding: "var(--space-5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "var(--radius-md)",
                  background: "rgba(39,174,239,0.12)",
                  border: "1px solid rgba(39,174,239,0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#27AEEF">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
              </div>
              <div>
                <p
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 3,
                  }}
                >
                  Telegram
                </p>
                <p style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-primary)" }}>
                  {status.telegramConnected ? "Connected" : "Not connected"}
                </p>
              </div>
            </div>
            <span
              className={`badge ${status.telegramConnected ? "badge-success" : "badge-warning"}`}
            >
              {status.telegramConnected ? "✓ Active" : "⚠ Pending"}
            </span>
          </div>
        </div>

        {/* Footer note */}
        <p
          style={{
            marginTop: "var(--space-8)",
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
            textAlign: "center",
          }}
        >
          Watchlist management and notification history coming soon.
        </p>
      </div>
    </main>
  );
}
