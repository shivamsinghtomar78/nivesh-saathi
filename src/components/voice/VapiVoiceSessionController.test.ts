import { describe, expect, it } from "vitest";

import {
  buildStartupContext,
  buildVapiFirstMessage,
  buildVoiceLanguageInstruction,
} from "@/components/voice/VapiVoiceSessionController";

describe("VapiVoiceSessionController language prompts", () => {
  it("locks Hindi calls to Hindi during detailed FD explanations", () => {
    const instruction = buildVoiceLanguageInstruction("hi");

    expect(instruction).toContain("Language lock for this call: Hindi");
    expect(instruction).toContain("Do not drift into English");
  });

  it("starts Hinglish calls with a Hinglish greeting", () => {
    expect(buildVapiFirstMessage("hinglish")).toContain(
      "Aaj FD compare, maturity, safety"
    );
  });

  it("includes language lock and recent context in startup system context", () => {
    const context = buildStartupContext({
      language: "hi",
      threadId: "thread-1",
      recentMessages: [{ role: "user", content: "FD detail Hindi mein batao" }],
    });

    expect(context).toContain("Current app language: hi");
    expect(context).toContain("Language lock for this call: Hindi");
    expect(context).toContain("FD detail Hindi mein batao");
  });
});
