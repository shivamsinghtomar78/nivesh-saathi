import { cookies } from "next/headers";
import { z, ZodError } from "zod";

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
      return Response.json(
        { error: "Firebase admin is not configured" },
        { status: 503 }
      );
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

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: "Invalid session request", details: error.flatten() },
        { status: 400 }
      );
    }

    return Response.json(
      { error: "Unable to create session" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("__session");

  return Response.json({ success: true });
}
