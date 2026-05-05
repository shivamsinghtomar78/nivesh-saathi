"use client";

import React, { useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Plus,
  MessageSquare,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LANGUAGE_LABELS } from "@/lib/copy";
import {
  useConversationStore,
  type ConversationMessage,
  type ConversationSummary,
} from "@/stores/conversationStore";
import { useAuthStore } from "@/stores/authStore";
import { withCsrfHeaders } from "@/lib/csrf";

type ConversationSummaryPayload = {
  id: string;
  title: string;
  lastMessage?: string;
  updatedAt: string;
  messageCount: number;
  isArchived?: boolean;
};

type ConversationMessagePayload = {
  id?: string;
  role: "assistant" | "user";
  content: string;
  createdAt: string;
};

/**
 * ChatGPT-style History Sidebar
 *
 * - Shows past conversations grouped by date
 * - Clicking a conversation loads its messages
 * - "New Chat" button starts a fresh session
 * - No auto-restore on reload — user must explicitly select
 */
export function HistoryDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const user = useAuthStore((s) => s.user);
  const conversations = useConversationStore((s) => s.conversations);
  const conversationsLoading = useConversationStore(
    (s) => s.conversationsLoading
  );
  const activeConversationId = useConversationStore(
    (s) => s.activeConversationId
  );
  const setConversations = useConversationStore((s) => s.setConversations);
  const setConversationsLoading = useConversationStore(
    (s) => s.setConversationsLoading
  );
  const setMessages = useConversationStore((s) => s.setMessages);
  const setThreadId = useConversationStore((s) => s.setThreadId);
  const setActiveConversationId = useConversationStore(
    (s) => s.setActiveConversationId
  );
  const startNewChat = useConversationStore((s) => s.startNewChat);
  const removeConversation = useConversationStore((s) => s.removeConversation);
  const language = useConversationStore((s) => s.language);

  const hasFetchedRef = useRef(false);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setConversationsLoading(true);
    try {
      const res = await fetch("/api/chat/conversations");
      if (res.ok) {
        const data = (await res.json()) as {
          conversations?: ConversationSummaryPayload[];
        };
        setConversations(
          (data.conversations || []).map(
            (c): ConversationSummary => ({
              id: c.id,
              title: c.title,
              lastMessage: c.lastMessage ?? "",
              updatedAt: c.updatedAt,
              messageCount: c.messageCount,
              isArchived: c.isArchived ?? false,
            })
          )
        );
      }
    } catch {
      // Silent fail
    } finally {
      setConversationsLoading(false);
    }
  }, [user, setConversations, setConversationsLoading]);

  useEffect(() => {
    if (!open) return;
    // Always refresh on open
    void fetchConversations();
  }, [open, fetchConversations]);

  // Also fetch once on mount if user is signed in
  useEffect(() => {
    if (user && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      void fetchConversations();
    }
  }, [user, fetchConversations]);

  const handleSelectConversation = async (conversationId: string) => {
    try {
      const response = await fetch(
        `/api/chat/conversations/${encodeURIComponent(conversationId)}`
      );
      const payload = (await response.json()) as {
        ok?: boolean;
        messages?: ConversationMessagePayload[];
      };

      if (!response.ok || !payload.ok) {
        // Fallback: just set the conversation ID
        setActiveConversationId(conversationId);
        setThreadId(conversationId);
        onClose();
        return;
      }

      const messages: ConversationMessage[] = (
        payload.messages || []
      ).map((msg, index) => ({
        id: msg.id || `${conversationId}-${index}`,
        role: msg.role === "assistant" ? "bot" : "user",
        content: msg.content,
        timestamp: new Intl.DateTimeFormat("en-IN", {
          hour: "numeric",
          minute: "2-digit",
        }).format(new Date(msg.createdAt)),
        language: LANGUAGE_LABELS[language] ?? LANGUAGE_LABELS.en,
        source: "chat" as const,
      }));

      setMessages(messages);
      setActiveConversationId(conversationId);
      setThreadId(conversationId);
      onClose();
    } catch {
      setActiveConversationId(conversationId);
      setThreadId(conversationId);
      onClose();
    }
  };

  const handleNewChat = () => {
    startNewChat();
    onClose();
  };

  const handleDeleteConversation = async (
    e: React.MouseEvent,
    conversationId: string
  ) => {
    e.stopPropagation();
    try {
      const res = await fetch(
        `/api/chat/conversations/${encodeURIComponent(conversationId)}`,
        {
          method: "DELETE",
          headers: withCsrfHeaders(),
        }
      );
      if (res.ok) {
        removeConversation(conversationId);
      }
    } catch {
      // Silent fail
    }
  };

  // Group conversations by date
  const grouped: Record<string, ConversationSummary[]> = {};
  for (const conv of conversations) {
    const now = new Date();
    const convDate = new Date(conv.updatedAt);
    const diffDays = Math.floor(
      (now.getTime() - convDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    let label: string;
    if (diffDays === 0) {
      label = "Today";
    } else if (diffDays === 1) {
      label = "Yesterday";
    } else if (diffDays <= 7) {
      label = "Previous 7 Days";
    } else if (diffDays <= 30) {
      label = "Previous 30 Days";
    } else {
      label = convDate.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
      });
    }
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(conv);
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm laptop:hidden"
            onClick={onClose}
          />
          {/* Sidebar */}
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 z-50 w-[280px] max-w-[85vw] border-r border-[#1F1F1F] bg-[#0F0F0F] shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1F1F1F]/60">
              <Button
                variant="outline"
                size="sm"
                onClick={handleNewChat}
                className="flex-1 mr-2 gap-2 border-[#1F1F1F] bg-[#161616] text-[#EAEAEA] hover:bg-accent/10 hover:border-accent/30 hover:text-accent transition-all"
              >
                <Plus className="h-4 w-4" />
                New chat
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={onClose}
                className="h-8 w-8 shrink-0 text-[#9CA3AF] hover:text-[#EAEAEA]"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto px-2 py-3 space-y-5 custom-scrollbar">
              {conversationsLoading ? (
                <div className="space-y-2 px-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-10 rounded-lg bg-[#1A1A1A] animate-pulse"
                    />
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <MessageSquare className="h-8 w-8 text-[#9CA3AF]/25 mx-auto mb-3" />
                  <p className="text-sm text-[#9CA3AF]/60">
                    No conversations yet.
                  </p>
                  <p className="text-xs text-[#9CA3AF]/40 mt-1">
                    Start chatting to see your history here.
                  </p>
                </div>
              ) : (
                Object.entries(grouped).map(([label, items]) => (
                  <div key={label}>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#9CA3AF]/50 mb-1.5 px-2">
                      {label}
                    </p>
                    <div className="space-y-0.5">
                      {items.map((conv) => (
                        <button
                          key={conv.id}
                          onClick={() => handleSelectConversation(conv.id)}
                          className={`group w-full text-left px-3 py-2.5 rounded-lg transition-all text-sm relative ${
                            activeConversationId === conv.id
                              ? "bg-[#1F1F1F] text-[#EAEAEA]"
                              : "text-[#9CA3AF] hover:bg-[#1A1A1A] hover:text-[#EAEAEA]"
                          }`}
                        >
                          <p className="truncate pr-6 font-medium leading-5">
                            {conv.title || conv.lastMessage || "Conversation"}
                          </p>
                          {/* Delete button on hover */}
                          <span
                            onClick={(e) => handleDeleteConversation(e, conv.id)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#2A2A2A] hover:text-red-400 transition-all"
                            title="Delete conversation"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
