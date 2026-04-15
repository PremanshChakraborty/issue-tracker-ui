"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import StepIndicator from "./setup/StepIndicator";
import Step1SignIn from "./setup/Step1SignIn";
import Step2CreateRepo from "./setup/Step2CreateRepo";
import Step3InstallApp from "./setup/Step3InstallApp";
import Step4ConnectTelegram from "./setup/Step4ConnectTelegram";
import Step5Activate from "./setup/Step5Activate";

type Step = 1 | 2 | 3 | 4 | 5;

const STEP_MAP: Record<string, Step> = {
  signin: 1,
  repo: 2,
  app: 3,
  telegram: 4,
  activate: 5,
};

export default function SetupWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(true);
  const [githubLogin, setGithubLogin] = useState<string | null>(null);
  const [repoOwner, setRepoOwner] = useState<string | null>(null);
  const [repoName, setRepoName] = useState<string | null>(null);
  const [mismatch, setMismatch] = useState<{ actual: string; expected: string } | null>(null);

  // Installation token — in-memory only, never stored anywhere persistent
  const [token, setToken] = useState<string | null>(null);
  const [tokenExpiresAt, setTokenExpiresAt] = useState<string | null>(null);

  /**
   * On mount: fetch /api/auth/status and determine the correct wizard step.
   * The URL param is used as a hint only — the actual KV state wins.
   */
  useEffect(() => {
    const paramKey = searchParams.get("step");
    const paramStep: Step | null = paramKey ? (STEP_MAP[paramKey] ?? null) : null;

    (async () => {
      try {
        const res = await fetch("/api/auth/status");
        const data = await res.json();

        if (!data.authenticated) {
          setStep(1);
          setLoading(false);
          return;
        }

        setGithubLogin(data.githubLogin);

        if (!data.installed) {
          // Restore repo from sessionStorage in case user refreshed mid-step
          const savedOwner = sessionStorage.getItem("repoOwner");
          const savedName = sessionStorage.getItem("repoName");
          if (savedOwner) setRepoOwner(savedOwner);
          if (savedName) setRepoName(savedName);
          setStep(paramStep && paramStep >= 2 ? paramStep : 2);
          setLoading(false);
          return;
        }

        // App is installed — check if it was installed on the right repo
        const savedOwner = sessionStorage.getItem("repoOwner");
        const savedName = sessionStorage.getItem("repoName");

        if (savedOwner && savedName) {
          const ownerOk = data.repoOwner === savedOwner;
          const nameOk = data.repoName === savedName;
          if (!ownerOk || !nameOk) {
            // Wrong repo installed — send back to step 3 with error state
            setRepoOwner(savedOwner);
            setRepoName(savedName);
            setMismatch({
              actual: `${data.repoOwner}/${data.repoName}`,
              expected: `${savedOwner}/${savedName}`,
            });
            setStep(3);
            setLoading(false);
            return;
          }
        }

        setRepoOwner(data.repoOwner);
        setRepoName(data.repoName);

        if (!data.telegramConnected) {
          // Skip step 3 (already installed) — go to telegram
          setStep(paramStep && paramStep >= 4 ? paramStep : 4);
          setLoading(false);
          return;
        }

        // Fully configured — go to dashboard
        router.replace("/dashboard");
      } catch {
        setStep(1);
        setLoading(false);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — intentional mount-only

  /** Mints or returns a cached 1-hour installation token. */
  const getValidToken = useCallback(async (): Promise<string> => {
    if (token && tokenExpiresAt && new Date(tokenExpiresAt) > new Date()) {
      return token;
    }
    const res = await fetch("/api/auth/token");
    if (!res.ok) throw new Error("Failed to mint GitHub installation token");
    const data = await res.json();
    setToken(data.token);
    setTokenExpiresAt(data.expiresAt);
    return data.token;
  }, [token, tokenExpiresAt]);

  function advance(nextStep: Step, extra?: { repoOwner?: string; repoName?: string }) {
    if (extra?.repoOwner !== undefined) setRepoOwner(extra.repoOwner);
    if (extra?.repoName !== undefined) setRepoName(extra.repoName);
    setMismatch(null);
    setStep(nextStep);
  }

  if (loading) {
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

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-6)",
        background:
          "radial-gradient(ellipse at 50% -20%, rgba(110,86,207,0.18) 0%, transparent 55%)",
      }}
    >
      {/* Subtle grid overlay */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage:
            "linear-gradient(var(--border-muted) 1px, transparent 1px), linear-gradient(90deg, var(--border-muted) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          opacity: 0.25,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Brand header */}
      <div
        style={{
          marginBottom: "var(--space-6)",
          textAlign: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            justifyContent: "center",
            marginBottom: "var(--space-1)",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span
            style={{
              fontSize: "var(--text-base)",
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            Issue Tracker
          </span>
        </div>
        <p
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Step {step} of 5
        </p>
      </div>

      {/* Wizard card */}
      <div
        className="glass slide-up"
        style={{
          maxWidth: 520,
          width: "100%",
          padding: "var(--space-8)",
          position: "relative",
          zIndex: 1,
        }}
      >
        <StepIndicator currentStep={step} />

        <div style={{ marginTop: "var(--space-8)" }}>
          {step === 1 && (
            <Step1SignIn
              onComplete={(login) => {
                setGithubLogin(login);
                advance(2);
              }}
            />
          )}

          {step === 2 && (
            <Step2CreateRepo
              githubLogin={githubLogin}
              onComplete={(owner, repo) => {
                sessionStorage.setItem("repoOwner", owner);
                sessionStorage.setItem("repoName", repo);
                advance(3, { repoOwner: owner, repoName: repo });
              }}
            />
          )}

          {step === 3 && (
            <Step3InstallApp
              expectedRepoOwner={repoOwner}
              expectedRepoName={repoName}
              initialMismatch={mismatch}
              onComplete={(owner, repo) => {
                sessionStorage.removeItem("repoOwner");
                sessionStorage.removeItem("repoName");
                advance(4, { repoOwner: owner, repoName: repo });
              }}
            />
          )}

          {step === 4 && <Step4ConnectTelegram onComplete={() => advance(5)} />}

          {step === 5 && (
            <Step5Activate
              repoOwner={repoOwner!}
              repoName={repoName!}
              getValidToken={getValidToken}
              onComplete={() => router.push("/dashboard")}
            />
          )}
        </div>
      </div>

      {/* Footer */}
      <p
        style={{
          marginTop: "var(--space-5)",
          fontSize: "var(--text-xs)",
          color: "var(--text-muted)",
          position: "relative",
          zIndex: 1,
        }}
      >
        Need help?{" "}
        <a
          href={`https://github.com/${process.env.NEXT_PUBLIC_TEMPLATE_OWNER}/${process.env.NEXT_PUBLIC_TEMPLATE_REPO}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          View documentation
        </a>
      </p>
    </main>
  );
}
