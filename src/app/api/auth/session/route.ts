import { cookies } from "next/headers";
import { z } from "zod";

import { jsonError, jsonSuccess, handleRouteError } from "@/lib/server/api";
import { requireCsrfProtection, SESSION_COOKIE_NAME } from "@/lib/server/auth";
import { getFirebaseAdminAuth } from "@/lib/server/firebase-admin";
import { persistUserProfile } from "@/lib/server/persistence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sessionRequestSchema = z.object({
  idToken: z.string().min(1),
});

export async function GET(request: Request) {
  const adminAuth = getFirebaseAdminAuth();

  if (!adminAuth) {
    return jsonError("Firebase admin is not configured", 503);
  }

  const sessionCookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.slice(SESSION_COOKIE_NAME.length + 1);

  if (!sessionCookie) {
    return jsonError("Sign in required", 401);
  }

  try {
    const session = await adminAuth.verifySessionCookie(
      decodeURIComponent(sessionCookie),
      true
    );

    return jsonSuccess({
      user: {
        uid: session.uid,
        email: session.email ?? null,
        phoneNumber: session.phone_number ?? null,
        name: session.name ?? null,
        picture: session.picture ?? null,
        provider: session.firebase.sign_in_provider ?? null,
      },
    });
  } catch {
    return jsonError("Session expired. Please sign in again.", 401);
  }
}

export async function POST(request: Request) {
  try {
    const csrfError = requireCsrfProtection(request);
    if (csrfError) {
      return csrfError;
    }

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
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    await persistUserProfile({
      uid: decodedToken.uid,
      email: decodedToken.email ?? null,
      phoneNumber: decodedToken.phone_number ?? null,
      name: decodedToken.name ?? null,
      picture: decodedToken.picture ?? null,
      provider: decodedToken.firebase.sign_in_provider ?? null,
    });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
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

export async function DELETE(request: Request) {
  const csrfError = requireCsrfProtection(request);
  if (csrfError) {
    return csrfError;
  }

  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);

  return jsonSuccess({ success: true });
}
