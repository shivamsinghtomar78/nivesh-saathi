import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "__session";

const PROTECTED_ROUTES = [
  "/home",
  "/compare",
  "/chat",
  "/voice",
  "/profile",
  "/share",
];

export function proxy(request: NextRequest) {
  const isProtectedRoute = PROTECTED_ROUTES.some(
    (route) =>
      request.nextUrl.pathname === route ||
      request.nextUrl.pathname.startsWith(`${route}/`)
  );

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  if (request.cookies.has(SESSION_COOKIE_NAME)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set(
    "next",
    `${request.nextUrl.pathname}${request.nextUrl.search}`
  );

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/home/:path*",
    "/compare/:path*",
    "/chat/:path*",
    "/voice/:path*",
    "/profile/:path*",
    "/share/:path*",
  ],
};
