"use client";

import { useEffect } from "react";
import { signIn, useSession } from "next-auth/react";

interface Props {
  onComplete: (githubLogin: string) => void;
}

export default function Step1SignIn({ onComplete }: Props) {
  const { data: session, status } = useSession();

  // Auto-advance if the user already has a session (e.g. they refreshed the page)
  useEffect(() => {
    if (status === "authenticated" && session?.user?.githubLogin) {
      onComplete(session.user.githubLogin);
    }
  }, [status, session, onComplete]);

  return (
    <div style={{ textAlign: "center" }}>
      {/* Logo mark */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "var(--space-3)",
          marginBottom: "var(--space-6)",
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "var(--radius-md)",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-default)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="var(--text-primary)">
            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
        </div>

        {/* Lightning connector */}
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "var(--accent-muted)",
            border: "1px solid rgba(110,86,207,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </div>
      </div>

      <h2
        style={{
          fontSize: "var(--text-2xl)",
          fontWeight: 700,
          marginBottom: "var(--space-2)",
          color: "var(--text-primary)",
          letterSpacing: "-0.02em",
        }}
      >
        Smart GitHub Issue Tracking
      </h2>
      <p
        style={{
          color: "var(--text-secondary)",
          fontSize: "var(--text-sm)",
          marginBottom: "var(--space-8)",
          lineHeight: 1.7,
        }}
      >
        For open source contributors.
        <br />
        Signal over noise.
      </p>

      <button
        id="sign-in-github"
        className="btn-primary btn-lg"
        style={{ width: "100%" }}
        onClick={() => signIn("github")}
        disabled={status === "loading" || status === "authenticated"}
      >
        {status === "loading" || status === "authenticated" ? (
          <>
            <div className="spinner" />
            {status === "authenticated" ? "Signed in, loading..." : "Loading..."}
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            Sign in with GitHub
          </>
        )}
      </button>

      <p
        style={{
          marginTop: "var(--space-5)",
          fontSize: "var(--text-xs)",
          color: "var(--text-muted)",
          lineHeight: 1.6,
        }}
      >
        We only read your GitHub identity.
        <br />
        Repository access is granted in step 3.
      </p>
    </div>
  );
}
