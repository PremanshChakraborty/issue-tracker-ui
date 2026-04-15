import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { mintInstallationToken, getAuthedOctokit } from "@/lib/githubApp";
import { setInstallation } from "@/lib/kv";
import { NextRequest } from "next/server";

/**
 * GitHub App installation callback.
 *
 * GitHub redirects here after the user completes the App installation wizard.
 * Query params: installation_id, setup_action ("install" | "update")
 *
 * Flow:
 *  1. Verify there is an active NextAuth session.
 *  2. Mint an installation token to query which repo was selected.
 *  3. Assert exactly one repo is accessible (the user must select only one).
 *  4. Persist the record in KV.
 *  5. Redirect to the setup wizard at the telegram step.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.githubId) {
    return redirect("/?error=unauthenticated");
  }

  const { searchParams } = new URL(request.url);
  const installationId = Number(searchParams.get("installation_id"));
  const setupAction = searchParams.get("setup_action");

  if (!installationId || isNaN(installationId)) {
    return redirect("/setup?error=missing_installation_id");
  }

  // Only handle fresh installs; ignore re-configuration events for now.
  if (setupAction !== "install" && setupAction !== "update") {
    return redirect("/setup?step=telegram");
  }

  let repoOwner: string;
  let repoName: string;

  try {
    const token = await mintInstallationToken(installationId);
    const octokit = getAuthedOctokit(token);

    const { data } = await octokit.rest.apps.listReposAccessibleToInstallation({
      per_page: 5,
    });

    if (data.total_count !== 1) {
      // User selected more than one repo, or zero. Reject and ask to reinstall.
      return redirect(
        `/setup?error=wrong_repo_count&count=${data.total_count}`
      );
    }

    const repo = data.repositories[0];
    repoOwner = repo.owner.login;
    repoName = repo.name;
  } catch (err) {
    console.error("[github/callback] Failed to fetch installation repos:", err);
    return redirect("/setup?error=installation_fetch_failed");
  }

  await setInstallation(session.user.githubId, {
    installation_id: installationId,
    repo_owner: repoOwner,
    repo_name: repoName,
    installed_at: new Date().toISOString(),
  });

  return redirect("/setup?step=telegram");
}
