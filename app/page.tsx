import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getInstallation, getTelegramStatus } from "@/lib/kv";

/**
 * Smart root redirect.
 *
 * Reads session + KV state directly from the server to determine where the
 * user is in the onboarding flow, then sends them to the right step.
 * This avoids a client-side flash of the wrong page.
 */
export default async function Home() {
  const session = await auth();

  if (!session?.user?.githubId) {
    redirect("/setup?step=signin");
  }

  const installation = await getInstallation(session.user.githubId);
  if (!installation) redirect("/setup?step=repo");

  const telegram = await getTelegramStatus(session.user.githubId);
  if (!telegram) redirect("/setup?step=telegram");

  redirect("/dashboard");
}
