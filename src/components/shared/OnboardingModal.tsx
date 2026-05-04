"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Languages, TrendingUp, MessageCircleMore, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LANGUAGE_LABELS } from "@/lib/copy";
import { useConversationStore } from "@/stores/conversationStore";
import type { AppLanguage } from "@/lib/server/advisor-schemas";

const STEPS = [
  {
    icon: Languages,
    title: "Choose your language",
    body: "Nivesh Saathi speaks English, Hindi, Tamil, and Bengali. Pick the one you're most comfortable with.",
  },
  {
    icon: TrendingUp,
    title: "Discover top FD rates",
    body: "We compare rates from 8+ banks in real time. Filter by amount, tenure, and bank type to find your best match.",
  },
  {
    icon: MessageCircleMore,
    title: "Ask your first question",
    body: "Our AI advisor understands FD jargon, compares rates, and gives personalized guidance — via text or voice.",
  },
];

interface OnboardingModalProps {
  onComplete: () => void;
}

export default function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const language = useConversationStore((s) => s.language);
  const setLanguage = useConversationStore((s) => s.setLanguage);
  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm tablet:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-[var(--radius-card)] border border-outline bg-panel p-5 shadow-soft tablet:p-8"
      >
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? "w-8 bg-accent" : i < step ? "w-4 bg-accent/40" : "w-4 bg-outline"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="text-center"
          >
            <div className="w-16 h-16 rounded-[var(--radius-panel)] bg-accent/10 flex items-center justify-center mx-auto mb-5">
              <Icon className="w-7 h-7 text-accent" />
            </div>
            <h2 className="mb-3 text-[clamp(1.45rem,6vw,1.5rem)] font-semibold leading-tight text-text-strong">{current.title}</h2>
            <p className="text-sm text-text-muted leading-relaxed max-w-sm mx-auto">{current.body}</p>

            {/* Step 0: Language picker */}
            {step === 0 && (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                {(Object.entries(LANGUAGE_LABELS) as [AppLanguage, string][]).map(([code, label]) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setLanguage(code)}
                    className={`min-h-10 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                      language === code
                        ? "bg-surface-dark text-on-dark shadow-sm scale-105"
                        : "bg-inner-panel border border-outline text-text-muted hover:text-text-strong hover:border-accent/30"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 flex items-center justify-between gap-3">
          {step > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep((s) => s - 1)}
              className="rounded-full"
            >
              Back
            </Button>
          ) : (
            <button
              type="button"
              onClick={onComplete}
              className="text-xs font-medium text-text-muted hover:text-text-strong transition"
            >
              Skip
            </button>
          )}
          <Button
            variant="secondary"
            onClick={() => {
              if (isLast) {
                onComplete();
              } else {
                setStep((s) => s + 1);
              }
            }}
            className="rounded-full px-6 shadow-sm"
          >
            {isLast ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Get Started
              </>
            ) : (
              <>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
