import { create } from "zustand";

export interface ChatMessage {
  id: string;
  role: "user" | "bot";
  content: string;
  timestamp: string;
  language: string;
  rateCards?: {
    bankId?: string;
    bankName?: string;
    bankNameLocal?: string;
    tenor: string;
    rate: string;
    maturityPreview?: string;
    safetyNote?: string;
    badge?: string;
  }[];
  actions?: {
    label: string;
    type: "primary" | "secondary";
    icon?: string;
    action?:
      | "open_compare"
      | "start_booking"
      | "explain_term"
      | "open_kyc_help"
      | "switch_language";
    bankId?: string;
    termId?: string;
    url?: string;
  }[];
  glossary?: {
    term: string;
    plain: string;
    example: string;
  }[];
}

interface ChatState {
  messages: ChatMessage[];
  language: "en" | "hi" | "ta" | "bn";
  threadId: string | null;
  isTyping: boolean;
  addMessage: (msg: ChatMessage) => void;
  setLanguage: (lang: "en" | "hi" | "ta" | "bn") => void;
  setThreadId: (threadId: string | null) => void;
  setTyping: (typing: boolean) => void;
  clearMessages: () => void;
}

const initialMessages: ChatMessage[] = [
  {
    id: "1",
    role: "bot",
    content:
      "Namaste! I am your Nivesh Saathi. Ask me about FD rates, safety, maturity, or booking help.",
    timestamp: "10:31 AM",
    language: "EN",
  },
];

export const useChatStore = create<ChatState>((set) => ({
  messages: initialMessages,
  language: "en",
  threadId: null,
  isTyping: false,
  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),
  setLanguage: (lang) => set({ language: lang }),
  setThreadId: (threadId) => set({ threadId }),
  setTyping: (typing) => set({ isTyping: typing }),
  clearMessages: () => set({ messages: initialMessages, threadId: null }),
}));
