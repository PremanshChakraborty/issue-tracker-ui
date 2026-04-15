"use client";

import { useState } from "react";

interface Props {
  githubLogin: string | null;
  onComplete: (owner: string, repo: string) => void;
}

type VerifyState = "idle" | "verifying" | "success" | "error";

export default function Step2CreateRepo({ githubLogin, onComplete }: Props) {
  const [url, setUrl] = useState("");
  const [verifyState, setVerifyState] = useState<VerifyState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [verified, setVerified] = useState<{ owner: string; repo: string } | null>(null);

  const templateUrl = `https://github.com/new?template_name=${
    process.env.NEXT_PUBLIC_TEMPLATE_REPO ?? "issue-tracker"
  }&template_owner=${process.env.NEXT_PUBLIC_TEMPLATE_OWNER ?? ""}`;

  async function verify() {
    setVerifyState("verifying");
    setErrorMsg(null);
    setVerified(null);

    // Parse the URL
    let owner: string;
    let repo: string;
    try {
      const parsed = new URL(url.trim());
      const parts = parsed.pathname.replace(/^\/+/, "").replace(/\/+$/, "").split("/");
      if (parts.length < 2 || !parts[0] || !parts[1]) throw new Error();
      owner = parts[0];
      repo = parts[1].replace(/\.git$/, "");
    } catch {
      setErrorMsg(
        "Invalid URL. Paste the full repository URL, e.g. https://github.com/your-name/your-repo"
      );
      setVerifyState("error");
      return;
    }

    // Ownership check
    if (githubLogin && owner.toLowerCase() !== githubLogin.toLowerCase()) {
      setErrorMsg(
        `The URL must point to your own repository. Expected: ${githubLogin}/… (got ${owner}/…)`
      );
      setVerifyState("error");
      return;
    }

    // GitHub API check (unauthenticated — public repos only)
    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
      if (res.status === 404) {
        setErrorMsg("Repository not found. Make sure the repository is set to Public.");
        setVerifyState("error");
        return;
      }
      if (!res.ok) {
        setErrorMsg("Could not reach the GitHub API. Please try again.");
        setVerifyState("error");
        return;
      }
      const data = await res.json();
      if (data.fork) {
        setErrorMsg(
          "This looks like a fork. Use the template button above to generate a fresh copy."
        );
        setVerifyState("error");
        return;
      }
      // Verified
      setVerified({ owner: data.owner.login, repo: data.name });
      setVerifyState("success");
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
      setVerifyState("error");
    }
  }

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
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          </svg>
        </div>
        <div>
          <h2
            style={{
              fontSize: "var(--text-lg)",
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            Create Your Tracker Repository
          </h2>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
            Generate a personal tracker from our template
          </p>
        </div>
      </div>

      {/* Template button */}
      <a
        id="create-from-template"
        href={templateUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary btn-lg"
        style={{
          display: "flex",
          width: "100%",
          marginBottom: "var(--space-5)",
          textDecoration: "none",
        }}
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
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        Create from Template
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
          Instructions
        </p>
        <ul
          style={{
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2)",
          }}
        >
          {[
            'Name it anything (e.g. "issue-tracker")',
            "Set visibility to Public",
            "Leave all checkboxes unchecked — then click Create repository",
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
              <span style={{ color: "var(--success)", fontWeight: 700, flexShrink: 0 }}>
                ✓
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* URL input */}
      <label
        htmlFor="repo-url"
        style={{
          display: "block",
          fontSize: "var(--text-sm)",
          fontWeight: 500,
          color: "var(--text-secondary)",
          marginBottom: "var(--space-2)",
        }}
      >
        Paste your repository URL
      </label>
      <input
        id="repo-url"
        className={`input${verifyState === "error" ? " input-error" : ""}`}
        type="url"
        placeholder="https://github.com/your-name/your-repo"
        value={url}
        onChange={(e) => {
          setUrl(e.target.value);
          if (verifyState !== "idle") {
            setVerifyState("idle");
            setErrorMsg(null);
            setVerified(null);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && url.trim()) verify();
        }}
        style={{ marginBottom: "var(--space-3)" }}
      />

      {/* Error */}
      {errorMsg && (
        <div
          className="slide-up"
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "var(--space-2)",
            padding: "var(--space-3)",
            background: "var(--critical-bg)",
            border: "1px solid var(--critical-border)",
            borderRadius: "var(--radius-md)",
            marginBottom: "var(--space-4)",
          }}
        >
          <span style={{ color: "var(--critical)", flexShrink: 0, fontWeight: 700 }}>✕</span>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--critical)" }}>{errorMsg}</p>
        </div>
      )}

      {/* Success */}
      {verified && (
        <div
          className="slide-up"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            padding: "var(--space-3)",
            background: "var(--success-bg)",
            border: "1px solid var(--success-border)",
            borderRadius: "var(--radius-md)",
            marginBottom: "var(--space-4)",
          }}
        >
          <span style={{ color: "var(--success)", fontWeight: 700 }}>✓</span>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--success)", fontWeight: 500 }}>
            Verified:{" "}
            <code
              style={{
                background: "transparent",
                border: "none",
                color: "inherit",
                fontWeight: 700,
                padding: 0,
              }}
            >
              {verified.owner}/{verified.repo}
            </code>
          </p>
        </div>
      )}

      {/* Buttons */}
      {verifyState !== "success" ? (
        <button
          id="verify-repo"
          className="btn-primary"
          style={{ width: "100%", marginTop: "var(--space-2)" }}
          disabled={!url.trim() || verifyState === "verifying"}
          onClick={verify}
        >
          {verifyState === "verifying" ? (
            <>
              <div className="spinner" />
              Verifying...
            </>
          ) : (
            "Verify Repository"
          )}
        </button>
      ) : (
        <button
          id="continue-to-step3"
          className="btn-primary"
          style={{ width: "100%", marginTop: "var(--space-2)" }}
          onClick={() => onComplete(verified!.owner, verified!.repo)}
        >
          Continue
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}
    </div>
  );
}
