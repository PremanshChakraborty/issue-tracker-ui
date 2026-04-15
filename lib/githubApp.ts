import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";

/**
 * Lazily creates the app auth instance on demand.
 *
 * createAppAuth validates `appId` at construction time, so we cannot call it
 * at module level — the env var won't be available during Next.js static
 * analysis / build-time page collection.
 */
function getAppAuth() {
  return createAppAuth({
    appId: Number(process.env.GITHUB_APP_ID),
    privateKey: (process.env.GITHUB_APP_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
  });
}

export async function mintInstallationToken(installationId: number) {
  const appAuth = getAppAuth();
  const { token } = await appAuth({ type: "installation", installationId });
  return token;
}

export function getAuthedOctokit(token: string) {
  return new Octokit({ auth: token });
}
