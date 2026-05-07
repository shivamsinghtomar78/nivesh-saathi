import { describe, expect, it } from "vitest";

import {
  classifyVideoSdkTranscriptType,
  mapVideoSdkAgentState,
} from "@/hooks/useDuplexVoiceSession";

describe("VideoSDK voice session helpers", () => {
  it("maps VideoSDK agent states to the existing UI status model", () => {
    expect(mapVideoSdkAgentState("LISTENING")).toBe("listening");
    expect(mapVideoSdkAgentState("THINKING")).toBe("processing");
    expect(mapVideoSdkAgentState("SPEAKING")).toBe("speaking");
    expect(mapVideoSdkAgentState("IDLE")).toBe("listening");
  });

  it("classifies agent transcript segment types defensively", () => {
    expect(classifyVideoSdkTranscriptType("user_transcript_final")).toBe("final");
    expect(classifyVideoSdkTranscriptType("assistant_response")).toBe("assistant");
    expect(classifyVideoSdkTranscriptType("partial_user_transcript")).toBe("interim");
    expect(classifyVideoSdkTranscriptType(undefined)).toBe("unknown");
  });
});
