"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { AppLanguage } from "@/lib/server/advisor-schemas";

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
    officialUrl?: string;
  }[];
  actions?: {
    label: string;
    type: "primary" | "secondary";
    icon?: string;
    action?:
      | "open_compare"
      | "explain_term"
      | "switch_language"
      | "open_voice"
      | "open_official_site"
      | "sign_in";
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
  language: AppLanguage;
  threadId: string | null;
  isTyping: boolean;
  addMessage: (msg: ChatMessage) => void;
  setLanguage: (lang: AppLanguage) => void;
  setThreadId: (threadId: string | null) => void;
  setTyping: (typing: boolean) => void;
  clearMessages: () => void;
}

const initialMessages = (language: AppLanguage): ChatMessage[] => [
  {
    id: "welcome",
    role: "bot",
    content:
      language === "hi"
        ? "Namaste. Main Nivesh Saathi hoon. FD rates, safety, maturity aur plain-language explainers ke liye poochhiye."
        : language === "ta"
          ? "Vanakkam. Naan Nivesh Saathi. FD rates, safety, maturity matrum simple explainers kaaga kelunga."
          : language === "bn"
            ? "Nomoskar. Ami Nivesh Saathi. FD rate, safety, maturity ebong shohoj byakhyar jonno jiggesh korun."
            : "Hello. I am Nivesh Saathi. Ask about FD rates, safety, maturity, or any jargon you want explained.",
    timestamp: "10:31 AM",
    language: language.toUpperCase(),
  },
];

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: initialMessages("hi"),
      language: "hi",
      threadId: null,
      isTyping: false,
      addMessage: (msg) =>
        set((state) => ({ messages: [...state.messages, msg] })),
      setLanguage: (lang) =>
        set((state) => ({
          language: lang,
          messages:
            state.messages.length <= 1 ? initialMessages(lang) : state.messages,
        })),
      setThreadId: (threadId) => set({ threadId }),
      setTyping: (typing) => set({ isTyping: typing }),
      clearMessages: () => {
        const language = get().language;
        set({ messages: initialMessages(language), threadId: null });
      },
    }),
    {
      name: "nivesh-chat",
      partialize: (state) => ({
        messages: state.messages,
        language: state.language,
        threadId: state.threadId,
      }),
    }
  )
);
