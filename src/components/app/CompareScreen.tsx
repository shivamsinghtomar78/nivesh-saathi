"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Star, Filter, Calculator, Landmark, MessageCircleMore, Mic } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import AuthGate from "@/components/auth/AuthGate";
import AppShell from "@/components/app/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type FDRate, FD_RATES } from "@/lib/fd-data";
import { calculateMaturity } from "@/lib/maturity";
import { ROUTES } from "@/lib/routes";
import { formatCurrency } from "@/lib/utils";
import type { BankTypeFilter } from "@/lib/server/advisor-schemas";
import { useCompareStore } from "@/stores/compareStore";

const TENOR_OPTIONS = [6, 12, 18, 24, 36, 60];

function getDisplayRate(rate: FDRate, seniorCitizen: boolean) {
  return seniorCitizen ? rate.seniorRate : rate.regularRate;
}

const listVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
};

export default function CompareScreen() {
  const shortlist = useCompareStore((state) => state.shortlist);
  const toggleShortlist = useCompareStore((state) => state.toggleShortlist);
  const [amount, setAmount] = useState(100000);
  const [tenorMonths, setTenorMonths] = useState(12);
  const [bankType, setBankType] = useState<BankTypeFilter>("all");
  const [seniorCitizen, setSeniorCitizen] = useState(false);
  const [rates, setRates] = useState<FDRate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      amount: String(amount),
      tenorMonths: String(tenorMonths),
      seniorCitizen: String(seniorCitizen),
      bankType,
    });

    fetch(`/api/fd-rates?${params.toString()}`, {
      signal: controller.signal,
    })
      .then((response) => response.json() as Promise<{ rates?: FDRate[] }>)
      .then((payload) => {
        setRates(payload.rates ?? []);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setRates([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [amount, bankType, seniorCitizen, tenorMonths]);

  const shortlistedBanks = useMemo(
    () => FD_RATES.filter((rate) => shortlist.includes(rate.id)),
    [shortlist]
  );

  return (
    <AppShell
      eyebrow="Market Comparison"
      title="Analyze and Shortlist Fixed Deposits"
      description="Filter by your preferences, compare returns side-by-side, and build a shortlist to discuss with our AI advisors."
      actions={
        <div className="flex gap-3">
          <Link href={ROUTES.CHAT}>
            <Button variant="secondary" className="rounded-full shadow-sm">
              <MessageCircleMore className="mr-2 h-4 w-4" />
              Discuss in Chat
            </Button>
          </Link>
          <Link href={ROUTES.VOICE}>
            <Button variant="outline" className="rounded-full bg-panel-glass">
              <Mic className="mr-2 h-4 w-4" />
              Start Voice Call
            </Button>
          </Link>
        </div>
      }
    >
      <AuthGate
        title="Sign in to view comparisons"
        body="Your shortlist and preferences are securely synced to your profile."
      >
        <div className="grid gap-8 xl:grid-cols-[1fr_360px]">
          <div className="grid gap-8">
            <Card className="p-6 border-outline bg-panel-glass shadow-sm">
              <CardHeader className="pb-5 border-b border-outline/50 mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <Filter className="w-4 h-4 text-accent" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Parameters</span>
                </div>
                <CardTitle className="text-xl">Investment Criteria</CardTitle>
                <CardDescription>Adjust these settings to update the available rates below.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1">
                    <Calculator className="w-3 h-3" /> Principal
                  </span>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted font-medium">₹</span>
                    <input
                      type="number"
                      min={1000}
                      step={1000}
                      value={amount}
                      onChange={(event) => {
                        setLoading(true);
                        setAmount(Number(event.target.value) || 1000);
                      }}
                      className="w-full min-h-[44px] rounded-[var(--radius-input)] border border-outline bg-input-bg pl-8 pr-4 text-sm font-medium text-text-strong outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/20"
                    />
                  </div>
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Duration
                  </span>
                  <select
                    value={tenorMonths}
                    onChange={(event) => {
                      setLoading(true);
                      setTenorMonths(Number(event.target.value));
                    }}
                    className="w-full min-h-[44px] rounded-[var(--radius-input)] border border-outline bg-input-bg px-4 text-sm font-medium text-text-strong outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/20 appearance-none"
                    style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%236b6f77%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem top 50%', backgroundSize: '0.65rem auto' }}
                  >
                    {TENOR_OPTIONS.map((value) => (
                      <option key={value} value={value}>
                        {value} months
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1">
                    <Landmark className="w-3 h-3" /> Institution
                  </span>
                  <select
                    value={bankType}
                    onChange={(event) => {
                      setLoading(true);
                      setBankType(event.target.value as BankTypeFilter);
                    }}
                    className="w-full min-h-[44px] rounded-[var(--radius-input)] border border-outline bg-input-bg px-4 text-sm font-medium text-text-strong outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/20 appearance-none"
                    style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%236b6f77%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem top 50%', backgroundSize: '0.65rem auto' }}
                  >
                    <option value="all">All Types</option>
                    <option value="public">Public Sector</option>
                    <option value="private">Private Sector</option>
                    <option value="small-finance">Small Finance</option>
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Senior Citizen
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setLoading(true);
                      setSeniorCitizen((current) => !current);
                    }}
                    className="flex min-h-[44px] items-center justify-between rounded-[var(--radius-input)] border border-outline bg-input-bg px-4 text-sm font-medium text-text-strong transition-all focus:outline-none focus:ring-2 focus:ring-accent/20"
                  >
                    <span>{seniorCitizen ? "Eligible" : "Not Eligible"}</span>
                    <span className={`h-5 w-9 rounded-full p-0.5 transition-colors ${seniorCitizen ? "bg-accent" : "bg-outline"}`}>
                      <span className={`block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${seniorCitizen ? "translate-x-4" : "translate-x-0"}`} />
                    </span>
                  </button>
                </label>
              </CardContent>
            </Card>

            <motion.div 
              variants={listVariants}
              initial="hidden"
              animate="visible"
              className="grid gap-4"
            >
              {loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <Card key={index} className="p-6 border-outline bg-panel-glass shadow-none">
                    <div className="h-40 animate-pulse rounded-[var(--radius-panel)] bg-inner-panel/50" />
                  </Card>
                ))
              ) : rates.length > 0 ? (
                <AnimatePresence mode="popLayout">
                  {rates.map((rate, index) => {
                    const appliedRate = getDisplayRate(rate, seniorCitizen);
                    const maturity = calculateMaturity({
                      principal: amount,
                      ratePercent: appliedRate,
                      tenorMonths,
                      compounding: rate.compounding,
                    });
                    const shortlisted = shortlist.includes(rate.id);

                    return (
                      <motion.div
                        key={rate.id}
                        layout
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                      >
                        <Card className={cn(
                          "p-6 transition-all duration-300",
                          shortlisted ? "border-accent shadow-md bg-panel" : "border-outline shadow-sm bg-panel-glass hover:shadow-md hover:border-highlight"
                        )}>
                          <div className="flex flex-col md:flex-row gap-6">
                            <div className="flex-1">
                              <div className="flex items-start justify-between gap-3 mb-4">
                                <div>
                                  <div className="flex items-center gap-3">
                                    <h3 className="text-xl font-semibold text-text-strong">{rate.bankName}</h3>
                                    {index === 0 && <Badge variant="accent" className="bg-accent/10 text-accent">Top Yield</Badge>}
                                  </div>
                                  <p className="mt-1 text-sm text-text-muted capitalize">
                                    {rate.bankType.replace("-", " ")} Bank
                                  </p>
                                </div>
                                {rate.badge && <Badge variant="outline" className="bg-white">{rate.badge}</Badge>}
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="bg-inner-panel rounded-xl p-3">
                                  <p className="text-[11px] uppercase tracking-wider text-text-muted font-medium">Interest Rate</p>
                                  <p className="text-2xl font-bold text-accent mt-1">{appliedRate.toFixed(2)}%</p>
                                </div>
                                <div className="bg-inner-panel rounded-xl p-3">
                                  <p className="text-[11px] uppercase tracking-wider text-text-muted font-medium">Returns</p>
                                  <p className="text-xl font-semibold text-text-strong mt-1">{formatCurrency(maturity.maturityAmount)}</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="w-full md:w-64 flex flex-col justify-between gap-4">
                              <div className="space-y-2 text-sm text-text-muted">
                                <p className="flex justify-between border-b border-outline pb-1">
                                  <span>Range:</span> 
                                  <span className="font-medium text-text-strong">{formatCurrency(rate.minAmount)} - {rate.maxAmount >= 100000000 ? 'Max' : formatCurrency(rate.maxAmount)}</span>
                                </p>
                                <p className="flex justify-between border-b border-outline pb-1">
                                  <span>Insurance:</span> 
                                  <span className="font-medium text-text-strong">{rate.dicgcInsured ? "DICGC" : "N/A"}</span>
                                </p>
                              </div>
                              
                              <div className="flex flex-col gap-2 mt-auto">
                                <Button
                                  variant={shortlisted ? "secondary" : "default"}
                                  onClick={() => toggleShortlist(rate.id)}
                                  className={cn("w-full shadow-sm", !shortlisted && "bg-surface-dark text-on-dark hover:bg-surface-dark-hover")}
                                >
                                  <Star className={cn("mr-2 h-4 w-4", shortlisted ? "fill-current" : "")} />
                                  {shortlisted ? "Added to Shortlist" : "Shortlist Rate"}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              ) : (
                <motion.div variants={itemVariants}>
                  <Card className="p-10 border-dashed border-outline bg-panel-glass text-center">
                    <CardHeader>
                      <div className="w-12 h-12 rounded-full bg-outline/20 mx-auto flex items-center justify-center mb-4">
                        <Filter className="w-5 h-5 text-text-muted" />
                      </div>
                      <CardTitle className="text-xl">No Matching Deposits</CardTitle>
                      <CardDescription className="max-w-md mx-auto mt-2">
                        Try adjusting your investment amount or duration, or clear the bank type filter.
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </motion.div>
              )}
            </motion.div>
          </div>

          <div className="hidden xl:block relative">
            <div className="sticky top-24">
              <Card className="p-6 border-outline bg-panel shadow-sm">
                <CardHeader className="pb-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="w-4 h-4 text-accent fill-accent/20" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Your Selection</span>
                  </div>
                  <CardTitle className="text-xl">Shortlist</CardTitle>
                  <CardDescription>
                    Banks saved here will be available when you talk to the AI advisor.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <AnimatePresence>
                    {shortlistedBanks.length > 0 ? (
                      shortlistedBanks.map((rate) => {
                        const maturity = calculateMaturity({
                          principal: amount,
                          ratePercent: getDisplayRate(rate, seniorCitizen),
                          tenorMonths,
                          compounding: rate.compounding,
                        });

                        return (
                          <motion.div
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9, height: 0, overflow: 'hidden' }}
                            key={rate.id}
                            className="rounded-2xl border border-outline bg-inner-panel p-4"
                          >
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <p className="font-semibold text-text-strong leading-tight">
                                {rate.bankName}
                              </p>
                              <button
                                type="button"
                                onClick={() => toggleShortlist(rate.id)}
                                className="text-xs font-medium text-danger hover:text-danger/70 transition"
                              >
                                Remove
                              </button>
                            </div>
                            <div className="flex justify-between items-end">
                              <p className="text-sm text-text-muted font-medium">
                                {getDisplayRate(rate, seniorCitizen).toFixed(2)}%
                              </p>
                              <p className="text-sm font-semibold text-text-strong">
                                {formatCurrency(maturity.maturityAmount)}
                              </p>
                            </div>
                          </motion.div>
                        );
                      })
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="rounded-2xl border border-dashed border-outline bg-inner-panel/50 p-6 text-center"
                      >
                        <p className="text-sm text-text-muted">
                          Click &quot;Shortlist Rate&quot; on any option to save it here.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="mt-4 grid gap-3">
                    <Link href={ROUTES.CHAT}>
                      <Button variant="secondary" className="w-full justify-between" disabled={shortlistedBanks.length === 0}>
                        Ask AI Assistant
                        <ArrowUpRight className="h-4 w-4 opacity-70" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </AuthGate>
    </AppShell>
  );
}

