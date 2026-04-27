export const CSRF_HEADER_NAME = "x-nivesh-csrf";
export const CSRF_HEADER_VALUE = "1";

export function withCsrfHeaders(headers: Record<string, string> = {}) {
  return {
    ...headers,
    [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE,
  };
}
