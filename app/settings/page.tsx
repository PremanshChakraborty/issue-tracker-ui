"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import SettingsForm from "@/components/settings/SettingsForm";
import type { GlobalSettings } from "@/types";

interface Status {
  authenticated: boolean;
  installed: boolean;
  repoOwner: string;
  repoName: string;
  telegramConnected: boolean;
}

// Default settings shown when settings.json doesn't exist yet
const DEFAULT_SETTINGS: GlobalSettings = {
  cron_interval_minutes: 30,
  digest_mode: false,
  digest_time: "08:00",
  quiet_hours_start: "23:00",
  quiet_hours_end: "07:00",
  timezone: "UTC",
  filter_bots: true,
  min_comment_length: 0,
  spike_comment_threshold: 5,
  default_mode: "inactivity_watch",
};

export default function SettingsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [sha, setSha] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auth check
  useEffect(() => {
    fetch("/api/auth/status")
      .then(r => r.json())
      .then((d: Status) => {
        if (!d.authenticated) { router.replace("/"); return; }
        if (!d.installed) { router.replace("/setup?step=repo"); return; }
        setStatus(d);
      })
      .catch(() => router.replace("/"));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch settings
  useEffect(() => {
    if (!status) return;
    setLoading(true);
    setError(null);
    fetch("/api/repo/settings.json")
      .then(r => r.json())
      .then((res) => {
        if (res.error === "file_not_found") {
          // settings.json doesn't exist yet — use defaults and sha=""
          setSettings(DEFAULT_SETTINGS);
          setSha("");
        } else if (res.data) {
          setSettings({ ...DEFAULT_SETTINGS, ...res.data });
          setSha(res.sha ?? "");
        } else {
          setError("Failed to load settings.");
        }
      })
      .catch(() => setError("Network error loading settings."))
      .finally(() => setLoading(false));
  }, [status]);

  if (!status) {
    return (
      <main style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="spinner spinner-lg" />
      </main>
    );
  }

  return (
    <AppShell repoOwner={status.repoOwner} repoName={status.repoName} isActive={status.telegramConnected}>
      <div style={{ minHeight: "100dvh" }}>

        {/* Header */}
        <div className="page-header" id="settings-header">
          <div>
            <h1 className="page-title">Settings</h1>
            <p className="page-subtitle">
              Global tracker configuration — stored in{" "}
              <code style={{ fontSize: "var(--text-xs)" }}>settings.json</code>
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="page-body" style={{ maxWidth: 680 }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="glass" style={{ padding: "var(--space-6)" }}>
                  <div className="skeleton" style={{ height: 16, width: 140, marginBottom: "var(--space-5)" }} />
                  <div className="skeleton" style={{ height: 12, marginBottom: "var(--space-3)" }} />
                  <div className="skeleton" style={{ height: 12, width: "70%" }} />
                </div>
              ))}
            </div>
          ) : error ? (
            <div style={{
              padding: "var(--space-4)",
              borderRadius: "var(--radius-md)",
              background: "var(--critical-bg)",
              border: "1px solid var(--critical-border)",
              color: "var(--critical)",
              fontSize: "var(--text-sm)",
            }}>
              {error}
            </div>
          ) : settings ? (
            <SettingsForm initial={settings} sha={sha} />
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
