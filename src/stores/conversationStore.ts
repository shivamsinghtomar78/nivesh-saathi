"use client";

import { create } from "zustand";

import type { AppLanguage } from "@/lib/server/advisor-schemas";

/**
 * Shared Conversation Store — Context Engine
 *
 * ChatGPT-like behavior:
 * - NO persist middleware → state resets on reload
 * - Empty chat on app open (no auto-restore)
 * - User must explicitly select a past chat from history sidebar
 * - Conversations list is fetched on demand
 */

const MAX_MESSAGES = 50;

export type ConversationSource = "chat" | "voice";
export type ConversationMode = "chat" | "voice";

export interface ConversationMessage {
  id: string;
  role: "user" | "bot";
  content: string;
  timestamp: string;
  language: string;
  source: ConversationSource;
  /** Set to true when a send fails so the UI can show a retry button */
  failed?: boolean;
  /** True if this message has been edited */
  edited?: boolean;
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
      | "open_chat"
      | "open_official_site"
      | "sign_in"
      | "switch_to_chat"
      | "switch_to_voice";
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
  tone?: "informative" | "celebratory" | "cautionary";
  /** Smart chips suggested after this message */
  suggestedChips?: string[];
  /** Whether mode-switch was suggested for this message */
  modeSwitchSuggested?: boolean;
  portfolioSplit?: {
    totalAmount: number;
    totalMaturity: number;
    blendedRate: number;
    allocations: {
      bankId: string;
      bankName: string;
      allocationAmount: number;
      rate: number;
      maturityAmount: number;
    }[];
  };
  showCalculator?: boolean;
  showTimeMachine?: boolean;
}

export interface ConversationSummary {
  id: string;
  title: string;
  lastMessage: string;
  updatedAt: string;
  messageCount: number;
  isArchived: boolean;
}

interface ConversationState {
  // Active chat session
  messages: ConversationMessage[];
  language: AppLanguage;
  threadId: string | null;
  /** The new-model conversationId (separate from legacy threadId) */
  activeConversationId: string | null;
  activeMode: ConversationMode;
  isTyping: boolean;
  /** Immediate acknowledgment text shown in voice mode */
  voiceAcknowledgment: string | null;

  // Sidebar / history
  conversations: ConversationSummary[];
  conversationsLoading: boolean;
  sidebarOpen: boolean;

  // Actions — active chat
  addMessage: (msg: ConversationMessage) => void;
  setMessages: (messages: ConversationMessage[]) => void;
  updateMessage: (id: string, updates: Partial<ConversationMessage>) => void;
  setLanguage: (lang: AppLanguage) => void;
  setThreadId: (threadId: string | null) => void;
  setActiveConversationId: (id: string | null) => void;
  setActiveMode: (mode: ConversationMode) => void;
  setTyping: (typing: boolean) => void;
  setVoiceAcknowledgment: (text: string | null) => void;
  clearMessages: () => void;
  markLastFailed: () => void;
  retryLastMessage: () => ConversationMessage | null;

