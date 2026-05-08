import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import type { ConversationMessage } from "@/stores/conversationStore";

vi.mock("@/components/voice/VapiVoiceSessionController", () => ({
  default: ({ children }: { children: (voice: unknown) => ReactNode }) =>
    children({
    assistantText: "",
    error: null,
    interimTranscript: "1 lakh ke liye best FD batao",
    interruptAssistant: vi.fn(),
    lastUserTranscript: "",
    level: 0.45,
    retry: vi.fn(),
    start: vi.fn(),
    status: "listening",
    stop: vi.fn(),
  }),
}));

import VoiceAgentLayer from "@/components/voice/VoiceAgentLayer";

const messages: ConversationMessage[] = [
  {
    id: "welcome",
    role: "bot",
    content: "Hello",
    timestamp: "10:31 AM",
    language: "EN",
    source: "chat",
  },
];

describe("VoiceAgentLayer", () => {
  it("renders the continuous voice layer with live state and subtitle", () => {
    const html = renderToStaticMarkup(
      <VoiceAgentLayer
        open
        language="hinglish"
        threadId="thread-1"
        messages={messages}
        onAssistantReply={vi.fn()}
        onClose={vi.fn()}
        onMinimize={vi.fn()}
        onThreadId={vi.fn()}
        onUserTranscript={vi.fn()}
      />
    );

    expect(html).toContain("Live AI Voice");
    expect(html).toContain("Nivesh Saathi");
    expect(html).toContain("Listening");
    expect(html).toContain("1 lakh ke liye best FD batao");
  });
});
