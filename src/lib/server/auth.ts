import type { DecodedIdToken } from "firebase-admin/auth";

import { SESSION_COOKIE_NAME } from "@/lib/auth-constants";
import { CSRF_HEADER_NAME, CSRF_HEADER_VALUE } from "@/lib/csrf";
import { jsonError } from "@/lib/server/api";
import { getFirebaseAdminAuth } from "@/lib/server/firebase-admin";

export { SESSION_COOKIE_NAME };

export type VerifiedSession = DecodedIdToken;

export function getCookieValue(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const prefix = `${name}=`;
  const match = cookies.find((cookie) => cookie.startsWith(prefix));

  return match ? decodeURIComponent(match.slice(prefix.length)) : null;
}

export function hasValidCsrfHeader(request: Request) {
  return request.headers.get(CSRF_HEADER_NAME) === CSRF_HEADER_VALUE;
}

export function isSameOriginRequest(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") {
    return false;
  }

  if (
    fetchSite === "same-origin" ||
    fetchSite === "same-site" ||
    fetchSite === "none"
  ) {
    return true;
  }

  const targetOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");

  if (origin) {
    return origin === targetOrigin;
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin === targetOrigin;
    } catch {
      return false;
    }
  }

  return process.env.NODE_ENV !== "production";
}

export function requireCsrfProtection(request: Request) {
  if (!hasValidCsrfHeader(request)) {
    return jsonError("Missing CSRF protection header", 403);
  }

  if (!isSameOriginRequest(request)) {
    return jsonError("Cross-site request rejected", 403);
  }

  return null;
}

export async function requireFirebaseSession(request: Request): Promise<
  | {
      ok: true;
      session: VerifiedSession;
    }
  | {
      ok: false;
      response: Response;
    }
> {
  const adminAuth = getFirebaseAdminAuth();
  if (!adminAuth) {
    return {
      ok: false,
      response: jsonError("Firebase admin is not configured", 503),
    };
  }

  const sessionCookie = getCookieValue(request, SESSION_COOKIE_NAME);
  if (!sessionCookie) {
    return {
      ok: false,
      response: jsonError("Sign in required", 401),
    };
  }

  try {
    const session = await adminAuth.verifySessionCookie(sessionCookie, true);

    return {
      ok: true,
      session,
    };
  } catch {
    return {
      ok: false,
      response: jsonError("Session expired. Please sign in again.", 401),
    };
  }
}

export async function getOptionalFirebaseSession(request: Request): Promise<
  | {
      ok: true;
      session: VerifiedSession | null;
    }
  | {
      ok: false;
      response: Response;
    }
> {
  const sessionCookie = getCookieValue(request, SESSION_COOKIE_NAME);
  if (!sessionCookie) {
    return { ok: true, session: null };
  }

  const adminAuth = getFirebaseAdminAuth();
  if (!adminAuth) {
    return {
      ok: false,
      response: jsonError("Firebase admin is not configured", 503),
    };
  }

  try {
    const session = await adminAuth.verifySessionCookie(sessionCookie, true);
    return { ok: true, session };
  } catch {
    return {
      ok: false,
      response: jsonError("Session expired. Please sign in again.", 401),
    };
  }
}
