import { auth } from "@/auth";
import { getInstallation } from "@/lib/kv";
import { mintInstallationToken, getAuthedOctokit } from "@/lib/githubApp";
import type { IssueConfig, IssueMode, Watchlist } from "@/types";
import { MODE_DEFAULTS } from "@/types";

// ── Helper: parse GitHub issue URL ──────────────────────────────────────────
function parseIssueUrl(url: string): { owner: string; repo: string; number: number } | null {
  try {
    const u = new URL(url);
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

// ── Helper: read watchlist from repo ─────────────────────────────────────────
async function readWatchlist(octokit: ReturnType<typeof getAuthedOctokit>, owner: string, repo: string) {
  const { data } = await octokit.rest.repos.getContent({ owner, repo, path: "watchlist.json" });
  if (Array.isArray(data) || data.type !== "file") throw new Error("not_a_file");
  const raw = Buffer.from(data.content, "base64").toString("utf-8");
  return { watchlist: JSON.parse(raw) as Watchlist, sha: data.sha };
}

// ── Helper: write watchlist to repo ──────────────────────────────────────────
async function writeWatchlist(
  octokit: ReturnType<typeof getAuthedOctokit>,
  owner: string,
  repo: string,
  watchlist: Watchlist,
  sha: string,
  message: string
) {
  const encoded = Buffer.from(JSON.stringify(watchlist, null, 2)).toString("base64");
  await octokit.rest.repos.createOrUpdateFileContents({
    owner, repo, path: "watchlist.json", message, content: encoded, sha,
  });
}

// ── POST — add new issue ──────────────────────────────────────────────────────
export async function POST(request: Request) {
  const session = await auth();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json() as {
    url: string;
    mode: IssueMode;
    overrides?: Partial<IssueConfig>;
  };

  // Server-side URL validation
  const parsed = parseIssueUrl(body.url);
  if (!parsed) {
    return Response.json({ error: "invalid_url", message: "Must be a GitHub issue URL" }, { status: 400 });
  }

  const record = await getInstallation(session.user.githubId);
  if (!record) return Response.json({ error: "not_installed" }, { status: 404 });

  const token = await mintInstallationToken(record.installation_id);
  const octokit = getAuthedOctokit(token);

  // Fetch issue metadata from GitHub
  let issueData: { title: string; state: string; user: { login: string } | null } | null = null;
  try {
    const { data } = await octokit.rest.issues.get({
      owner: parsed.owner,
      repo: parsed.repo,
      issue_number: parsed.number,
    });
    issueData = { title: data.title, state: data.state, user: data.user };
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status === 404) {
      return Response.json({ error: "issue_not_found", message: "Issue not found — check the URL" }, { status: 404 });
    }
    return Response.json({ error: "github_error" }, { status: 502 });
  }

  const issueRef = `${parsed.owner}/${parsed.repo}#${parsed.number}`;

  // Read current watchlist
  let watchlist: Watchlist;
  let sha: string;
  try {
    ({ watchlist, sha } = await readWatchlist(octokit, record.repo_owner, record.repo_name));
  } catch {
    return Response.json({ error: "watchlist_read_failed" }, { status: 502 });
  }

  // Duplicate check
  if (watchlist.issues[issueRef]) {
    return Response.json({ error: "already_watched", message: "Already watching this issue" }, { status: 409 });
  }

  // Build issue config from mode defaults + overrides
  const defaults = MODE_DEFAULTS[body.mode];
  const issueConfig: IssueConfig = {
    repo: `${parsed.owner}/${parsed.repo}`,
    issue_number: parsed.number,
    title: issueData.title,
    added_at: new Date().toISOString(),
    mode: body.mode,
    priority: defaults.priority ?? "watching",
    inactivity_threshold_days: defaults.inactivity_threshold_days ?? 14,
    stale_re_alert_days: defaults.stale_re_alert_days ?? 7,
    watch_users: defaults.watch_users ?? [],
    ignore_users: [],
    notify_on: defaults.notify_on ?? [],
    priority_bypass_quiet_hours: defaults.priority_bypass_quiet_hours ?? false,
    snooze_until: null,
    notes: "",
    auto_remove_on_close: defaults.auto_remove_on_close ?? false,
    show_bot_comments: false,
    ...(body.overrides ?? {}),
  };

  watchlist.issues[issueRef] = issueConfig;

  try {
    await writeWatchlist(
      octokit, record.repo_owner, record.repo_name, watchlist, sha,
      `feat: watch ${issueRef} via Issue Tracker UI`
    );
  } catch {
    return Response.json({ error: "write_failed" }, { status: 502 });
  }

  return Response.json({ ok: true, issueRef, issueConfig, isClosedWarning: issueData.state !== "open" });
}

// ── DELETE — remove issue ─────────────────────────────────────────────────────
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json() as { ref: string };
  if (!body.ref) return Response.json({ error: "missing_ref" }, { status: 400 });

  const record = await getInstallation(session.user.githubId);
  if (!record) return Response.json({ error: "not_installed" }, { status: 404 });

  const token = await mintInstallationToken(record.installation_id);
  const octokit = getAuthedOctokit(token);

  let watchlist: Watchlist;
  let sha: string;
  try {
    ({ watchlist, sha } = await readWatchlist(octokit, record.repo_owner, record.repo_name));
  } catch {
    return Response.json({ error: "watchlist_read_failed" }, { status: 502 });
  }

  if (!watchlist.issues[body.ref]) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  delete watchlist.issues[body.ref];

  try {
    await writeWatchlist(
      octokit, record.repo_owner, record.repo_name, watchlist, sha,
      `chore: unwatch ${body.ref} via Issue Tracker UI`
    );
  } catch {
    return Response.json({ error: "write_failed" }, { status: 502 });
  }

  return Response.json({ ok: true });
}
