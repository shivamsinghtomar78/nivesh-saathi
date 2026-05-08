const DUPLICATE_WORD_WINDOW = 3;

const CLEAR_PUNCTUATION_RE = /[.!?।]$/u;
const NUMBER_END_RE = /\b\d+([.,]\d+)?$/u;
const FILLER_RE =
  /\b(um+|uh+|umm+|hmm+|hmmm+|let me think|actually|ek minute|ruk|soch|wait|hold on|matlab|basically)\b/i;
const INCOMPLETE_END_RE =
  /\b(and|or|but|because|for|to|with|ki|ke|ka|ko|mein|main|mujhe|agar|kyunki|aur|ya|lekin|actually|then)$/i;
const BACKCHANNEL_RE =
  /^(ok|okay|right|haan|ha|yes|yeah|yep|hmm|hm|mm|mm-hmm|uh-huh|got it|theek hai|accha|achha)$/i;

export type TranscriptStabilizerInput = {
  confidence?: number;
  isFinal?: boolean;
  segmentId?: string;
  text: string;
};

export type TranscriptStabilizerResult = {
  accepted: boolean;
  confidence: number;
  isDuplicate: boolean;
  isFinal: boolean;
  segmentId: string;
  text: string;
};

export type EndpointDecision = {
  confidence: "low" | "medium" | "high";
  reason: "punctuation" | "number" | "filler" | "incomplete" | "no_punctuation" | "empty";
  shouldEndpoint: boolean;
  waitMs: number;
};

export const DEFAULT_ENDPOINTING = {
  punctuationMs: 650,
  noPunctuationMs: 1200,
  fillerMs: 1800,
  maxSilenceMs: 8000,
};

export function normalizeTranscriptText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function removeRepeatedWords(value: string) {
  const words = normalizeTranscriptText(value).split(" ").filter(Boolean);
  const cleaned: string[] = [];

  for (const word of words) {
    const last = cleaned.at(-1);
    if (last && last.toLocaleLowerCase() === word.toLocaleLowerCase()) continue;

    let repeatedPhrase = false;
    for (let size = 2; size <= DUPLICATE_WORD_WINDOW; size += 1) {
      if (cleaned.length < size) continue;
      const previous = cleaned.slice(-size).map((item) => item.toLocaleLowerCase());
      const next = [...cleaned.slice(-(size - 1)), word].map((item) =>
        item.toLocaleLowerCase()
      );
      if (previous.join(" ") === next.join(" ")) {
        repeatedPhrase = true;
        break;
      }
    }

    if (!repeatedPhrase) cleaned.push(word);
  }

  return cleaned.join(" ");
}

function normalizedKey(value: string) {
  return normalizeTranscriptText(value)
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim();
}

export function isBackchannel(value: string) {
  return BACKCHANNEL_RE.test(normalizeTranscriptText(value));
}

export function getEndpointDecision(
  transcript: string,
  config: Partial<typeof DEFAULT_ENDPOINTING> = {}
): EndpointDecision {
  const text = normalizeTranscriptText(transcript);
  const resolved = { ...DEFAULT_ENDPOINTING, ...config };

  if (!text) {
    return {
      confidence: "low",
      reason: "empty",
      shouldEndpoint: false,
      waitMs: resolved.maxSilenceMs,
    };
  }

  if (FILLER_RE.test(text)) {
    return {
      confidence: "low",
      reason: "filler",
      shouldEndpoint: false,
      waitMs: resolved.fillerMs,
    };
  }

  if (INCOMPLETE_END_RE.test(text)) {
    return {
      confidence: "medium",
      reason: "incomplete",
      shouldEndpoint: false,
      waitMs: resolved.fillerMs,
    };
  }

  if (NUMBER_END_RE.test(text)) {
    return {
      confidence: "medium",
      reason: "number",
      shouldEndpoint: true,
      waitMs: resolved.noPunctuationMs,
    };
  }

  if (CLEAR_PUNCTUATION_RE.test(text)) {
    return {
      confidence: "high",
      reason: "punctuation",
      shouldEndpoint: true,
      waitMs: resolved.punctuationMs,
    };
  }

  return {
    confidence: "medium",
    reason: "no_punctuation",
    shouldEndpoint: true,
    waitMs: resolved.noPunctuationMs,
  };
}

export class TranscriptStabilizer {
  private lastFinalKey = "";
  private lastPartial = "";
  private lastSegmentId = "";

  accept(input: TranscriptStabilizerInput): TranscriptStabilizerResult {
    const segmentId = input.segmentId || this.lastSegmentId || "turn";
    const confidence = Math.max(0, Math.min(1, input.confidence ?? 0.72));
    const text = removeRepeatedWords(input.text);
    const key = normalizedKey(text);

    if (!text || confidence < 0.25) {
      return {
        accepted: false,
        confidence,
        isDuplicate: false,
        isFinal: Boolean(input.isFinal),
        segmentId,
        text: "",
      };
    }

    if (input.isFinal) {
      const isDuplicate =
        key === this.lastFinalKey ||
        (Boolean(this.lastFinalKey) && this.lastFinalKey.includes(key) && key.length > 8);

      if (!isDuplicate) {
        this.lastFinalKey = key;
        this.lastPartial = "";
      }

      return {
        accepted: !isDuplicate,
        confidence,
        isDuplicate,
        isFinal: true,
        segmentId,
        text,
      };
    }

    const previous = this.lastPartial;
    const previousKey = normalizedKey(previous);
    const accepted =
      !previous ||
      key.startsWith(previousKey) ||
      previousKey.startsWith(key) ||
      text.length >= Math.max(4, previous.length - 8);

    if (accepted) {
      this.lastPartial = text.length >= previous.length ? text : previous;
      this.lastSegmentId = segmentId;
    }

    return {
      accepted,
      confidence,
      isDuplicate: false,
      isFinal: false,
      segmentId,
      text: this.lastPartial || text,
    };
  }

  reset() {
    this.lastFinalKey = "";
    this.lastPartial = "";
    this.lastSegmentId = "";
  }
}
