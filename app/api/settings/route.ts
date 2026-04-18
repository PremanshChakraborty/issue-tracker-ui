import { auth } from "@/auth";
import { getInstallation } from "@/lib/kv";
import { mintInstallationToken, getAuthedOctokit } from "@/lib/githubApp";
import type { GlobalSettings } from "@/types";

// ── GET — read settings.json ──────────────────────────────────────────────────
export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const record = await getInstallation(session.user.githubId);
  if (!record) return Response.json({ error: "not_installed" }, { status: 404 });

  const token = await mintInstallationToken(record.installation_id);
  const octokit = getAuthedOctokit(token);

  try {
    const { data } = await octokit.rest.repos.getContent({
      owner: record.repo_owner,
      repo: record.repo_name,
      path: "settings.json",
    });

    if (Array.isArray(data) || data.type !== "file") {
      return Response.json({ error: "not_a_file" }, { status: 400 });
    }

    const raw = Buffer.from(data.content, "base64").toString("utf-8");
    return Response.json({ data: JSON.parse(raw) as GlobalSettings, sha: data.sha });
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status === 404) return Response.json({ error: "file_not_found" }, { status: 404 });
    return Response.json({ error: "github_error" }, { status: 502 });
  }
}

// ── PUT — write settings.json ─────────────────────────────────────────────────
export async function PUT(request: Request) {
  const session = await auth();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json() as { settings: Partial<GlobalSettings>; sha: string };
  if (!body.settings || !body.sha) {
    return Response.json({ error: "missing_fields" }, { status: 400 });
  }

  const record = await getInstallation(session.user.githubId);
  if (!record) return Response.json({ error: "not_installed" }, { status: 404 });

  const token = await mintInstallationToken(record.installation_id);
  const octokit = getAuthedOctokit(token);

  const encoded = Buffer.from(JSON.stringify(body.settings, null, 2)).toString("base64");

  try {
    await octokit.rest.repos.createOrUpdateFileContents({
      owner: record.repo_owner,
      repo: record.repo_name,
      path: "settings.json",
      message: "chore: update settings via Issue Tracker UI",
      content: encoded,
      sha: body.sha,
    });
    return Response.json({ ok: true });
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status === 409) return Response.json({ error: "sha_conflict" }, { status: 409 });
    return Response.json({ error: "github_error" }, { status: 502 });
  }
}
