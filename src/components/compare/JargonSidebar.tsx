"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Banknote,
  Clock3,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";

import { JARGON_DICTIONARY, type JargonTerm } from "@/lib/jargon";

interface JargonSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  term: JargonTerm | null;
  onSelectTerm: (id: string) => void;
}

export default function JargonSidebar({
  isOpen,
  onClose,
  term,
  onSelectTerm,
}: JargonSidebarProps) {
  const relatedTerms = term
    ? JARGON_DICTIONARY.filter((candidate) =>
        term.relatedTerms.includes(candidate.id)
      )
    : [];

  return (
    <AnimatePresence>
      {isOpen && term ? (
        <>
          <motion.button
            type="button"
            aria-label="Close jargon panel"
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 220, damping: 26 }}
            className="fixed right-0 top-0 z-[60] flex h-full w-full max-w-xl flex-col border-l border-outline bg-panel"
          >
            <div className="border-b border-outline px-5 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
          <p className="text-xs uppercase tracking-[0.24em] text-accent">
                    Jargon explainer
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-text-strong">
                    {term.termEn}
                  </h2>
                  <p className="mt-1 text-sm text-text-muted">{term.termHi}</p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-outline text-text-muted transition hover:border-accent/35 hover:text-text-strong"
                  aria-label="Close sidebar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="rounded-[28px] border border-outline bg-panel-strong p-5">
                <p className="text-sm uppercase tracking-[0.2em] text-text-muted">
                  Plain meaning
                </p>
                <p className="mt-4 text-base leading-7 text-text-strong">
                  {term.plainEn}
                </p>
                <p className="mt-3 text-sm leading-6 text-text-muted">{term.plainHi}</p>
              </div>

              <div className="mt-5 rounded-[28px] border border-outline bg-panel-strong p-5">
                <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-accent" />
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-text-strong">
                    How it behaves
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-2xl border border-outline bg-app px-3 py-4">
              <Banknote className="mx-auto h-5 w-5 text-accent" />
                    <p className="mt-3 text-xs uppercase tracking-[0.2em] text-text-muted">
                      Start
                    </p>
                  </div>
                  <div className="rounded-2xl border border-outline bg-app px-3 py-4">
              <Clock3 className="mx-auto h-5 w-5 text-accent" />
                    <p className="mt-3 text-xs uppercase tracking-[0.2em] text-text-muted">
                      Time
                    </p>
                  </div>
                  <div className="rounded-2xl border border-outline bg-app px-3 py-4">
              <TrendingUp className="mx-auto h-5 w-5 text-accent" />
                    <p className="mt-3 text-xs uppercase tracking-[0.2em] text-text-muted">
                      Growth
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-[28px] border border-outline bg-panel-strong p-5">
                <p className="text-sm uppercase tracking-[0.2em] text-text-muted">
                  Example
                </p>
                <p className="mt-4 text-base leading-7 text-text-strong">
                  {term.exampleEn}
                </p>
                <p className="mt-3 text-sm leading-6 text-text-muted">{term.exampleHi}</p>
              </div>

              {relatedTerms.length > 0 && (
                <div className="mt-5 rounded-[28px] border border-outline bg-panel-strong p-5">
                  <p className="text-sm uppercase tracking-[0.2em] text-text-muted">
                    Related terms
                  </p>
                  <div className="mt-4 grid gap-3">
                    {relatedTerms.map((relatedTerm) => (
                      <button
                        key={relatedTerm.id}
                        type="button"
                        onClick={() => onSelectTerm(relatedTerm.id)}
              className="flex items-center justify-between rounded-[var(--radius-panel)] border border-outline bg-app px-4 py-3 text-left transition hover:border-accent/35 hover:bg-panel"
                      >
                        <div>
                          <p className="text-sm font-semibold text-text-strong">
                            {relatedTerm.termEn}
                          </p>
                          <p className="mt-1 text-xs text-text-muted">
                            {relatedTerm.termHi}
                          </p>
                        </div>
              <ArrowRight className="h-4 w-4 text-accent" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
