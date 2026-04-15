import { randomUUID } from "crypto";
import { auth } from "@/auth";
import { getInstallation, setTelegramToken } from "@/lib/kv";

/**
 * Generates a short-lived UUID token embedded in the Telegram deep link.
 *
 * t.me/{botName}?start={uuid}
 *
 * The token maps to the user's installation ID in KV with a 10-minute TTL.
 * When the user hits "Start" in Telegram, the bot webhook reads this token,
 * looks up the installation, and injects TELEGRAM_CHAT_ID + TELEGRAM_BOT_TOKEN
 * as GitHub secrets — all server-side, user never handles credentials.
 *
 * Response: { token, botName }
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.githubId) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const record = await getInstallation(session.user.githubId);
  if (!record) {
    return Response.json(
      { error: "not_installed", message: "Complete the GitHub App installation first." },
      { status: 400 }
    );
  }

  const uuid = randomUUID();

  await setTelegramToken(uuid, {
    installation_id: record.installation_id,
    github_user_id: session.user.githubId,
  });

  return Response.json({
    token: uuid,
    botName: process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME ?? "",
  });
}
