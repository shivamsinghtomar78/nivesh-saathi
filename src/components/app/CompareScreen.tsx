"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Star, Filter, Calculator, Landmark, MessageCircleMore, X, ChevronUp, Bell, BellRing, ExternalLink } from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";

import AuthGate from "@/components/auth/AuthGate";
import AppShell from "@/components/app/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { FDRate } from "@/lib/fd-data";
import { calculateMaturity } from "@/lib/maturity";
import { buildAffiliateBookingUrl } from "@/lib/affiliate";
import { withCsrfHeaders } from "@/lib/csrf";
import { ROUTES } from "@/lib/routes";
import { formatCurrency, cn } from "@/lib/utils";
import type { BankTypeFilter } from "@/lib/server/advisor-schemas";
import { useAuthStore } from "@/stores/authStore";
import { useCompareStore } from "@/stores/compareStore";

const TENOR_OPTIONS = [6, 12, 18, 24, 36, 60];

function getDisplayRate(rate: FDRate, seniorCitizen: boolean) {
  return seniorCitizen ? rate.seniorRate : rate.regularRate;
}

const listVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
};

export default function CompareScreen() {
  const user = useAuthStore((state) => state.user);
  const shortlist = useCompareStore((state) => state.shortlist);
  const toggleShortlist = useCompareStore((state) => state.toggleShortlist);
  const [amount, setAmount] = useState(100000);
  const [tenorMonths, setTenorMonths] = useState(12);
  const [bankType, setBankType] = useState<BankTypeFilter>("all");
  const [seniorCitizen, setSeniorCitizen] = useState(false);
  const [rates, setRates] = useState<FDRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [watchedBankIds, setWatchedBankIds] = useState<string[]>([]);
  const watchedBankSet = useMemo(() => new Set(watchedBankIds), [watchedBankIds]);

  useEffect(() => {
    if (!user) {
      return;
    }

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
  }, [amount, bankType, seniorCitizen, tenorMonths, user]);

  const [shortlistedBanks, setShortlistedBanks] = useState<FDRate[]>([]);

  useEffect(() => {
    if (!user) {
      return;
    }

    if (shortlist.length === 0) {
      const timer = window.setTimeout(() => setShortlistedBanks([]), 0);
      return () => window.clearTimeout(timer);
    }
    const controller = new AbortController();
    fetch(`/api/fd-rates`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => {
        const all: FDRate[] = d.rates || [];
        setShortlistedBanks(all.filter((r) => shortlist.includes(r.id)));
      })
      .catch(() => {});
    return () => controller.abort();
  }, [shortlist, user]);

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    fetch("/api/watchers", { signal: controller.signal })
      .then((response) => response.json())
      .then((payload: { watchers?: string[] }) => {
        setWatchedBankIds(payload.watchers ?? []);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [user]);

  const toggleWatcher = async (bankId: string) => {
    if (!user) return;
    const isWatching = watchedBankIds.includes(bankId);
    setWatchedBankIds((current) =>
      isWatching ? current.filter((id) => id !== bankId) : [...current, bankId]
    );
    await fetch("/api/watchers", {
      method: isWatching ? "DELETE" : "POST",
      headers: withCsrfHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ bankId }),
    }).catch(() => {
      setWatchedBankIds((current) =>
        isWatching ? [...current, bankId] : current.filter((id) => id !== bankId)
      );
    });
  };

  return (
    <AppShell
      eyebrow="Market Comparison"
      title="Analyze and Shortlist Fixed Deposits"
      description="Filter by your preferences, compare returns side-by-side, and build a shortlist to discuss with our AI advisors."
      actions={user ? (
        <Link href={ROUTES.CHAT}>
          <Button variant="secondary" className="rounded-full shadow-sm">
            <MessageCircleMore className="mr-2 h-4 w-4" />
            Ask Saathi
          </Button>
        </Link>
      ) : null}
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
                    className="w-full min-h-[44px] rounded-[var(--radius-input)] border border-outline bg-input-bg px-4 text-sm font-medium text-text-strong outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/20 custom-select"
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
                    className="w-full min-h-[44px] rounded-[var(--radius-input)] border border-outline bg-input-bg px-4 text-sm font-medium text-text-strong outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/20 custom-select"
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
                          shortlisted ? "border-accent bg-panel shadow-[var(--shadow-card)]" : "border-outline bg-panel-glass shadow-sm hover:border-accent/35 hover:shadow-[var(--shadow-card)]"
                        )}>
                          <div className="flex flex-col md:flex-row gap-6">
                            <div className="flex-1">
                              <div className="flex items-start justify-between gap-3 mb-4">
                                <div>
                                  <div className="flex items-center gap-3">
                                    <h3 className="text-xl font-semibold text-text-strong">{rate.bankName}</h3>
                                    {index === 0 && <Badge variant="outline" className="border-highlight/30 bg-highlight-soft text-highlight">Top Yield</Badge>}
                                  </div>
                                  <p className="mt-1 text-sm text-text-muted capitalize">
                                    {rate.bankType.replace("-", " ")} Bank
                                  </p>
                                </div>
                                {rate.badge && <Badge variant="outline" className="bg-panel">{rate.badge}</Badge>}
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3 mb-4 md:grid-cols-4">
                                <div className="bg-inner-panel rounded-xl p-3">
                                  <p className="text-[11px] uppercase tracking-wider text-text-muted font-medium">Regular Rate</p>
                                  <p className="financial-value text-2xl font-bold text-accent mt-1">{rate.regularRate.toFixed(2)}%</p>
                                </div>
                                <div className="bg-inner-panel rounded-xl p-3">
                                  <p className="text-[11px] uppercase tracking-wider text-text-muted font-medium">Senior Rate</p>
                                  <p className="financial-value text-2xl font-bold text-highlight mt-1">{rate.seniorRate.toFixed(2)}%</p>
                                </div>
                                <div className="bg-inner-panel rounded-xl p-3">
                                  <p className="text-[11px] uppercase tracking-wider text-text-muted font-medium">Tenure</p>
                                  <p className="financial-value text-lg font-semibold text-text-strong mt-1">{rate.tenorLabel}</p>
                                </div>
                                <div className="bg-inner-panel rounded-xl p-3">
                                  <p className="text-[11px] uppercase tracking-wider text-text-muted font-medium">Maturity</p>
                                  <p className="financial-value text-lg font-semibold text-text-strong mt-1">{formatCurrency(maturity.maturityAmount)}</p>
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
                                  <span className={cn("font-medium", rate.dicgcInsured ? "text-success" : "text-danger")}>{rate.dicgcInsured ? "DICGC insured" : "Not insured"}</span>
                                </p>
                                <p className="flex justify-between border-b border-outline pb-1">
                                  <span>Applied:</span> 
                                  <span className="financial-value font-medium text-text-strong">{appliedRate.toFixed(2)}%</span>
                                </p>
                              </div>
                              
                              <div className="flex flex-col gap-2 mt-auto">
                                <Button
                                  variant={shortlisted ? "secondary" : "primary"}
                                  onClick={() => toggleShortlist(rate.id)}
                                  className={cn("w-full shadow-sm", !shortlisted && "bg-surface-dark text-on-dark hover:bg-surface-dark-hover")}
                                >
                                  <Star className={cn("mr-2 h-4 w-4", shortlisted ? "fill-current" : "")} />
                                  {shortlisted ? "Added to Shortlist" : "Shortlist Rate"}
                                </Button>
                                <div className="grid grid-cols-2 gap-2">
                                  <Button
                                    variant="outline"
                                    onClick={() => void toggleWatcher(rate.id)}
                                    disabled={!user}
                                    className="w-full bg-input-bg"
                                    aria-label={user ? `Watch ${rate.bankName} rate changes` : "Sign in to watch rate changes"}
                                    title={user ? "Watch rate changes" : "Sign in to watch rate changes"}
                                  >
                                    {watchedBankSet.has(rate.id) ? (
                                      <BellRing className="h-4 w-4 text-accent" />
                                    ) : (
                                      <Bell className="h-4 w-4" />
                                    )}
                                    {watchedBankSet.has(rate.id) ? "Watching" : "Watch"}
                                  </Button>
                                  <a
                                    href={buildAffiliateBookingUrl(rate, "compare_card")}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-outline bg-input-bg px-3 text-sm font-semibold text-text-strong transition hover:border-accent/35 hover:bg-panel-strong"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                    Book
                                  </a>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              ) : (
                <EmptyState
                  title="No Matching Deposits"
                  description="Try adjusting your investment amount or duration, or clear the bank type filter."
                  icon={<Filter className="w-5 h-5 text-text-muted" />}
                />
              )}
            </motion.div>
          </div>

          {/* Desktop sidebar */}
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
                        Ask Saathi
                        <ArrowUpRight className="h-4 w-4 opacity-70" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Mobile shortlist floating pill + bottom sheet */}
        <div className="xl:hidden">
          {shortlist.length > 0 && !showBottomSheet && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              type="button"
              onClick={() => setShowBottomSheet(true)}
              className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 inline-flex items-center gap-2 rounded-full bg-surface-dark text-on-dark px-5 py-3 text-sm font-semibold shadow-lg transition hover:bg-surface-dark-hover"
            >
              <Star className="h-4 w-4 fill-accent text-accent" />
              Shortlist ({shortlist.length})
              <ChevronUp className="h-4 w-4" />
            </motion.button>
          )}

          <AnimatePresence>
            {showBottomSheet && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowBottomSheet(false)}
                  className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
                />
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 30, stiffness: 300 }}
                  className="fixed inset-x-0 bottom-0 z-50 max-h-[70vh] overflow-y-auto rounded-t-[var(--radius-card)] border-t border-outline bg-panel shadow-lg"
                >
                  <div className="sticky top-0 bg-panel border-b border-outline p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-accent fill-accent/20" />
                      <h3 className="text-lg font-semibold text-text-strong">
                        Shortlist ({shortlist.length})
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowBottomSheet(false)}
                      className="h-8 w-8 flex items-center justify-center rounded-full bg-inner-panel text-text-muted hover:text-text-strong transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="p-4 grid gap-3">
                    {shortlistedBanks.length > 0 ? (
                      shortlistedBanks.map((rate) => {
                        const maturity = calculateMaturity({
                          principal: amount,
                          ratePercent: getDisplayRate(rate, seniorCitizen),
                          tenorMonths,
                          compounding: rate.compounding,
                        });

                        return (
                          <div
                            key={rate.id}
                            className="rounded-2xl border border-outline bg-inner-panel p-4"
                          >
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <p className="font-semibold text-text-strong">{rate.bankName}</p>
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
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-text-muted text-center py-6">
                        No banks shortlisted yet.
                      </p>
                    )}
                    <Link href={ROUTES.CHAT} onClick={() => setShowBottomSheet(false)}>
                      <Button variant="secondary" className="w-full justify-between mt-2" disabled={shortlistedBanks.length === 0}>
                        Ask Saathi
                        <ArrowUpRight className="h-4 w-4 opacity-70" />
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </AuthGate>
    </AppShell>
  );
}
