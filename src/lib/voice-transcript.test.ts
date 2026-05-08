import { describe, expect, it } from "vitest";

import {
  getEndpointDecision,
  isBackchannel,
  removeRepeatedWords,
  TranscriptStabilizer,
} from "@/lib/voice-transcript";

describe("voice transcript stabilization", () => {
  it("removes adjacent repeated words and duplicate final turns", () => {
    const stabilizer = new TranscriptStabilizer();

    const first = stabilizer.accept({
      isFinal: true,
      text: "compare compare SBI FD FD rates",
    });
    const duplicate = stabilizer.accept({
      isFinal: true,
      text: "compare SBI FD rates",
    });

    expect(first.accepted).toBe(true);
    expect(first.text).toBe("compare SBI FD rates");
    expect(duplicate.accepted).toBe(false);
    expect(duplicate.isDuplicate).toBe(true);
  });

  it("keeps partial transcripts stable when a provider flickers shorter", () => {
    const stabilizer = new TranscriptStabilizer();

    expect(stabilizer.accept({ text: "compare HDFC and SBI FD", isFinal: false }).text).toBe(
      "compare HDFC and SBI FD"
    );
    expect(stabilizer.accept({ text: "compare HDFC", isFinal: false }).text).toBe(
      "compare HDFC and SBI FD"
    );
  });

  it("chooses patient endpoint delays for fillers and incomplete clauses", () => {
    expect(getEndpointDecision("umm let me think").waitMs).toBe(1800);
    expect(getEndpointDecision("compare SBI and").shouldEndpoint).toBe(false);
    expect(getEndpointDecision("compare SBI.").waitMs).toBe(650);
    expect(getEndpointDecision("compare SBI FD rates").waitMs).toBe(1200);
  });

  it("detects backchannels that should not trigger barge-in takeover", () => {
    expect(isBackchannel("okay")).toBe(true);
    expect(isBackchannel("hmm")).toBe(true);
    expect(isBackchannel("okay compare SBI")).toBe(false);
    expect(removeRepeatedWords("FD FD FD")).toBe("FD");
  });
});
