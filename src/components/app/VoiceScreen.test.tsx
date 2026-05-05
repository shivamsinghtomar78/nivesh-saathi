import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockVoiceScreenState = vi.hoisted(() => ({
  auth: {
    user: {
      uid: "user-1",
      email: "test@example.com",
      displayName: "Test User",
      phoneNumber: "9999999999",
    },
  },
  conversation: {
    language: "en",
    threadId: null as string | null,
    setLanguage: vi.fn(),
    setThreadId: vi.fn(),
  },
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/components/app/AppShell", () => ({
  default: ({
    actions,
    children,
    description,
    title,
  }: {
    actions?: ReactNode;
    children: ReactNode;
    description?: string;
    title: string;
  }) => (
    <main>
      <h1>{title}</h1>
      <p>{description}</p>
      {actions}
      {children}
    </main>
  ),
}));

vi.mock("@/components/auth/AuthGate", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/hooks/useStreamingChat", () => ({
  useStreamingChat: vi.fn(() => ({
    isStreaming: false,
    sendStreamingMessage: vi.fn(),
  })),
}));

vi.mock("@/hooks/useVoiceInput", () => ({
  useVoiceInput: vi.fn(() => ({
    error: null,
    isListening: false,
    isProcessing: false,
    isSupported: true,
    resetTranscript: vi.fn(),
    startListening: vi.fn(),
    status: "idle",
    stopListening: vi.fn(),
    transcript: "",
  })),
}));

vi.mock("@/stores/authStore", () => ({
  useAuthStore: (selector: (state: typeof mockVoiceScreenState.auth) => unknown) =>
    selector(mockVoiceScreenState.auth),
}));

vi.mock("@/stores/conversationStore", () => ({
  useConversationStore: (
    selector: (state: typeof mockVoiceScreenState.conversation) => unknown
  ) => selector(mockVoiceScreenState.conversation),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

import VoiceScreen from "@/components/app/VoiceScreen";

describe("VoiceScreen", () => {
  beforeEach(() => {
    mockVoiceScreenState.conversation.language = "en";
    mockVoiceScreenState.conversation.threadId = null;
    mockVoiceScreenState.conversation.setLanguage.mockClear();
    mockVoiceScreenState.conversation.setThreadId.mockClear();
  });

  it("renders the dedicated no-typing voice call surface", () => {
    const html = renderToStaticMarkup(<VoiceScreen />);

    expect(html).toContain("Saathi Voice Call");
    expect(html).toContain("Start voice call");
    expect(html).toContain("English");
    expect(html).toContain("Hindi");
    expect(html).toContain("Hinglish");
    expect(html).toContain("Compare 3 options");
    expect(html).toContain("Mock KYC handoff");
  });

  it("renders Hinglish call guidance when Hinglish is selected", () => {
    mockVoiceScreenState.conversation.language = "hinglish";

    const html = renderToStaticMarkup(<VoiceScreen />);

    expect(html).toContain("FD voice call ready hai");
    expect(html).toContain("Voice se poochho");
    expect(html).toContain("Selected FD book karo");
  });
});
