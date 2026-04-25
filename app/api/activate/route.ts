import { auth } from "@/auth";
import { getInstallation, setActivated } from "@/lib/kv";

export async function POST() {
  const session = await auth();
  if (!session?.user?.githubId) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const installation = await getInstallation(session.user.githubId);
  if (!installation) {
    return Response.json({ error: "not_installed" }, { status: 404 });
  }

  await setActivated(session.user.githubId);

  return Response.json({ ok: true });
}
