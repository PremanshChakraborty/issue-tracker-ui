import { auth } from "@/auth";
import { getInstallation } from "@/lib/kv";
import { mintInstallationToken } from "@/lib/githubApp";

/**
 * Mints a fresh 1-hour GitHub App installation access token.
 *
 * The token is scoped exclusively to the user's generated tracker repo.
 * The frontend stores it in memory (never localStorage) and calls this
 * endpoint to silently refresh when the 55-minute safety window expires.
 *
 * Response: { token, expiresAt, repoOwner, repoName }
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.githubId) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const record = await getInstallation(session.user.githubId);
  if (!record) {
    return Response.json({ error: "not_installed" }, { status: 404 });
  }

  let token: string;
  try {
    token = await mintInstallationToken(record.installation_id);
  } catch (err) {
    console.error("[auth/token] Failed to mint installation token:", err);
    return Response.json({ error: "token_mint_failed" }, { status: 502 });
  }

  // Return 55-minute expiry as a safety window (true TTL is 60 min).
  const expiresAt = new Date(Date.now() + 55 * 60 * 1000).toISOString();

  return Response.json({
    token,
    expiresAt,
    repoOwner: record.repo_owner,
    repoName: record.repo_name,
  });
}
