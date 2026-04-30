"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useMotionValue, useMotionValueEvent, useSpring } from "framer-motion";
import { Calculator, IndianRupee, Percent, TimerReset } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { calculateMaturity } from "@/lib/maturity";
import { formatCurrency } from "@/lib/utils";

type CompoundingMode = "quarterly" | "monthly" | "annual";

const COMPOUNDING_OPTIONS: Array<{ value: CompoundingMode; label: string }> = [
  { value: "quarterly", label: "Quarterly" },
  { value: "monthly", label: "Monthly" },
  { value: "annual", label: "Annual" },
];

type FDCalculatorCardProps = {
  bankName?: string;
  compact?: boolean;
  defaultCompounding?: CompoundingMode;
  defaultPrincipal?: number;
  defaultRatePercent?: number;
  defaultTenorMonths?: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function FDCalculatorCard({
  bankName,
  compact = false,
  defaultCompounding = "quarterly",
  defaultPrincipal = 100000,
  defaultRatePercent = 7.5,
  defaultTenorMonths = 12,
}: FDCalculatorCardProps) {
  const [principal, setPrincipal] = useState(() => clamp(defaultPrincipal, 10000, 5000000));
  const [tenorMonths, setTenorMonths] = useState(() => clamp(defaultTenorMonths, 3, 60));
  const [ratePercent, setRatePercent] = useState(() => clamp(defaultRatePercent, 4, 10));
  const [compounding, setCompounding] = useState<CompoundingMode>(defaultCompounding);
  const [displayAmount, setDisplayAmount] = useState(principal);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPrincipal(clamp(defaultPrincipal, 10000, 5000000));
      setTenorMonths(clamp(defaultTenorMonths, 3, 60));
      setRatePercent(clamp(defaultRatePercent, 4, 10));
      setCompounding(defaultCompounding);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [defaultCompounding, defaultPrincipal, defaultRatePercent, defaultTenorMonths]);

  const maturity = useMemo(
    () =>
      calculateMaturity({
        principal,
        ratePercent,
        tenorMonths,
        compounding,
      }),
    [compounding, principal, ratePercent, tenorMonths]
  );

  const maturityValue = useMotionValue(maturity.maturityAmount);
  const springValue = useSpring(maturityValue, {
    damping: 24,
    stiffness: 180,
    mass: 0.7,
  });

  useMotionValueEvent(springValue, "change", (latest) => {
    setDisplayAmount(Math.round(latest));
  });

  useEffect(() => {
    maturityValue.set(maturity.maturityAmount);
  }, [maturity.maturityAmount, maturityValue]);

  return (
    <Card className="w-full overflow-hidden border-outline bg-panel shadow-sm">
      <CardHeader className="border-b border-outline/50 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base text-text-strong">
              <Calculator className="h-4 w-4 text-accent" />
              FD Calculator
            </CardTitle>
            <CardDescription className="mt-1 text-xs">
              {bankName
                ? `Pre-filled from ${bankName}. Adjust any assumption live.`
                : "Adjust amount, rate, tenure, and compounding without leaving chat."}
            </CardDescription>
          </div>
          <div className="rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent">
            Live
          </div>
        </div>
      </CardHeader>

      <CardContent className={compact ? "space-y-4 pt-4" : "space-y-5 pt-5"}>
        <div className="rounded-[var(--radius-panel)] border border-outline bg-inner-panel p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Estimated maturity
          </p>
          <motion.p
            key={maturity.maturityAmount}
            initial={{ opacity: 0.75, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 text-3xl font-semibold tracking-tight text-text-strong"
          >
            {formatCurrency(displayAmount)}
          </motion.p>
          <div className="mt-3 grid gap-2 text-xs text-text-muted sm:grid-cols-2">
            <span>Interest earned: {formatCurrency(maturity.interestEarned)}</span>
            <span>Effective yield: {maturity.effectiveYield}%</span>
          </div>
          {principal > 500000 ? (
            <p className="mt-3 rounded-[var(--radius-input)] border border-accent-warm/20 bg-accent-warm/10 px-3 py-2 text-xs leading-relaxed text-text-strong">
              DICGC insurance generally covers deposits up to Rs 5 lakh per depositor per bank. Consider splitting larger amounts.
            </p>
          ) : null}
        </div>

        <div className={compact ? "grid gap-4" : "grid gap-5"}>
          <label className="grid gap-3">
            <span className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
              <span className="inline-flex items-center gap-1.5">
                <IndianRupee className="h-3.5 w-3.5" />
                Principal
              </span>
              <input
                type="number"
                min={10000}
                max={5000000}
                step={10000}
                value={principal}
                onChange={(event) => setPrincipal(clamp(Number(event.target.value) || 10000, 10000, 5000000))}
                className="h-8 w-28 rounded-[var(--radius-input)] border border-outline bg-input-bg px-2 text-right text-xs font-semibold text-text-strong outline-none"
                aria-label="FD principal amount"
              />
            </span>
            <Slider
              min={10000}
              max={5000000}
              step={10000}
              value={[principal]}
              onValueChange={(value) => setPrincipal(value[0] ?? principal)}
              aria-label="FD principal amount"
            />
          </label>

          <label className="grid gap-3">
            <span className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
              <span className="inline-flex items-center gap-1.5">
                <TimerReset className="h-3.5 w-3.5" />
                Tenure
              </span>
              <input
                type="number"
                min={3}
                max={60}
                step={3}
                value={tenorMonths}
                onChange={(event) => setTenorMonths(clamp(Number(event.target.value) || 3, 3, 60))}
                className="h-8 w-20 rounded-[var(--radius-input)] border border-outline bg-input-bg px-2 text-right text-xs font-semibold text-text-strong outline-none"
                aria-label="FD tenure in months"
              />
            </span>
            <Slider
              min={3}
              max={60}
              step={3}
              value={[tenorMonths]}
              onValueChange={(value) => setTenorMonths(value[0] ?? tenorMonths)}
              aria-label="FD tenure in months"
            />
          </label>

          <label className="grid gap-3">
            <span className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Percent className="h-3.5 w-3.5" />
                Interest rate
              </span>
              <input
                type="number"
                min={4}
                max={10}
                step={0.05}
                value={ratePercent}
                onChange={(event) => setRatePercent(clamp(Number(event.target.value) || 4, 4, 10))}
                className="h-8 w-20 rounded-[var(--radius-input)] border border-outline bg-input-bg px-2 text-right text-xs font-semibold text-text-strong outline-none"
                aria-label="FD interest rate"
              />
            </span>
            <Slider
              min={4}
              max={10}
              step={0.05}
              value={[ratePercent]}
              onValueChange={(value) => setRatePercent(value[0] ?? ratePercent)}
              aria-label="FD interest rate"
            />
          </label>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {COMPOUNDING_OPTIONS.map((option) => {
            const active = compounding === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setCompounding(option.value)}
                className={
                  active
                    ? "min-h-10 rounded-xl bg-surface-dark px-2 text-xs font-semibold text-on-dark shadow-sm"
                    : "min-h-10 rounded-xl border border-outline bg-input-bg px-2 text-xs font-semibold text-text-muted transition hover:border-accent/30 hover:text-text-strong"
                }
                aria-pressed={active}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
