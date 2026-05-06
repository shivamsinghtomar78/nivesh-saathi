const BLOCK_PATTERNS = [
  /ignore (all|any|the|my)?\s*(previous|above|system|developer) instructions/i,
  /reveal (the )?(system|developer) prompt/i,
  /show me (your|the) (hidden )?(instructions|prompt)/i,
  /(print|list|dump).*(api key|secret|token|env)/i,
  /(bypass|disable).*(safety|guardrails|policy)/i,
  /(act as|pretend to be).*(system|developer|tool)/i,
  /(tool|function) call/i,
];

const SOFT_PATTERNS = [
  /\b(?:password|secret|token|api key)\b/i,
  /\b(?:jailbreak|override|root access)\b/i,
];

export type PromptGuardResult = {
  blocked: boolean;
  normalizedMessage: string;
  reasons: string[];
  confidence: number;
};

export function normalizeAdvisorMessage(message: string) {
  return message.replace(/\s+/g, " ").trim().slice(0, 800);
}

export function assessPromptRisk(message: string): PromptGuardResult {
  const normalizedMessage = normalizeAdvisorMessage(message);
  const reasons: string[] = [];

  for (const pattern of BLOCK_PATTERNS) {
    if (pattern.test(normalizedMessage)) {
      reasons.push("blocked_prompt_injection_pattern");
    }
  }

  for (const pattern of SOFT_PATTERNS) {
    if (pattern.test(normalizedMessage)) {
      reasons.push("sensitive_topic_detected");
    }
  }

  let confidence = 0.0;
  if (reasons.includes("blocked_prompt_injection_pattern")) confidence = 0.95;
  else if (reasons.includes("sensitive_topic_detected")) confidence = 0.60;

  return {
    blocked: reasons.includes("blocked_prompt_injection_pattern"),
    normalizedMessage,
    reasons: Array.from(new Set(reasons)),
    confidence,
  };
}

export function buildBlockedPromptResponse(language: "en" | "hi" | "hinglish" | "ta" | "te") {
  if (language === "hi" || language === "hinglish") {
    return "Main sirf FD, suraksha, return aur jargon samjhane mein madad kar sakta hoon. Kripya apna nivesh sawal seedhe tarike se poochhiye.";
  }

  if (language === "ta") {
    return "Naan FD, paadhukaappu, returns matrum finance terms-ai thelivaga puriya vaikkum udhavi mattum seyyuven. Dayavu seithu ungal nivesh kelviyai neradiyaga kelunga.";
  }

  if (language === "te") {
    return "Nenu FD choices, safety, returns, mariyu finance terms explain cheyyadaniki matrame help chestanu. Mee investment question direct ga adagandi.";
  }

  return "I can only help with FD choices, safety, returns, and simple financial explanations. Please ask your investment question directly.";
}
