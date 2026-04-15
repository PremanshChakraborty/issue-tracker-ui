import { auth } from "@/auth";
import { getTelegramStatus } from "@/lib/kv";

/**
 * Polling endpoint for the Telegram connection step.
 *
 * The frontend calls this every 3 seconds after the user opens the deep link.
 * Once the webhook fires and sets the KV flag, this returns { connected: true }
 * and the wizard auto-advances to the Activate step.
 *
 * Response: { connected: boolean }
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.githubId) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const status = await getTelegramStatus(session.user.githubId);

  return Response.json({ connected: !!status });
}
