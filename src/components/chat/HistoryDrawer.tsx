"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, MessageSquare, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LANGUAGE_LABELS } from "@/lib/copy";
import { useConversationStore } from "@/stores/conversationStore";
import { useAuthStore } from "@/stores/authStore";

type ThreadSummary = {
  threadId: string;
  language: string;
  fdContextIds: string[];
  messageCount: number;
  updatedAt: string;
  latestMessage?: string;
};

type ThreadDetail = {
  threadId: string;
  language: keyof typeof LANGUAGE_LABELS;
  messages: {
    role: "user" | "assistant";
    content: string;
    createdAt: string;
  }[];
};

/**
 * F-08: Conversation History & Thread Browser
 * 
 * Slide-in drawer showing past chat sessions grouped by date.
 * Clicking a thread sets it as the active thread.
 */
export function HistoryDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [grouped, setGrouped] = useState<Record<string, ThreadSummary[]>>({});
  const [loading, setLoading] = useState(false);
  const user = useAuthStore((s) => s.user);
  const setThreadId = useConversationStore((s) => s.setThreadId);
  const setMessages = useConversationStore((s) => s.setMessages);

  const fetchThreads = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch("/api/threads");
      if (res.ok) {
        const data = await res.json();
        setThreads(data.threads || []);
        setGrouped(data.grouped || {});
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      void fetchThreads();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, fetchThreads]);

  const handleSelectThread = async (threadId: string) => {
    try {
      const response = await fetch(`/api/threads?threadId=${encodeURIComponent(threadId)}`);
      const payload = (await response.json()) as { ok?: boolean; thread?: ThreadDetail | null };
      if (!response.ok || !payload.thread) {
        setThreadId(threadId);
        onClose();
        return;
      }

      const language = payload.thread.language ?? "en";
      setMessages(
        payload.thread.messages.map((message, index) => ({
          id: `${threadId}-${index}`,
          role: message.role === "assistant" ? "bot" : "user",
          content: message.content,
          timestamp: new Intl.DateTimeFormat("en-IN", {
            hour: "numeric",
            minute: "2-digit",
          }).format(new Date(message.createdAt)),
          language: LANGUAGE_LABELS[language] ?? LANGUAGE_LABELS.en,
          source: "chat",
        }))
      );
      setThreadId(threadId);
      onClose();
    } catch {
      setThreadId(threadId);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Drawer */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-panel border-l border-outline shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline/50 bg-panel-strong/50">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-accent" />
                <h2 className="text-lg font-semibold text-text-strong">Chat History</h2>
              </div>
              <Button size="icon" variant="outline" onClick={onClose} className="h-8 w-8 rounded-lg">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Thread list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 rounded-xl bg-inner-panel animate-pulse" />
                  ))}
                </div>
              ) : threads.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-10 w-10 text-text-muted/30 mx-auto mb-3" />
                  <p className="text-sm text-text-muted">No past conversations yet.</p>
                  <p className="text-xs text-text-muted/60 mt-1">Your chat history will appear here.</p>
                </div>
              ) : (
                Object.entries(grouped).map(([date, dateThreads]) => (
                  <div key={date}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-2 px-1">
                      {date}
                    </p>
                    <div className="space-y-2">
                      {dateThreads.map((thread) => (
                        <motion.button
                          key={thread.threadId}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => handleSelectThread(thread.threadId)}
                          className="w-full text-left p-3 rounded-xl border border-outline bg-inner-panel/60 hover:bg-panel hover:border-accent/20 transition-all group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-text-strong truncate">
                                {thread.latestMessage || "Conversation"}
                              </p>
                              <p className="text-[11px] text-text-muted mt-1">
                                {thread.messageCount} messages · {thread.language}
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-text-muted/40 group-hover:text-accent transition shrink-0 mt-1" />
                          </div>
                        </motion.button>
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
