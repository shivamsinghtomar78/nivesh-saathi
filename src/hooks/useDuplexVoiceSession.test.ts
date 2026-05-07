import { describe, expect, it } from "vitest";

import {
  getDeepgramCloseMessage,
  isRetriableDeepgramClose,
} from "@/hooks/useDuplexVoiceSession";

describe("Deepgram voice socket close handling", () => {
  it("does not retry policy or provider application closes", () => {
    expect(isRetriableDeepgramClose({ code: 1008, wasClean: false })).toBe(false);
    expect(isRetriableDeepgramClose({ code: 4003, wasClean: false })).toBe(false);
    expect(getDeepgramCloseMessage({ code: 1008, wasClean: false })).toContain(
      "Deepgram key role"
    );
  });

  it("retries transient network and server closes", () => {
    expect(isRetriableDeepgramClose({ code: 1006, wasClean: false })).toBe(true);
    expect(isRetriableDeepgramClose({ code: 1011, wasClean: false })).toBe(true);
    expect(getDeepgramCloseMessage({ code: 1006, wasClean: false })).toBe(
      "Voice connection dropped. Please try again."
    );
  });
});
