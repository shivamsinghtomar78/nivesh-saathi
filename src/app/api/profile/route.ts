import { jsonSuccess } from "@/lib/server/api";
import { requireFirebaseSession } from "@/lib/server/auth";
import { getUserChatSummaries } from "@/lib/server/persistence";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireFirebaseSession(request);

  if (!auth.ok) {
    return auth.response;
  }

  const chats = await getUserChatSummaries(auth.session.uid);

  return jsonSuccess({
    user: {
      uid: auth.session.uid,
      email: auth.session.email ?? null,
      phoneNumber: auth.session.phone_number ?? null,
      name: auth.session.name ?? null,
      picture: auth.session.picture ?? null,
      provider: auth.session.firebase.sign_in_provider ?? null,
    },
    chats,
  });
}
