"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  onComplete: () => void;
}

type State = "loading" | "ready" | "waiting" | "expired" | "connected" | "error";

const POLL_INTERVAL_MS = 3000;
const TOKEN_EXPIRY_MS = 9.5 * 60 * 1000; // 9.5 min (server TTL is 10)

export default function Step4ConnectTelegram({ onComplete }: Props) {
  const [state, setState] = useState<State>("loading");
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const expiryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (expiryRef.current) {
      clearTimeout(expiryRef.current);
      expiryRef.current = null;
    }
  };

  const fetchToken = useCallback(async () => {
    setState("loading");
    setErrorMsg(null);
    stopPolling();

    try {
      const res = await fetch("/api/telegram/connect-token", { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDeepLink(`https://t.me/${data.botName}?start=${data.token}`);
      setState("ready");
    } catch {
      setErrorMsg("Could not generate your Telegram link. Please try again.");
      setState("error");
    }
  }, []);

  useEffect(() => {
    fetchToken();
    return stopPolling;
  }, [fetchToken]);

  function startWaiting() {
    setState("waiting");

    expiryRef.current = setTimeout(() => {
      stopPolling();
      setState("expired");
    }, TOKEN_EXPIRY_MS);

    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/telegram/status");
        const data = await res.json();
        if (data.connected) {
          stopPolling();
          setState("connected");
          setTimeout(onComplete, 1400); // brief success flash before advancing
        }
      } catch {
        // network error — keep polling
      }
    }, POLL_INTERVAL_MS);
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
            background: "rgba(39,174,239,0.12)",
            border: "1px solid rgba(39,174,239,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {/* Telegram paper-plane logo */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#27AEEF">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
          </svg>
        </div>
        <div>
          <h2
            style={{ fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--text-primary)" }}
          >
            Connect Telegram
          </h2>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
            Receive issue notifications directly in your chat
          </p>
        </div>
      </div>

      {/* Connected success */}
      {state === "connected" && (
        <div className="fade-in" style={{ textAlign: "center", padding: "var(--space-8) 0" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "var(--success-bg)",
              border: "1px solid var(--success-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto var(--space-4)",
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--success)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p
            style={{
              fontSize: "var(--text-lg)",
              fontWeight: 700,
              color: "var(--success)",
              marginBottom: "var(--space-2)",
            }}
          >
            Telegram Connected!
          </p>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
            Notifications will be delivered to your account.
          </p>
        </div>
      )}

      {/* Loading */}
      {state === "loading" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            padding: "var(--space-6)",
            justifyContent: "center",
          }}
        >
          <div className="spinner" />
          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
            Generating your link...
          </span>
        </div>
      )}

      {/* Error */}
      {state === "error" && (
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
              color: "var(--critical)",
              marginBottom: "var(--space-3)",
            }}
          >
            ✕ {errorMsg}
          </p>
          <button
            className="btn-ghost"
            onClick={fetchToken}
            style={{ fontSize: "var(--text-xs)" }}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Expired */}
      {state === "expired" && (
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
              marginBottom: "var(--space-1)",
            }}
          >
            ⏱ Your link has expired
          </p>
          <p
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--text-secondary)",
              marginBottom: "var(--space-3)",
            }}
          >
            Telegram links are valid for 10 minutes. Generate a new one to continue.
          </p>
          <button
            className="btn-ghost"
            onClick={fetchToken}
            style={{ fontSize: "var(--text-xs)" }}
          >
            Generate New Link
          </button>
        </div>
      )}

      {/* Ready or Waiting */}
      {(state === "ready" || state === "waiting") && (
        <>
          {/* How it works */}
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
              What happens
            </p>
            <ol
              style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}
            >
              {[
                "Telegram opens to our bot",
                'Press the "Start" button — that\'s it',
                "Your credentials are injected automatically",
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
                  <span style={{ color: "var(--accent)", fontWeight: 700, flexShrink: 0, width: 18 }}>
                    {i + 1}.
                  </span>
                  {item}
                </li>
              ))}
            </ol>
          </div>

          {/* Deep link button */}
          <a
            id="open-telegram"
            href={deepLink!}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary btn-lg"
            style={{
              display: "flex",
              width: "100%",
              marginBottom: "var(--space-3)",
              textDecoration: "none",
              background: "#229ED9",
              border: "1px solid rgba(34,158,217,0.5)",
            }}
            onClick={() => {
              if (state === "ready") startWaiting();
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
            Open Telegram Bot
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

          {/* Polling indicator */}
          {state === "waiting" && (
            <div
              className="fade-in"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
                padding: "var(--space-3) var(--space-4)",
                background: "var(--accent-muted)",
                border: "1px solid rgba(110,86,207,0.25)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <div className="dots">
                <span />
                <span />
                <span />
              </div>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                Waiting for you to press{" "}
                <strong style={{ color: "var(--text-primary)" }}>Start</strong> in Telegram...
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
