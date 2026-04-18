import { auth } from "@/auth";
import { getInstallation } from "@/lib/kv";
import { mintInstallationToken, getAuthedOctokit } from "@/lib/githubApp";
import type { IssueConfig, Watchlist } from "@/types";

// ── PATCH — edit per-issue config ─────────────────────────────────────────────
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ ref: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  // ref param is URL-encoded "owner-repo-number" → decode back to "owner/repo#number"
  const { ref: rawRef } = await params;
  // Accept both encoded (URL param) and decoded forms
  const issueRef = decodeURIComponent(rawRef).replace(/-(?=\d+$)/, "#").replace(/-/, "/");

  const patch = await request.json() as Partial<IssueConfig>;

  const record = await getInstallation(session.user.githubId);
  if (!record) return Response.json({ error: "not_installed" }, { status: 404 });

  const token = await mintInstallationToken(record.installation_id);
  const octokit = getAuthedOctokit(token);

  // Read current watchlist
  let watchlist: Watchlist;
  let sha: string;
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner: record.repo_owner,
      repo: record.repo_name,
      path: "watchlist.json",
    });
    if (Array.isArray(data) || data.type !== "file") throw new Error("not_a_file");
    const raw = Buffer.from(data.content, "base64").toString("utf-8");
    watchlist = JSON.parse(raw) as Watchlist;
    sha = data.sha;
  } catch {
    return Response.json({ error: "watchlist_read_failed" }, { status: 502 });
  }

  if (!watchlist.issues[issueRef]) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  // Merge patch
  watchlist.issues[issueRef] = { ...watchlist.issues[issueRef], ...patch };

  const encoded = Buffer.from(JSON.stringify(watchlist, null, 2)).toString("base64");

  try {
    await octokit.rest.repos.createOrUpdateFileContents({
      owner: record.repo_owner,
      repo: record.repo_name,
      path: "watchlist.json",
      message: `chore: update config for ${issueRef} via Issue Tracker UI`,
      content: encoded,
      sha,
    });
  } catch {
    return Response.json({ error: "write_failed" }, { status: 502 });
  }

  return Response.json({ ok: true, updated: watchlist.issues[issueRef] });
}
