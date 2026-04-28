"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, ExternalLink, Star } from "lucide-react";

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
      eyebrow="Comparison workspace"
      title="Compare banks and companies side by side"
      description="Use one place for bank selection, maturity estimation, shortlist building, and then hand off the shortlist to the text bot or voice bot."
      actions={
        <>
          <Link href={ROUTES.CHAT}>
            <Button size="lg" variant="secondary">
              Ask text bot
            </Button>
          </Link>
          <Link href={ROUTES.VOICE}>
            <Button size="lg" variant="outline">
              Open voice bot
            </Button>
          </Link>
        </>
      }
    >
      <AuthGate
        title="Sign in to compare FD options"
        body="Comparison sits inside the protected product so users can keep the same shortlist across chat and voice."
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="grid gap-6">
            <Card className="p-6 shadow-soft">
              <CardHeader>
                <Badge variant="accent" className="w-fit">
                  Filters
                </Badge>
                <CardTitle>Shape the comparison</CardTitle>
                <CardDescription>
                  Change amount, tenure, senior status, and bank category before
                  building a shortlist.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    Amount
                  </span>
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    value={amount}
                    onChange={(event) => {
                      setLoading(true);
                      setAmount(Number(event.target.value) || 1000);
                    }}
                    className="min-h-12 rounded-[18px] border border-outline bg-app/72 px-4 text-sm text-text-strong outline-none"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    Tenure
                  </span>
                  <select
                    value={tenorMonths}
                    onChange={(event) => {
                      setLoading(true);
                      setTenorMonths(Number(event.target.value));
                    }}
                    className="min-h-12 rounded-[18px] border border-outline bg-app/72 px-4 text-sm text-text-strong outline-none"
                  >
                    {TENOR_OPTIONS.map((value) => (
                      <option key={value} value={value}>
                        {value} months
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    Bank type
                  </span>
                  <select
                    value={bankType}
                    onChange={(event) => {
                      setLoading(true);
                      setBankType(event.target.value as BankTypeFilter);
                    }}
                    className="min-h-12 rounded-[18px] border border-outline bg-app/72 px-4 text-sm text-text-strong outline-none"
                  >
                    <option value="all">All</option>
                    <option value="public">Public bank</option>
                    <option value="private">Private bank</option>
                    <option value="small-finance">Small finance bank</option>
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    Senior citizen
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setLoading(true);
                      setSeniorCitizen((current) => !current);
                    }}
                    className="flex min-h-12 items-center justify-between rounded-[18px] border border-outline bg-app/72 px-4 text-sm font-semibold text-text-strong"
                  >
                    <span>{seniorCitizen ? "Included" : "Regular rate"}</span>
                    <span
                      className={`h-6 w-11 rounded-full p-1 transition ${
                        seniorCitizen ? "bg-[#111113]" : "bg-[#d9d5cc]"
                      }`}
                    >
                      <span
                        className={`block h-4 w-4 rounded-full bg-white transition ${
                          seniorCitizen ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </span>
                  </button>
                </label>
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              {loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <Card key={index} className="p-6 shadow-soft">
                    <div className="h-52 animate-pulse rounded-[22px] bg-app/90" />
                  </Card>
                ))
              ) : rates.length > 0 ? (
                rates.map((rate, index) => {
                  const appliedRate = getDisplayRate(rate, seniorCitizen);
                  const maturity = calculateMaturity({
                    principal: amount,
                    ratePercent: appliedRate,
                    tenorMonths,
                    compounding: rate.compounding,
                  });
                  const shortlisted = shortlist.includes(rate.id);

                  return (
                    <Card key={rate.id} className="p-6 shadow-soft">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <CardTitle>{rate.bankName}</CardTitle>
                              {index === 0 ? <Badge variant="success">Top match</Badge> : null}
                            </div>
                            <CardDescription className="mt-2">
                              {rate.bankType.replace("-", " ")} bank
                            </CardDescription>
                          </div>
                          {rate.badge ? <Badge variant="outline">{rate.badge}</Badge> : null}
                        </div>
                      </CardHeader>
                      <CardContent className="grid gap-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-[20px] border border-outline bg-app/72 p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-text-muted">
                              Rate
                            </p>
                            <p className="mt-2 text-3xl font-semibold text-text-strong">
                              {appliedRate.toFixed(2)}%
                            </p>
                          </div>
                          <div className="rounded-[20px] border border-outline bg-app/72 p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-text-muted">
                              Estimated maturity
                            </p>
                            <p className="mt-2 text-xl font-semibold text-text-strong">
                              {formatCurrency(maturity.maturityAmount)}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-[20px] border border-outline bg-app/72 p-4 text-sm leading-7 text-text-muted">
                          <p>
                            Tenure band: {rate.tenorLabel}
                          </p>
                          <p>
                            Deposit range: {formatCurrency(rate.minAmount)} to{" "}
                            {formatCurrency(rate.maxAmount)}
                          </p>
                          <p>
                            DICGC cover: {rate.dicgcInsured ? "Available up to Rs 5 lakh per bank" : "Check bank terms"}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <Button
                            variant={shortlisted ? "secondary" : "outline"}
                            onClick={() => toggleShortlist(rate.id)}
                          >
                            <Star className="h-4 w-4" />
                            {shortlisted ? "Shortlisted" : "Add to shortlist"}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() =>
                              window.open(rate.officialUrl, "_blank", "noopener,noreferrer")
                            }
                          >
                            <ExternalLink className="h-4 w-4" />
                            Official page
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <Card className="p-6 shadow-soft lg:col-span-2">
                  <CardHeader>
                    <Badge variant="outline" className="w-fit">
                      No match
                    </Badge>
                    <CardTitle>No FD matched those filters</CardTitle>
                    <CardDescription>
                      Try another amount, a longer tenure, or switch back to all bank types.
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}
            </div>
          </div>

          <div className="grid gap-4">
            <Card className="p-6 shadow-soft">
              <CardHeader>
                <Badge variant="success" className="w-fit">
                  Shortlist
                </Badge>
                <CardTitle>Carry this into chat or voice</CardTitle>
                <CardDescription>
                  The shortlist is the shared comparison context for both bots.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
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
                        className="rounded-[20px] border border-outline bg-app/72 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-text-strong">
                              {rate.bankName}
                            </p>
                            <p className="mt-1 text-sm text-text-muted">
                              {getDisplayRate(rate, seniorCitizen).toFixed(2)}% for {tenorMonths} months
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleShortlist(rate.id)}
                            className="text-sm font-semibold text-text-muted"
                          >
                            Remove
                          </button>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-text-muted">
                          Estimated maturity: {formatCurrency(maturity.maturityAmount)}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-[20px] border border-dashed border-outline bg-app/72 p-5 text-sm leading-6 text-text-muted">
                    Add one or more banks to the shortlist, then open chat or
                    voice for a guided recommendation.
                  </div>
                )}

                <div className="mt-2 flex flex-wrap gap-3">
                  <Link href={ROUTES.CHAT}>
                    <Button variant="secondary">
                      Ask text bot
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href={ROUTES.VOICE}>
                    <Button variant="outline">
                      Ask voice bot
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </AuthGate>
    </AppShell>
  );
}
