"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { AppLanguage } from "@/lib/server/advisor-schemas";

const MAX_MESSAGES = 50;

export interface ChatMessage {
  id: string;
  role: "user" | "bot";
  content: string;
  timestamp: string;
  language: string;
  /** Set to true when a send fails so the UI can show a retry button */
  failed?: boolean;
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
  followUpPrompt?: string;
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
  /** Mark the last user message as failed so it can be retried */
  markLastFailed: () => void;
  /** Remove the failed flag and last user message for retry */
  retryLastMessage: () => ChatMessage | null;
}

const initialMessages = (language: AppLanguage): ChatMessage[] => [
  {
    id: "welcome",
    role: "bot",
    content:
      language === "hi"
        ? "Namaste. Main Nivesh Saathi hoon. FD rates, safety, maturity aur plain-language explainers ke liye poochhiye."
        : language === "hinglish"
          ? "Namaste. Main Nivesh Saathi hoon. FD rates, safety, maturity aur booking ke liye poochhiye."
        : language === "ta"
          ? "Vanakkam. Naan Nivesh Saathi. FD rates, safety, maturity matrum simple explainers kaaga kelunga."
          : language === "bn"
            ? "Nomoskar. Ami Nivesh Saathi. FD rate, safety, maturity ebong shohoj byakhyar jonno jiggesh korun."
            : "Hello. I am Nivesh Saathi. Ask about FD rates, safety, maturity, or any jargon you want explained.",
    timestamp: "10:31 AM",
    language: language.toUpperCase(),
  },
];

function getInitialEnglishState() {
  return {
    messages: initialMessages("en"),
    language: "en" as AppLanguage,
    threadId: null,
  };
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: initialMessages("en"),
      language: "en",
      threadId: null,
      isTyping: false,
      addMessage: (msg) =>
        set((state) => {
          const updated = [...state.messages, msg];
          // FIFO eviction: keep only the last MAX_MESSAGES messages
          if (updated.length > MAX_MESSAGES) {
            return { messages: updated.slice(updated.length - MAX_MESSAGES) };
          }
          return { messages: updated };
        }),
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
      markLastFailed: () =>
        set((state) => {
          const msgs = [...state.messages];
          for (let i = msgs.length - 1; i >= 0; i--) {
            if (msgs[i].role === "user") {
              msgs[i] = { ...msgs[i], failed: true };
              break;
            }
          }
          return { messages: msgs };
        }),
      retryLastMessage: () => {
        const state = get();
        const msgs = [...state.messages];
        for (let i = msgs.length - 1; i >= 0; i--) {
          if (msgs[i].role === "user" && msgs[i].failed) {
            const msg = msgs[i];
            msgs.splice(i, 1);
            set({ messages: msgs });
            return msg;
          }
        }
        return null;
      },
    }),
    {
      name: "nivesh-chat",
      version: 2,
      partialize: (state) => ({
        messages: state.messages,
        language: state.language,
        threadId: state.threadId,
      }),
      migrate: () => getInitialEnglishState(),
    }
  )
);
