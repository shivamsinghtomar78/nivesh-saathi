"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue, useMotionValueEvent, useSpring } from "framer-motion";
import { Calculator, IndianRupee, Percent, TimerReset } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { calculateMaturity } from "@/lib/maturity";
import { cn, formatCurrency } from "@/lib/utils";

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
  const hasMounted = useRef(false);

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
    if (!hasMounted.current) {
      setDisplayAmount(maturity.maturityAmount);
      hasMounted.current = true;
    }
    maturityValue.set(maturity.maturityAmount);
  }, [maturity.maturityAmount, maturityValue]);

  return (
    <Card className="w-full overflow-hidden border-outline bg-panel shadow-[var(--shadow-card)]">
      <CardHeader className="border-b border-outline/60 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg text-text-strong">
              <Calculator className="h-4 w-4 text-accent" />
              FD Calculator
            </CardTitle>
            <CardDescription className="mt-1 text-xs">
              {bankName
                ? `Pre-filled from ${bankName}. Adjust any assumption live.`
                : "Adjust amount, rate, tenure, and compounding without leaving chat."}
            </CardDescription>
          </div>
          <div className="rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent">
            Live
          </div>
        </div>
      </CardHeader>

      <CardContent className={cn("mt-0", compact ? "space-y-4 p-4" : "space-y-5 p-5")}>
        <motion.section
          layout
          className="rounded-[var(--radius-panel)] border border-accent/20 bg-accent/10 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
              Result Display
            </p>
            <span className="rounded-full border border-outline bg-input-bg px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
              Estimated maturity
            </span>
          </div>
          <motion.p
            key={maturity.maturityAmount}
            initial={{ opacity: 0.75, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="financial-value mt-3 text-4xl font-semibold tracking-tight text-text-strong"
          >
            {formatCurrency(displayAmount)}
          </motion.p>
          <div className="mt-4 grid gap-3 text-xs text-text-muted sm:grid-cols-2">
            <span className="rounded-[var(--radius-input)] border border-outline bg-input-bg px-3 py-2">
              Interest earned: <strong className="font-semibold text-text-strong">{formatCurrency(maturity.interestEarned)}</strong>
            </span>
            <span className="rounded-[var(--radius-input)] border border-outline bg-input-bg px-3 py-2">
              Effective yield: <strong className="font-semibold text-text-strong">{maturity.effectiveYield}%</strong>
            </span>
          </div>
          {principal > 500000 ? (
            <p className="mt-3 rounded-[var(--radius-input)] border border-accent-warm/20 bg-accent-warm/10 px-3 py-2 text-xs leading-relaxed text-text-strong">
              DICGC insurance generally covers deposits up to Rs 5 lakh per depositor per bank. Consider splitting larger amounts.
            </p>
          ) : null}
        </motion.section>

        <section className="rounded-[var(--radius-panel)] border border-outline bg-inner-panel p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
              Calculator Controls
            </p>
            <span className="text-xs font-medium text-text-muted">Live assumptions</span>
          </div>

          <div className={compact ? "grid gap-4" : "grid gap-5"}>
            <label className="grid gap-3">
              <span className="flex items-center justify-between gap-4">
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  <IndianRupee className="h-3.5 w-3.5 text-accent" />
                  Principal
                </span>
                <input
                  type="number"
                  min={10000}
                  max={5000000}
                  step={10000}
                  value={principal}
                  onChange={(event) => setPrincipal(clamp(Number(event.target.value) || 10000, 10000, 5000000))}
                  className="h-10 w-32 rounded-[var(--radius-input)] border border-outline bg-input-bg px-3 text-right text-sm font-semibold text-text-strong outline-none transition focus:border-accent"
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
              <span className="flex items-center justify-between gap-4">
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  <TimerReset className="h-3.5 w-3.5 text-accent" />
                  Tenure
                </span>
                <input
                  type="number"
                  min={3}
                  max={60}
                  step={3}
                  value={tenorMonths}
                  onChange={(event) => setTenorMonths(clamp(Number(event.target.value) || 3, 3, 60))}
                  className="h-10 w-24 rounded-[var(--radius-input)] border border-outline bg-input-bg px-3 text-right text-sm font-semibold text-text-strong outline-none transition focus:border-accent"
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
              <span className="flex items-center justify-between gap-4">
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  <Percent className="h-3.5 w-3.5 text-accent" />
                  Interest rate
                </span>
                <input
                  type="number"
                  min={4}
                  max={10}
                  step={0.05}
                  value={ratePercent}
                  onChange={(event) => setRatePercent(clamp(Number(event.target.value) || 4, 4, 10))}
                  className="h-10 w-24 rounded-[var(--radius-input)] border border-outline bg-input-bg px-3 text-right text-sm font-semibold text-text-strong outline-none transition focus:border-accent"
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

          <div className="mt-5 rounded-[var(--radius-input)] border border-outline bg-input-bg p-1">
            <div className="grid grid-cols-3 gap-1">
              {COMPOUNDING_OPTIONS.map((option) => {
                const active = compounding === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setCompounding(option.value)}
                    className={cn(
                      "min-h-10 rounded-[calc(var(--radius-input)-2px)] px-2 text-xs font-semibold transition-[background-color,color,box-shadow,transform] duration-200",
                      active
                        ? "bg-surface-dark text-on-dark shadow-[0_10px_24px_rgba(91,224,189,0.18)]"
                        : "text-text-muted hover:bg-inner-panel hover:text-text-strong"
                    )}
                    aria-pressed={active}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
