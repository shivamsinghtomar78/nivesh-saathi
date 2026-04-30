"use client";

import type React from "react";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle2, IndianRupee, ShieldCheck, Sparkles, TimerReset } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";

type BestFdWizardProps = {
  onClose: () => void;
  onSubmit: (payload: {
    amount: number;
    prompt: string;
    seniorCitizen: boolean;
    tenorMonths: number;
  }) => void;
};

const GOALS = [
  { label: "Highest return", value: "highest return" },
  { label: "Safest bank", value: "safest bank" },
  { label: "Balanced", value: "balanced return and safety" },
];

const LIQUIDITY = [
  { label: "Can lock fully", value: "I can lock the money for the full tenure" },
  { label: "May need early access", value: "I may need liquidity before maturity" },
];

const SAFETY = [
  { label: "Very conservative", value: "very conservative safety preference" },
  { label: "Moderate", value: "moderate safety preference" },
  { label: "Open to SFBs", value: "open to small finance banks for higher returns" },
];

export default function BestFdWizard({ onClose, onSubmit }: BestFdWizardProps) {
  const [step, setStep] = useState(0);
  const [amount, setAmount] = useState(500000);
  const [goal, setGoal] = useState(GOALS[2].value);
  const [tenorMonths, setTenorMonths] = useState(24);
  const [liquidity, setLiquidity] = useState(LIQUIDITY[0].value);
  const [seniorCitizen, setSeniorCitizen] = useState(false);
  const [safety, setSafety] = useState(SAFETY[1].value);
  const [taxSensitive, setTaxSensitive] = useState(false);

  const prompt = useMemo(
    () =>
      [
        `Find the best match FD for me based on these inputs: amount ${formatCurrency(amount)}, tenure ${tenorMonths} months.`,
        `Goal: ${goal}. Liquidity: ${liquidity}.`,
        `Investor: ${seniorCitizen ? "senior citizen" : "regular depositor"}. Tax sensitive: ${taxSensitive ? "yes" : "no"}.`,
        `Safety preference: ${safety}.`,
        "Rank the best overall, safest, and highest-return options. Explain in simple language and include DICGC/safety caveats.",
      ].join(" "),
    [amount, goal, liquidity, safety, seniorCitizen, taxSensitive, tenorMonths]
  );

  const steps = [
    {
      eyebrow: "Step 1 of 3",
      title: "How much are you placing?",
      body: (
        <div className="grid gap-4">
          <label className="grid gap-2">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
              <IndianRupee className="h-3.5 w-3.5" />
              Amount
            </span>
            <input
              type="number"
              min={10000}
              step={10000}
              value={amount}
              onChange={(event) => setAmount(Math.max(Number(event.target.value) || 10000, 10000))}
              className="min-h-12 rounded-[var(--radius-input)] border border-outline bg-input-bg px-4 text-base font-semibold text-text-strong outline-none focus:border-accent"
            />
          </label>
          <div className="grid gap-2 sm:grid-cols-3">
            {GOALS.map((option) => (
              <ChoiceButton key={option.value} active={goal === option.value} onClick={() => setGoal(option.value)}>
                {option.label}
              </ChoiceButton>
            ))}
          </div>
        </div>
      ),
    },
    {
      eyebrow: "Step 2 of 3",
      title: "What tenure fits your plan?",
      body: (
        <div className="grid gap-4">
          <label className="grid gap-2">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
              <TimerReset className="h-3.5 w-3.5" />
              Tenure in months
            </span>
            <input
              type="number"
              min={3}
              max={120}
              step={3}
              value={tenorMonths}
              onChange={(event) => setTenorMonths(Math.min(Math.max(Number(event.target.value) || 3, 3), 120))}
              className="min-h-12 rounded-[var(--radius-input)] border border-outline bg-input-bg px-4 text-base font-semibold text-text-strong outline-none focus:border-accent"
            />
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            {LIQUIDITY.map((option) => (
              <ChoiceButton key={option.value} active={liquidity === option.value} onClick={() => setLiquidity(option.value)}>
                {option.label}
              </ChoiceButton>
            ))}
          </div>
        </div>
      ),
    },
    {
      eyebrow: "Step 3 of 3",
      title: "Choose your risk comfort",
      body: (
        <div className="grid gap-4">
          <div className="grid gap-2 sm:grid-cols-3">
            {SAFETY.map((option) => (
              <ChoiceButton key={option.value} active={safety === option.value} onClick={() => setSafety(option.value)}>
                {option.label}
              </ChoiceButton>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <ToggleButton active={seniorCitizen} onClick={() => setSeniorCitizen((value) => !value)}>
              Senior citizen
            </ToggleButton>
            <ToggleButton active={taxSensitive} onClick={() => setTaxSensitive((value) => !value)}>
              Tax sensitive
            </ToggleButton>
          </div>
        </div>
      ),
    },
  ];

  const current = steps[step];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="mx-auto my-4 max-w-2xl rounded-[var(--radius-card)] border border-outline bg-panel p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
            {current.eyebrow}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-text-strong">{current.title}</h2>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            Answer three quick questions and Saathi will rank the best overall, safest, and highest-return options.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-semibold text-text-muted transition hover:text-text-strong"
        >
          Close
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 14 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -14 }}
          transition={{ duration: 0.2 }}
          className="mt-5"
        >
          {current.body}
        </motion.div>
      </AnimatePresence>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-outline pt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setStep((value) => Math.max(value - 1, 0))}
          disabled={step === 0}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Button>
        {step < steps.length - 1 ? (
          <Button variant="secondary" size="sm" onClick={() => setStep((value) => value + 1)}>
            Next
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onSubmit({ amount, prompt, seniorCitizen, tenorMonths })}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Ask Saathi
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function ChoiceButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-[var(--radius-input)] border px-3 text-sm font-semibold transition",
        active ? "border-accent bg-accent/10 text-accent" : "border-outline bg-input-bg text-text-muted hover:text-text-strong"
      )}
    >
      {children}
    </button>
  );
}

function ToggleButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-12 items-center justify-between rounded-[var(--radius-input)] border px-4 text-sm font-semibold transition",
        active ? "border-accent bg-accent/10 text-accent" : "border-outline bg-input-bg text-text-muted"
      )}
      aria-pressed={active}
    >
      <span className="inline-flex items-center gap-2">
        {active ? <CheckCircle2 className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
        {children}
      </span>
    </button>
  );
}
