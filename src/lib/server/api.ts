import { ZodError } from "zod";

import { serverEnv } from "@/lib/server/env";
import { logServerError } from "@/lib/server/telemetry";

export type ApiErrorBody = {
  ok: false;
  error: string;
  details?: unknown;
};

export type ApiSuccessBody<T extends object> = T & {
  ok: true;
};

export function jsonSuccess<T extends object>(
  payload: T,
  init?: ResponseInit
) {
  return Response.json(
    {
      ok: true,
      ...payload,
    } satisfies ApiSuccessBody<T>,
    init
  );
}

export function jsonError(
  error: string,
  status = 500,
  details?: unknown,
  init?: ResponseInit
) {
  return Response.json(
    {
      ok: false,
      error,
      ...(details === undefined ? {} : { details }),
    } satisfies ApiErrorBody,
    {
      status,
      ...init,
    }
  );
}

export function handleRouteError(
  error: unknown,
  fallbackMessage: string,
  options?: {
    zodMessage?: string;
  }
) {
  if (error instanceof ZodError) {
    return jsonError(
      options?.zodMessage ?? "Invalid request",
      400,
      error.flatten()
    );
  }

  logServerError("api_route_error", {
    message: error instanceof Error ? error.message : "Unknown error",
    fallbackMessage,
  });

  return jsonError(
    fallbackMessage,
    500,
    process.env.NODE_ENV === "production"
      ? undefined
      : error instanceof Error
        ? error.message
        : "Unknown error"
  );
}

export function getRequestIp(request: Request) {
  const forwardedFor =
    request.headers.get("x-forwarded-for") ??
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    "unknown";

  return forwardedFor.split(",")[0]?.trim() || "unknown";
}

export function privateCorsHeaders(request: Request, methods: string) {
  const origin = request.headers.get("origin");
  const requestOrigin = new URL(request.url).origin;
  const configuredOrigin = new URL(serverEnv.NEXT_PUBLIC_APP_URL).origin;
  const allowedOrigin =
    origin && (origin === requestOrigin || origin === configuredOrigin)
      ? origin
      : requestOrigin;

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Content-Type, x-nivesh-csrf",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
}