  // Actions — sidebar / history
  setConversations: (conversations: ConversationSummary[]) => void;
  setConversationsLoading: (loading: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  removeConversation: (id: string) => void;

  /** Start a fresh empty chat (like clicking "New Chat" in ChatGPT) */
  startNewChat: () => void;

  /** Load a past conversation into the active chat area */
  loadConversation: (
    conversationId: string,
    messages: ConversationMessage[]
  ) => void;
}

const initialMessages = (language: AppLanguage): ConversationMessage[] => [
  {
    id: "welcome",
    role: "bot",
    content:
      language === "hi"
        ? "Namaste. Main Nivesh Saathi hoon. FD rates, safety, maturity aur plain-language explainers ke liye poochhiye."
        : language === "hinglish"
          ? "Namaste. Main Nivesh Saathi hoon. FD rates, safety, maturity aur booking ke next steps ke liye bolkar poochhiye."
        : language === "ta"
          ? "Vanakkam. Naan Nivesh Saathi. FD rates, safety, maturity matrum simple explainers kaaga kelunga."
          : language === "te"
            ? "Namaskaram. Nenu Nivesh Saathi. FD rates, safety, maturity, simple explainers kosam adagandi."
            : "Hello. I am Nivesh Saathi. Ask about FD rates, safety, maturity, or any jargon you want explained.",
    timestamp: "10:31 AM",
    language: language.toUpperCase(),
    source: "chat",
  },
];

/**
 * Detects whether a response contains data-heavy content (tables, comparisons)
 * that would benefit from visual (chat) display. Used for mode-switch suggestions.
 */
export function isDataHeavyResponse(msg: ConversationMessage): boolean {
  const hasRateCards = (msg.rateCards?.length ?? 0) > 1;
  const hasGlossary = (msg.glossary?.length ?? 0) > 1;
  const isLong = msg.content.length > 300;
  return hasRateCards || hasGlossary || isLong;
}

/**
 * Generates smart follow-up chips based on message context.
 */
export function generateSmartChips(msg: ConversationMessage, language: AppLanguage): string[] {
  const chips: string[] = [];

  if (msg.rateCards && msg.rateCards.length > 0) {
    chips.push(
      language === "hi" || language === "hinglish" ? "Kaunsa bank best hai?" : "Which bank is best?",
      language === "hi" || language === "hinglish" ? "Senior citizen rate batao" : "Show senior citizen rates",
    );
  }

  if (msg.glossary && msg.glossary.length > 0) {
    chips.push(
      language === "hi" || language === "hinglish" ? "Aur example dijiye" : "Give me more examples",
    );
  }

  if (msg.content.toLowerCase().includes("fd") || msg.content.toLowerCase().includes("fixed deposit")) {
    chips.push(
      language === "hi" || language === "hinglish" ? "Kya small finance bank safe hai?" : "Is small finance bank safe?",
      language === "hi" || language === "hinglish" ? "Maturity amount batao" : "Calculate maturity amount",
    );
  }

  // Limit to 3 chips max
  return chips.slice(0, 3);
}

export const useConversationStore = create<ConversationState>()(
  (set, get) => ({
    // ── Initial state: empty chat (ChatGPT-like) ──
    messages: initialMessages("en"),
    language: "en",
    threadId: null,
    activeConversationId: null,
    activeMode: "chat",
    isTyping: false,
    voiceAcknowledgment: null,

    // Sidebar
    conversations: [],
    conversationsLoading: false,
    sidebarOpen: false,

    // ── Active chat actions ──
    addMessage: (msg) =>
      set((state) => {
        const updated = [...state.messages, msg];
        if (updated.length > MAX_MESSAGES) {
          return { messages: updated.slice(updated.length - MAX_MESSAGES) };
        }
        return { messages: updated };
      }),

    setMessages: (messages) => set({ messages }),

    updateMessage: (id, updates) =>
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === id ? { ...m, ...updates } : m
        ),
      })),

    setLanguage: (lang) =>
      set((state) => ({
        language: lang,
        messages:
          state.messages.length <= 1 ? initialMessages(lang) : state.messages,
      })),

    setThreadId: (threadId) => set({ threadId }),
    setActiveConversationId: (id) => set({ activeConversationId: id }),
    setActiveMode: (mode) => set({ activeMode: mode }),
    setTyping: (typing) => set({ isTyping: typing }),
    setVoiceAcknowledgment: (text) => set({ voiceAcknowledgment: text }),

    clearMessages: () => {
      const language = get().language;
      set({
        messages: initialMessages(language),
        threadId: null,
        activeConversationId: null,
      });
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

    // ── Sidebar / history actions ──
    setConversations: (conversations) => set({ conversations }),
    setConversationsLoading: (loading) =>
      set({ conversationsLoading: loading }),
    setSidebarOpen: (open) => set({ sidebarOpen: open }),

    removeConversation: (id) =>
      set((state) => ({
        conversations: state.conversations.filter((c) => c.id !== id),
        // If the removed conversation was active, reset to empty chat
        ...(state.activeConversationId === id
          ? {
              activeConversationId: null,
              threadId: null,
              messages: initialMessages(state.language),
            }
          : {}),
      })),

    startNewChat: () => {
      const language = get().language;
      set({
        messages: initialMessages(language),
        threadId: null,
        activeConversationId: null,
        isTyping: false,
        voiceAcknowledgment: null,
      });
    },

    loadConversation: (conversationId, messages) => {
      set({
        activeConversationId: conversationId,
        threadId: conversationId,
        messages,
        isTyping: false,
        voiceAcknowledgment: null,
      });
    },
  })
);
