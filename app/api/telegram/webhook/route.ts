import { NextRequest } from "next/server";
import { mintInstallationToken, getAuthedOctokit } from "@/lib/githubApp";
import {
  getTelegramToken,
  delTelegramToken,
  getInstallation,
  setTelegramStatus,
} from "@/lib/kv";
import { encryptSecret } from "@/lib/encryptSecret";

/**
 * Telegram Bot webhook receiver.
 *
 * Registered via:
 *   POST https://api.telegram.org/bot{TOKEN}/setWebhook
 *     { url: "https://.../api/telegram/webhook", secret_token: "{TELEGRAM_WEBHOOK_SECRET}" }
 *
 * Full flow when user hits "Start" in Telegram:
 *  1. Verify X-Telegram-Bot-Api-Secret-Token header.
 *  2. Parse the /start {uuid} message.
 *  3. Look up the connect-token in KV → get { installation_id, github_user_id }.
 *  4. Mint a GitHub installation token.
 *  5. Fetch the repo's Actions public key.
 *  6. Encrypt + set TELEGRAM_CHAT_ID as a GitHub secret.
 *  7. Encrypt + set TELEGRAM_BOT_TOKEN as a GitHub secret (same bot for all users).
 *  8. Mark user as connected in KV, delete the one-time token.
 *  9. Reply to the user on Telegram confirming success.
 */
export async function POST(request: NextRequest) {
  // ── 1. Security: verify Telegram webhook signature ──────────────────────
  const incomingSecret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
  if (incomingSecret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response(null, { status: 403 });
  }

  let update: TelegramUpdate;
  try {
    update = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }

  const text: string = update?.message?.text ?? "";
  const chatId: number | undefined = update?.message?.chat?.id;
  const messageId: number | undefined = update?.message?.message_id;

  // ── 2. Only handle /start {uuid} messages ───────────────────────────────
  if (!text.startsWith("/start") || chatId === undefined) {
    // Not a start command — Telegram expects 200 even if we ignore the update.
    return new Response(null, { status: 200 });
  }

  const parts = text.trim().split(/\s+/);
  const uuid = parts[1]; // undefined if bare /start with no token

  if (!uuid) {
    // Bare /start — user opened the bot without a deep link.
    await sendTelegramMessage(
      chatId,
      "👋 Welcome\\! Please use the *Connect Telegram* button in the Issue Tracker setup page to link your account\\."
    );
    return new Response(null, { status: 200 });
  }

  // ── 3. Validate the connect token ───────────────────────────────────────
  const tokenRecord = await getTelegramToken(uuid);
  if (!tokenRecord) {
    await sendTelegramMessage(
      chatId,
      "❌ This link has *expired* \\(10 minute limit\\)\\.\n\nPlease click *Connect Telegram* again from the setup page to get a fresh link\\."
    );
    return new Response(null, { status: 200 });
  }

  const { installation_id, github_user_id } = tokenRecord;

  // ── 4. Mint GitHub installation token ───────────────────────────────────
  let githubToken: string;
  try {
    githubToken = await mintInstallationToken(installation_id);
  } catch (err) {
    console.error("[telegram/webhook] Failed to mint installation token:", err);
    await sendTelegramMessage(
      chatId,
      "⚠️ Could not connect to your GitHub repository\\. Please try again from the setup page\\."
    );
    return new Response(null, { status: 200 });
  }

  const octokit = getAuthedOctokit(githubToken);

  // ── 5. Fetch repo details and Actions public key ─────────────────────────
  const install = await getInstallation(github_user_id);
  if (!install) {
    console.error("[telegram/webhook] No installation record found for user:", github_user_id);
    return new Response(null, { status: 200 });
  }

  let publicKeyData: { key: string; key_id: string };
  try {
    const { data } = await octokit.rest.actions.getRepoPublicKey({
      owner: install.repo_owner,
      repo: install.repo_name,
    });
    publicKeyData = data;
  } catch (err) {
    console.error("[telegram/webhook] Failed to fetch repo public key:", err);
    await sendTelegramMessage(
      chatId,
      "⚠️ Could not access your repository secrets\\. Please check the GitHub App is still installed and try again\\."
    );
    return new Response(null, { status: 200 });
  }

  // ── 6 & 7. Encrypt and inject both secrets ───────────────────────────────
  try {
    const [encryptedChatId, encryptedBotToken] = await Promise.all([
      encryptSecret(publicKeyData.key, String(chatId)),
      encryptSecret(publicKeyData.key, process.env.TELEGRAM_BOT_TOKEN ?? ""),
    ]);

    await Promise.all([
      octokit.rest.actions.createOrUpdateRepoSecret({
        owner: install.repo_owner,
        repo: install.repo_name,
        secret_name: "TELEGRAM_CHAT_ID",
        encrypted_value: encryptedChatId,
        key_id: publicKeyData.key_id,
      }),
      octokit.rest.actions.createOrUpdateRepoSecret({
        owner: install.repo_owner,
        repo: install.repo_name,
        secret_name: "TELEGRAM_BOT_TOKEN",
        encrypted_value: encryptedBotToken,
        key_id: publicKeyData.key_id,
      }),
    ]);
  } catch (err) {
    console.error("[telegram/webhook] Failed to set GitHub secrets:", err);
    await sendTelegramMessage(
      chatId,
      "⚠️ Failed to save your Telegram credentials to GitHub\\. Please try again from the setup page\\."
    );
    return new Response(null, { status: 200 });
  }

  // ── 8. Persist connection status, invalidate one-time token ─────────────
  await Promise.all([
    setTelegramStatus(github_user_id),
    delTelegramToken(uuid),
  ]);

  // ── 9. Confirm success to the user ──────────────────────────────────────
  await sendTelegramMessage(
    chatId,
    "✅ *Successfully connected to your GitHub Issue Tracker\\!*\n\n" +
      "Notifications are now active\\. Your tracker will start sending alerts on its next scheduled run\\.\n\n" +
      "_You can close this chat — we'll message you here automatically\\._"
  );

  // Delete the "Start" command message to keep the chat clean.
  if (messageId !== undefined) {
    await deleteTelegramMessage(chatId, messageId).catch(() => {
      // Non-critical — ignore if it fails.
    });
  }

  return new Response(null, { status: 200 });
}

// ── Telegram API helpers ─────────────────────────────────────────────────────

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

async function sendTelegramMessage(chatId: number, text: string) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "MarkdownV2",
    }),
  });
}

async function deleteTelegramMessage(chatId: number, messageId: number) {
  await fetch(`${TELEGRAM_API}/deleteMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
  });
}

// ── Telegram type definitions ────────────────────────────────────────────────

interface TelegramUpdate {
  message?: {
    message_id: number;
    text?: string;
    chat: {
      id: number;
    };
  };
}
