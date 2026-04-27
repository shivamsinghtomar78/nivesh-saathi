"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import JargonSidebar from "@/components/compare/JargonSidebar";
import BottomNav from "@/components/layout/BottomNav";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import { type FDRate } from "@/lib/fd-data";
import { getJargonTerm, JARGON_DICTIONARY } from "@/lib/jargon";
import { calculateMaturity } from "@/lib/maturity";
import { formatCurrency } from "@/lib/utils";

const tenorOptions = [
  { label: "6M", months: 6 },
  { label: "12M", months: 12 },
  { label: "24M", months: 24 },
  { label: "36M", months: 36 },
  { label: "60M", months: 60 },
];

const bankTypeOptions = [
  { label: "All Banks", value: "all" },
  { label: "Public", value: "public" },
  { label: "Private", value: "private" },
  { label: "Small Finance", value: "small-finance" },
] as const;

const badgeLabels: Record<string, { text: string; color: string }> = {
  "best-value": { text: "Best Value", color: "bg-forest text-white" },
  popular: { text: "Popular", color: "bg-saffron/10 text-saffron" },
  "safe-choice": { text: "Safe Choice", color: "bg-forest-light text-forest-dark" },
};

type BankTypeFilter = (typeof bankTypeOptions)[number]["value"];

export default function FDComparisonPage() {
  const [selectedTenor, setSelectedTenor] = useState(12);
  const [amountInput, setAmountInput] = useState("100000");
  const [bankType, setBankType] = useState<BankTypeFilter>("all");
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

    const loadRates = async () => {
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
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load FD rates"
          );
          setRates([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadRates();

    return () => {
      active = false;
    };
  }, [amount, bankType, selectedTenor]);

  const openJargon = (termId: string) => {
    const term = getJargonTerm(termId);
    if (term) {
      setSelectedJargon(term);
      setJargonOpen(true);
    }
  };

  return (
    <>
      <Navbar />
      <Sidebar />

      <main className="lg:ml-64 pt-16 min-h-screen">
        <div className="sticky top-16 z-30 bg-cream border-b border-outline/20 card-shadow">
          <div className="max-w-[1200px] mx-auto px-4 py-3 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-ink-light mr-1">
                Tenure:
              </span>
              {tenorOptions.map((option) => (
                <button
                  key={option.months}
                  onClick={() => setSelectedTenor(option.months)}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                    selectedTenor === option.months
                      ? "bg-saffron text-white"
                      : "bg-white border border-outline/30 text-ink-light hover:border-saffron"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="flex gap-3 items-center">
              <div className="flex items-center bg-white border border-outline/30 rounded-lg px-3 h-9">
                <span className="text-ink-muted text-sm mr-1">Rs</span>
                <input
                  type="text"
                  value={Number(amountInput || 0).toLocaleString("en-IN")}
                  onChange={(event) =>
                    setAmountInput(event.target.value.replace(/[^0-9]/g, ""))
                  }
                  className="w-28 bg-transparent text-sm font-mono outline-none"
                  id="filter-amount"
                />
              </div>

              <select
                value={bankType}
                onChange={(event) => setBankType(event.target.value as BankTypeFilter)}
                className="bg-white border border-outline/30 rounded-lg px-3 h-9 text-sm text-ink-light outline-none"
                id="filter-bank-type"
              >
                {bankTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="max-w-[1200px] mx-auto px-4 pt-8 pb-4">
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-ink">
            Compare FD Rates
          </h1>
          <p className="text-ink-light mt-1">
            Live results use the same backend filters as the advisor.{" "}
            <button
              onClick={() => openJargon("compound-interest")}
              className="text-saffron underline decoration-dotted underline-offset-2 hover:text-saffron-dark cursor-pointer"
            >
              Explain compound interest
            </button>
          </p>
        </div>

        <div className="max-w-[1200px] mx-auto px-4 pb-24">
          {loading && (
            <div className="rounded-2xl border border-outline/20 bg-white px-6 py-10 text-center text-ink-light">
              Loading the latest available FD options...
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && rates.length === 0 && (
            <div className="rounded-2xl border border-outline/20 bg-white px-6 py-10 text-center text-ink-light">
              No FD matched this amount and tenure. Try a different amount, bank type, or tenor.
            </div>
          )}

          {!loading && !error && rates.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {rates.map((rate, index) => {
                const maturity = calculateMaturity({
                  principal: amount,
                  ratePercent: rate.regularRate,
                  tenorMonths: selectedTenor,
                  compounding: rate.compounding,
                });

                return (
                  <div
                    key={rate.id}
                    className={`bg-white rounded-xl card-shadow border hover:card-shadow-lg transition-all animate-fade-in ${
                      index === 0 ? "border-saffron/40" : "border-outline/10"
                    }`}
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    {index === 0 && (
                      <div className="bg-forest text-white text-xs font-bold px-4 py-1.5 rounded-t-xl text-center">
                        Highest return for this filter
                      </div>
                    )}
                    {rate.badge && index !== 0 && badgeLabels[rate.badge] && (
                      <div className="flex justify-end px-4 pt-3">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${badgeLabels[rate.badge].color}`}
                        >
                          {badgeLabels[rate.badge].text}
                        </span>
                      </div>
                    )}

                    <div className="p-5">
                      <div className="flex items-start gap-3 mb-4">
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-white text-sm shrink-0"
                          style={{ backgroundColor: rate.color }}
                        >
                          {rate.bankCode.slice(0, 3)}
                        </div>
                        <div>
                          <h3 className="font-heading text-base font-semibold text-ink">
                            {rate.bankName}
                          </h3>
                          <p className="text-xs text-ink-muted uppercase">
                            {rate.bankNameHi}
                          </p>
                        </div>
                      </div>

                      <p className="font-mono text-[36px] font-semibold text-saffron leading-none mb-1">
                        {rate.regularRate.toFixed(2)}%
                      </p>
                      <p className="text-sm text-ink-muted">per year</p>

                      <div className="mt-3 bg-saffron-bg/40 rounded-lg px-3 py-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-saffron text-lg">
                          trending_up
                        </span>
                        <p className="text-sm text-saffron-dark font-medium">
                          {formatCurrency(amount)} to {formatCurrency(maturity.maturityAmount)}
                        </p>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-4 pt-3 border-t border-cream-dark text-sm text-ink-muted">
                        <div>
                          <p className="text-xs">Min Amount</p>
                          <p className="font-mono font-medium text-ink">
                            {formatCurrency(rate.minAmount)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs">Tenure Range</p>
                          <p className="font-mono font-medium text-ink">
                            {rate.tenorLabel}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs">Bank Type</p>
                          <p className="font-medium text-ink capitalize">
                            {rate.bankType.replace("-", " ")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs">Insurance</p>
                          <p className="font-medium text-forest">
                            {rate.dicgcInsured ? "DICGC Covered" : "Check Bank"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex gap-3">
                        <button
                          onClick={() => openJargon("pa")}
                          className="flex-1 h-10 border border-saffron text-saffron rounded-lg font-semibold text-sm hover:bg-saffron-bg transition-colors"
                        >
                          Learn More
                        </button>
                        <Link
                          href={`/book?bank=${encodeURIComponent(rate.id)}&amount=${amount}&tenorMonths=${selectedTenor}`}
                          className="flex-1 h-10 bg-saffron text-white rounded-lg font-semibold text-sm flex items-center justify-center hover:opacity-90 transition-opacity"
                        >
                          Book Now
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
      <BottomNav />

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
