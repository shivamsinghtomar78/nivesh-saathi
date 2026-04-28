"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AudioLines,
  BadgeIndianRupee,
  ExternalLink,
  Filter,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import { toast } from "sonner";

import JargonSidebar from "@/components/compare/JargonSidebar";
import BottomNav from "@/components/layout/BottomNav";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import EmptyRatesState from "@/components/shared/EmptyRatesState";
import Skeleton from "@/components/shared/Skeleton";
import { APP_COPY } from "@/lib/copy";
import { FD_RATE_DATASET, type FDRate } from "@/lib/fd-data";
import { getJargonTerm, JARGON_DICTIONARY } from "@/lib/jargon";
import { calculateMaturity } from "@/lib/maturity";
import { ROUTES } from "@/lib/routes";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore } from "@/stores/chatStore";
import { useCompareStore } from "@/stores/compareStore";

const tenorOptions = [
  { label: "6M", months: 6 },
  { label: "12M", months: 12 },
  { label: "24M", months: 24 },
  { label: "36M", months: 36 },
  { label: "60M", months: 60 },
];

const bankTypeOptions = [
  { label: "All banks", value: "all" },
  { label: "Public", value: "public" },
  { label: "Private", value: "private" },
  { label: "Small finance", value: "small-finance" },
] as const;

type BankTypeFilter = (typeof bankTypeOptions)[number]["value"];

const rateAsOfLabel = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
}).format(new Date(FD_RATE_DATASET.asOf));

function parseTenor(value: string | null) {
  const tenor = Number(value);
  return tenorOptions.some((option) => option.months === tenor) ? tenor : 12;
}

function parseAmount(value: string | null) {
  const amount = Number(value?.replace(/\D/g, ""));
  return amount > 0 ? String(amount) : "100000";
}

function parseBankType(value: string | null): BankTypeFilter {
  return bankTypeOptions.some((option) => option.value === value)
    ? (value as BankTypeFilter)
    : "all";
}

function CompareSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="rounded-[28px] border border-outline bg-panel p-5 shadow-soft"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-12 w-12 rounded-2xl" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="mt-5 h-5 w-40 rounded-full" />
          <Skeleton className="mt-3 h-12 w-28 rounded-2xl" />
          <Skeleton className="mt-4 h-20 rounded-2xl" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Skeleton className="h-16 rounded-2xl" />
            <Skeleton className="h-16 rounded-2xl" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Skeleton className="h-11 rounded-2xl" />
            <Skeleton className="h-11 rounded-2xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FDComparisonPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const language = useChatStore((state) => state.language);
  const copy = APP_COPY[language].compare;
  const user = useAuthStore((state) => state.user);
  const shortlist = useCompareStore((state) => state.shortlist);
  const toggleShortlist = useCompareStore((state) => state.toggleShortlist);
  const clearShortlist = useCompareStore((state) => state.clearShortlist);
  const [selectedTenor, setSelectedTenor] = useState(() =>
    parseTenor(searchParams.get("tenor"))
  );
  const [amountInput, setAmountInput] = useState(() =>
    parseAmount(searchParams.get("amount"))
  );
  const [bankType, setBankType] = useState<BankTypeFilter>(() =>
    parseBankType(searchParams.get("bankType"))
  );
  const [rates, setRates] = useState<FDRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jargonOpen, setJargonOpen] = useState(false);
  const [selectedJargon, setSelectedJargon] = useState(JARGON_DICTIONARY[0]);

  const deferredAmountInput = useDeferredValue(amountInput);
  const amount = useMemo(() => {
    const numericValue = Number(deferredAmountInput.replace(/\D/g, ""));
    return numericValue > 0 ? numericValue : 100000;
  }, [deferredAmountInput]);

  useEffect(() => {
    let active = true;

    const timeout = setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          tenorMonths: String(selectedTenor),
          amount: String(amount),
          bankType,
          limit: "12",
        });
        const response = await fetch(`/api/fd-rates?${params.toString()}`);
        const payload = (await response.json()) as
          | { rates?: FDRate[]; error?: string }
          | undefined;

        if (!response.ok) {
          throw new Error(payload?.error || "Unable to load FD rates");
        }

        if (active) {
          setRates(payload?.rates ?? []);
        }
      } catch (loadError) {
        if (active) {
          const message =
            loadError instanceof Error
              ? loadError.message
              : "Unable to load FD rates";
          setError(message);
          setRates([]);
          toast.error(message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }, 180);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [amount, bankType, selectedTenor]);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("tenor", String(selectedTenor));
    params.set("amount", String(amount));
    params.set("bankType", bankType);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [amount, bankType, pathname, router, selectedTenor]);

  const openJargon = (termId: string) => {
    const term = getJargonTerm(termId);
    if (term) {
      setSelectedJargon(term);
      setJargonOpen(true);
    }
  };

  const shortlistedRates = rates.filter((rate) => shortlist.includes(rate.id));

  return (
    <>
      <Navbar />
      <Sidebar />

      <main className="min-h-screen pb-28 pt-16 lg:ml-64 lg:pb-8">
        <div className="sticky top-16 z-30 border-b border-outline bg-panel-glass backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 md:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-highlight">
                  Compare flow
                </p>
                <h1 className="mt-2 text-2xl font-semibold text-text-strong md:text-3xl">
                  {copy.title}
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-text-muted">
                  {copy.subtitle}
                </p>
                <p className="mt-2 max-w-3xl text-xs leading-5 text-text-muted">
                  {FD_RATE_DATASET.sourceLabel}, reviewed {rateAsOfLabel}. Verify
                  the final rate on the official bank page before booking.
                </p>
              </div>
              <div className="rounded-lg border border-outline bg-panel px-4 py-3 text-sm text-text-muted">
                {user ? (
                  <span>Signed in. Your shortlist is ready to sync across devices.</span>
                ) : (
                  <span>
                    Local shortlist is active.{" "}
                    <Link href={ROUTES.LOGIN} className="text-highlight hover:underline">
                      Sign in
                    </Link>{" "}
                    to keep it across devices.
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {tenorOptions.map((option) => (
                  <button
                    key={option.months}
                    type="button"
                    onClick={() => setSelectedTenor(option.months)}
                    className={`min-h-11 rounded-full px-4 text-sm font-semibold transition ${
                      selectedTenor === option.months
                        ? "bg-highlight text-black"
                        : "border border-outline bg-panel text-text-muted hover:border-highlight hover:text-text-strong"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-[minmax(0,180px)_minmax(0,220px)_auto]">
                <label className="grid gap-2 text-sm text-text-muted">
                  <span>Amount</span>
                  <div className="flex min-h-11 items-center rounded-lg border border-outline bg-panel px-4">
                    <BadgeIndianRupee className="h-4 w-4 text-highlight" />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={Number(amountInput || 0).toLocaleString("en-IN")}
                      onChange={(event) =>
                        setAmountInput(event.target.value.replace(/[^0-9]/g, ""))
                      }
                      className="w-full bg-transparent pl-2 text-base text-text-strong outline-none"
                      aria-label="Filter by deposit amount"
                    />
                  </div>
                </label>

                <label className="grid gap-2 text-sm text-text-muted">
                  <span>Bank type</span>
                  <div className="flex min-h-11 items-center rounded-lg border border-outline bg-panel px-4">
                    <Filter className="h-4 w-4 text-highlight" />
                    <select
                      value={bankType}
                      onChange={(event) =>
                        setBankType(event.target.value as BankTypeFilter)
                      }
                      className="w-full bg-transparent pl-2 text-base text-text-strong outline-none"
                      aria-label="Filter by bank type"
                    >
                      {bankTypeOptions.map((option) => (
                        <option key={option.value} value={option.value} className="bg-slate-950">
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>

                <button
                  type="button"
                  onClick={() => openJargon("compound-interest")}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-outline bg-panel px-5 text-sm font-semibold text-text-strong transition hover:border-highlight hover:text-highlight"
                >
                  Explain compound interest
                </button>
              </div>
            </div>
          </div>
        </div>

        <section className="mx-auto max-w-6xl px-4 py-5 md:px-6">
          {shortlist.length > 0 && (
            <div className="mb-5 flex flex-col gap-3 rounded-lg border border-outline bg-panel p-4 shadow-soft md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-highlight">
                  Shortlist
                </p>
                <p className="mt-2 text-sm text-text-muted">
                  {shortlist.length} bank{shortlist.length > 1 ? "s" : ""} saved for
                  deeper comparison with Saathi.
                </p>
              </div>
              <button
                type="button"
                onClick={clearShortlist}
                className="rounded-2xl border border-outline px-4 py-3 text-sm font-semibold text-text-strong transition hover:border-highlight hover:text-highlight"
              >
                Clear shortlist
              </button>
            </div>
          )}

          {loading ? <CompareSkeleton /> : null}

          {!loading && error ? (
            <div className="rounded-[28px] border border-red-500/30 bg-red-500/10 px-6 py-12 text-center text-red-200">
              {error}
            </div>
          ) : null}

          {!loading && !error && rates.length === 0 ? (
            <EmptyRatesState
              title={copy.emptyTitle}
              body={copy.emptyBody}
            />
          ) : null}

          {!loading && !error && rates.length > 0 ? (
            <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-2 md:overflow-visible xl:grid-cols-3">
              {rates.map((rate, index) => {
                const maturity = calculateMaturity({
                  principal: amount,
                  ratePercent: rate.regularRate,
                  tenorMonths: selectedTenor,
                  compounding: rate.compounding,
                });
                const activeShortlist = shortlist.includes(rate.id);

                return (
                  <motion.article
                      key={rate.id}
                      layout
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03, duration: 0.28 }}
                      className="min-w-[88%] snap-start rounded-lg border border-outline bg-panel p-4 shadow-soft md:min-w-0"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div
                            className="flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-semibold text-white"
                            style={{ backgroundColor: rate.color }}
                          >
                            {rate.bankCode.slice(0, 3)}
                          </div>
                          <div>
                            <p className="text-base font-semibold text-text-strong">
                              {rate.bankName}
                            </p>
                            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-text-muted">
                              {rate.bankType.replace("-", " ")}
                            </p>
                          </div>
                        </div>
                        {index === 0 || rate.badge ? (
                          <span className="rounded-full border border-highlight/30 bg-highlight/12 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-highlight">
                            {index === 0 ? "Top return" : rate.badge?.replace("-", " ")}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-5">
                        <p className="font-mono text-4xl font-semibold text-highlight">
                          {rate.regularRate.toFixed(2)}%
                        </p>
                        <p className="mt-1 text-sm text-text-muted">
                          {selectedTenor} months tenor
                        </p>
                      </div>

                      <div className="mt-4 rounded-lg border border-outline bg-app p-4">
                        <div className="flex items-center gap-2 text-highlight">
                          <Sparkles className="h-4 w-4" />
                          <span className="text-xs uppercase tracking-[0.2em]">
                            Maturity preview
                          </span>
                        </div>
                        <p className="mt-3 text-lg font-semibold text-text-strong">
                          {formatCurrency(amount)} to{" "}
                          {formatCurrency(maturity.maturityAmount)}
                        </p>
                        <p className="mt-2 text-sm text-text-muted">
                          Estimated gain {formatCurrency(maturity.interestEarned)}
                        </p>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-lg border border-outline bg-panel-strong px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-text-muted">
                            Min amount
                          </p>
                          <p className="mt-2 text-sm font-semibold text-text-strong">
                            {formatCurrency(rate.minAmount)}
                          </p>
                        </div>
                        <div className="rounded-lg border border-outline bg-panel-strong px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-text-muted">
                            Safety
                          </p>
                          <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-emerald-300">
                            <ShieldCheck className="h-4 w-4" />
                            DICGC context
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => openJargon("pa")}
                          className="min-h-11 rounded-lg border border-outline bg-panel-strong px-4 py-2 text-sm font-semibold text-text-strong transition hover:border-highlight hover:text-highlight"
                        >
                          Learn term
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            toggleShortlist(rate.id);
                            toast.success(
                              activeShortlist
                                ? `${rate.bankName} removed from shortlist`
                                : `${rate.bankName} saved to shortlist`
                            );
                          }}
                          className={`min-h-11 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                            activeShortlist
                              ? "bg-highlight text-black"
                              : "border border-outline bg-panel-strong text-text-strong hover:border-highlight hover:text-highlight"
                          }`}
                        >
                          {activeShortlist ? "Saved" : copy.shortlist}
                        </button>
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() =>
                            startTransition(() => {
                              router.push(ROUTES.CHAT);
                            })
                          }
                          className="inline-flex items-center gap-2 text-sm font-semibold text-highlight"
                        >
                          <AudioLines className="h-4 w-4" />
                          {copy.askSaathi}
                        </button>

                        {rate.officialUrl ? (
                          <Link
                            href={rate.officialUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-sm font-medium text-text-muted transition hover:text-text-strong"
                          >
                            Official site
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        ) : null}
                      </div>
                      <p className="mt-3 text-[11px] leading-5 text-text-muted">
                        {rate.sourceLabel}, reviewed {rateAsOfLabel}. Source: official
                        bank page.
                      </p>
                  </motion.article>
                );
              })}
            </div>
          ) : null}
        </section>
      </main>

      <BottomNav />

      <AnimatePresence>
        {shortlistedRates.length > 0 ? (
          <motion.div
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 24 }}
            className="fixed inset-x-4 bottom-20 z-40 rounded-[28px] border border-outline bg-panel-glass p-4 shadow-soft backdrop-blur-xl lg:bottom-6 lg:left-auto lg:right-6 lg:w-[420px]"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-highlight text-black">
                <Star className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-text-strong">
                  {copy.stickyTitle}
                </p>
                <p className="mt-1 text-xs leading-5 text-text-muted">
                  {shortlistedRates.map((rate) => rate.bankName).join(", ")}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                startTransition(() => {
                  router.push(ROUTES.CHAT);
                })
              }
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-highlight px-5 py-3 text-sm font-semibold text-black transition hover:brightness-110"
            >
              {copy.stickyCta}
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <JargonSidebar
        isOpen={jargonOpen}
        onClose={() => setJargonOpen(false)}
        term={selectedJargon}
        onSelectTerm={(id) => {
          const term = getJargonTerm(id);
          if (term) {
            setSelectedJargon(term);
          }
        }}
      />
    </>
  );
}
