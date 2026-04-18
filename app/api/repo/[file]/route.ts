import { auth } from "@/auth";
import { getInstallation } from "@/lib/kv";
import { mintInstallationToken, getAuthedOctokit } from "@/lib/githubApp";

const ALLOWED_FILES = [
  "watchlist.json",
  "settings.json",
  "state.json",
  "notifications.json",
] as const;

type AllowedFile = (typeof ALLOWED_FILES)[number];

function isAllowed(file: string): file is AllowedFile {
  return (ALLOWED_FILES as readonly string[]).includes(file);
}

// ── GET — read a JSON file from the repo ──────────────────────────────────────
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> }
) {
  const { file } = await params;

  if (!isAllowed(file)) {
    return Response.json({ error: "forbidden_file" }, { status: 400 });
  }

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
      path: file,
    });

    // getContent returns an array for directories; for files it returns an object
    if (Array.isArray(data) || data.type !== "file") {
      return Response.json({ error: "not_a_file" }, { status: 400 });
    }

    const content = Buffer.from(data.content, "base64").toString("utf-8");
    const parsed = JSON.parse(content);

    return Response.json({ data: parsed, sha: data.sha });
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status === 404) {
      return Response.json({ error: "file_not_found" }, { status: 404 });
    }
    console.error(`[repo/${file}] GET error:`, err);
    return Response.json({ error: "github_error" }, { status: 502 });
  }
}

// ── PUT — commit an updated JSON file to the repo ─────────────────────────────
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ file: string }> }
) {
  const { file } = await params;

  if (!isAllowed(file)) {
    return Response.json({ error: "forbidden_file" }, { status: 400 });
  }

  const session = await auth();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json() as {
    content: unknown;
    sha: string;
    message?: string;
  };

  if (!body.content || !body.sha) {
    return Response.json({ error: "missing_fields" }, { status: 400 });
  }

  const record = await getInstallation(session.user.githubId);
  if (!record) return Response.json({ error: "not_installed" }, { status: 404 });

  const token = await mintInstallationToken(record.installation_id);
  const octokit = getAuthedOctokit(token);

  const encoded = Buffer.from(JSON.stringify(body.content, null, 2), "utf-8").toString("base64");

  try {
    await octokit.rest.repos.createOrUpdateFileContents({
      owner: record.repo_owner,
      repo: record.repo_name,
      path: file,
      message: body.message ?? `chore: update ${file} via Issue Tracker UI`,
      content: encoded,
      sha: body.sha,
    });

    return Response.json({ ok: true });
  } catch (err: unknown) {
    console.error(`[repo/${file}] PUT error:`, err);
    const status = (err as { status?: number }).status;
    if (status === 409) {
      // SHA conflict — the file was updated concurrently
      return Response.json({ error: "sha_conflict" }, { status: 409 });
    }
    return Response.json({ error: "github_error" }, { status: 502 });
  }
}
