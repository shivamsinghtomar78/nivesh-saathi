import { ZodError } from "zod";

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

  return jsonError(
    fallbackMessage,
    500,
    error instanceof Error ? error.message : "Unknown error"
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
