import { auth } from "@/auth";
import { getInstallation, getTelegramStatus } from "@/lib/kv";

/**
 * Single source of truth for the frontend's onboarding state.
 *
 * Used by:
 *  - app/page.tsx (smart redirect on root route)
 *  - SetupWizard (step polling)
 *
 * Response shape:
 *  {
 *    authenticated: boolean,
 *    githubLogin: string | null,
 *    installed: boolean,
 *    repoOwner: string | null,
 *    repoName: string | null,
 *    telegramConnected: boolean,
 *  }
 */
export async function GET() {
  const session = await auth();

  if (!session?.user?.githubId) {
    return Response.json({ authenticated: false });
  }

  const installation = await getInstallation(session.user.githubId);
  const telegram = installation
    ? await getTelegramStatus(session.user.githubId)
    : null;

  return Response.json({
    authenticated: true,
    githubLogin: session.user.githubLogin ?? null,
    installed: !!installation,
    repoOwner: installation?.repo_owner ?? null,
    repoName: installation?.repo_name ?? null,
    telegramConnected: !!telegram,
  });
}
