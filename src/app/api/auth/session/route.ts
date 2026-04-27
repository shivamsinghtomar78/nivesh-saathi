import { cookies } from "next/headers";
import { z } from "zod";

import { jsonError, jsonSuccess, handleRouteError } from "@/lib/server/api";
import { getFirebaseAdminAuth } from "@/lib/server/firebase-admin";

export const runtime = "nodejs";

const sessionRequestSchema = z.object({
  idToken: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { idToken } = sessionRequestSchema.parse(body);
    const adminAuth = getFirebaseAdminAuth();

    if (!adminAuth) {
      return jsonError("Firebase admin is not configured", 503);
    }

    const expiresIn = 60 * 60 * 24 * 7 * 1000;
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn,
    });

    const cookieStore = await cookies();
    cookieStore.set("__session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: expiresIn / 1000,
      path: "/",
    });

    return jsonSuccess({ success: true });
  } catch (error) {
    return handleRouteError(error, "Unable to create session", {
      zodMessage: "Invalid session request",
    });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("__session");

  return jsonSuccess({ success: true });
}
