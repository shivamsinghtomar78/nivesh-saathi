"use client";

import { useEffect, useMemo, useState } from "react";

import BottomNav from "@/components/layout/BottomNav";
import Navbar from "@/components/layout/Navbar";
import { type FDRate } from "@/lib/fd-data";
import { calculateMaturity } from "@/lib/maturity";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { useBookingStore } from "@/stores/bookingStore";

const steps = [
  { num: 1, label: "Amount" },
  { num: 2, label: "Tenor" },
  { num: 3, label: "KYC" },
  { num: 4, label: "Confirm" },
];

const tenorPresets = [
  { label: "6 Months", months: 6 },
  { label: "1 Year", months: 12 },
  { label: "2 Years", months: 24 },
  { label: "3 Years", months: 36 },
  { label: "5 Years", months: 60 },
];

const keypadKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "del"];

type BookingIntentResponse = {
  id: string;
  redirectUrl: string;
};

function readInitialSearchParam(key: string) {
  if (typeof window === "undefined") {
    return null;
  }

  return new URLSearchParams(window.location.search).get(key);
}

export default function BookingWizardPage() {
  const currentStep = useBookingStore((state) => state.currentStep);
  const amountValue = useBookingStore((state) => state.amount);
  const tenorMonths = useBookingStore((state) => state.tenorMonths);
  const reset = useBookingStore((state) => state.reset);
  const setSelectedBankId = useBookingStore((state) => state.setBank);
  const setAmount = useBookingStore((state) => state.setAmount);
  const setTenor = useBookingStore((state) => state.setTenor);
  const setStep = useBookingStore((state) => state.setStep);
  const setKycStatus = useBookingStore((state) => state.setKycStatus);
  const appendDigit = useBookingStore((state) => state.appendDigit);
  const deleteDigit = useBookingStore((state) => state.deleteDigit);
  const [kycAnswer, setKycAnswer] = useState<"yes" | "no" | null>(null);
  const [bank, setBankData] = useState<FDRate | null>(null);
  const [bankLoading, setBankLoading] = useState(true);
  const [bankError, setBankError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bankId] = useState<string | null>(() => readInitialSearchParam("bank"));
  const [amountParam] = useState<string | null>(() => readInitialSearchParam("amount"));
  const [tenorParam] = useState<string | null>(() =>
    readInitialSearchParam("tenorMonths")
  );

  useEffect(() => {
    reset();
    if (bankId) {
      setSelectedBankId(bankId);
    }
    if (amountParam) {
      setAmount(amountParam);
    }
    if (tenorParam) {
      const parsedTenor = Number(tenorParam);
      if (Number.isFinite(parsedTenor) && parsedTenor > 0) {
        setTenor(parsedTenor);
      }
    }
  }, [amountParam, bankId, reset, setAmount, setSelectedBankId, setTenor, tenorParam]);

  useEffect(() => {
    let active = true;

    const loadBank = async () => {
      if (!bankId) {
        setBankData(null);
        setBankError("Pick a bank from Compare or Chat before starting booking.");
        setBankLoading(false);
        return;
      }

      setBankLoading(true);
      setBankError(null);

      try {
        const response = await fetch(
          `/api/fd-rates?bankId=${encodeURIComponent(bankId)}&limit=1`
        );
        const payload = (await response.json()) as
          | { rates?: FDRate[]; error?: string }
          | undefined;

        if (!response.ok) {
          throw new Error(payload?.error || "Unable to load bank details");
        }

        const selectedBank = payload?.rates?.[0] ?? null;
        if (!selectedBank) {
          throw new Error("This bank is not available in the current FD catalog.");
        }

        if (active) {
          setBankData(selectedBank);
        }
      } catch (error) {
        if (active) {
          setBankData(null);
          setBankError(
            error instanceof Error ? error.message : "Unable to load bank details"
          );
        }
      } finally {
        if (active) {
          setBankLoading(false);
        }
      }
    };

    void loadBank();

    return () => {
      active = false;
    };
  }, [bankId]);

  useEffect(() => {
    if (kycAnswer === "yes") {
      setKycStatus("verified");
      return;
    }

    if (kycAnswer === "no") {
      setKycStatus("pending");
      return;
    }

    setKycStatus("none");
  }, [kycAnswer, setKycStatus]);

  const amount = Number(amountValue || 0);
  const interestRate = bank?.regularRate ?? 0;
  const maturity = useMemo(
    () =>
      calculateMaturity({
        principal: amount,
        ratePercent: interestRate,
        tenorMonths,
        compounding: bank?.compounding ?? "quarterly",
      }),
    [amount, bank?.compounding, interestRate, tenorMonths]
  );

  const amountError =
    bank && amount < bank.minAmount
      ? `Minimum booking amount for ${bank.bankName} is ${formatCurrency(bank.minAmount)}.`
      : bank && amount > bank.maxAmount
        ? `Maximum booking amount for ${bank.bankName} is ${formatCurrency(bank.maxAmount)}.`
        : null;

  const handleKeypad = (key: string) => {
    if (key === "del") {
      deleteDigit();
      return;
    }

    appendDigit(key);
  };

  const nextStep = () => {
    if (currentStep === 1 && amountError) {
      return;
    }

    if (currentStep === 3 && !kycAnswer) {
      return;
    }

    if (currentStep < 4) {
      setStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setStep(currentStep - 1);
    }
  };

  const confirmBooking = async () => {
    if (!bank || redirecting) {
      return;
    }

    setRedirecting(true);
    setBookingError(null);

    try {
      const response = await fetch("/api/booking-intents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bankId: bank.id,
          amount,
          tenorMonths,
          language: "hi",
          status: kycAnswer === "yes" ? "redirected" : "kyc_pending",
        }),
      });
      const payload = (await response.json()) as
        | BookingIntentResponse
        | { error?: string };

      if (!response.ok || !("redirectUrl" in payload)) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "Unable to create booking intent"
        );
      }

      window.location.assign(payload.redirectUrl);
    } catch (error) {
      setBookingError(
        error instanceof Error ? error.message : "Unable to continue to the bank site"
      );
      setRedirecting(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="flex-grow pt-20 pb-24 px-4 flex flex-col items-center min-h-screen bg-cream">
        <div className="w-full max-w-[560px] bg-white rounded-xl card-shadow-lg p-5 md:p-7 flex flex-col gap-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest">
              Guided FD Booking
            </p>
            <h1 className="font-heading text-2xl text-ink">
              {bankLoading
                ? "Loading bank details..."
                : bank
                  ? bank.bankName
                  : "Select a bank to continue"}
            </h1>
            {bank && (
              <p className="text-sm text-ink-light">
                Official handoff only. Current seeded rate: {bank.regularRate.toFixed(2)}% per year.
              </p>
            )}
            {bankError && <p className="text-sm text-red-700">{bankError}</p>}
          </div>

          <div className="relative flex justify-between items-center px-2">
            <div className="absolute top-1/2 left-0 w-full h-[2px] bg-cream-dark -translate-y-4 z-0" />
            <div
              className="absolute top-1/2 left-0 h-[2px] bg-saffron -translate-y-4 z-0 transition-all duration-500"
              style={{
                width: `${((currentStep - 1) / 3) * 100}%`,
              }}
            />
            {steps.map((step) => (
              <div
                key={step.num}
                className="relative z-10 flex flex-col items-center gap-1"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold font-mono text-sm transition-all ${
                    step.num <= currentStep
                      ? "bg-saffron text-white"
                      : "bg-cream-dark text-ink-muted"
                  }`}
                >
                  {step.num < currentStep ? (
                    <span className="material-symbols-outlined text-lg">check</span>
                  ) : (
                    step.num
                  )}
                </div>
                <span
                  className={`text-xs font-semibold ${
                    step.num <= currentStep
                      ? "text-saffron"
                      : "text-ink-muted opacity-60"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          {currentStep === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div className="text-center">
                <h2 className="font-heading text-xl font-semibold text-saffron">
                  Choose Investment Amount
                </h2>
                <p className="text-sm text-ink-light mt-1">
                  Keep it within the bank&apos;s min and max limits.
                </p>
              </div>

              <div className="bg-surface rounded-lg p-5 text-center border border-outline/20">
                <span className="text-xs font-semibold text-ink-muted uppercase tracking-widest block mb-1">
                  Total Investment
                </span>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="font-heading text-2xl text-ink">Rs</span>
                  <span className="font-mono text-4xl font-bold text-ink tracking-tight">
                    {formatNumber(amount)}
                  </span>
                </div>

                <div className="mt-4 pt-4 border-t border-outline/10 grid grid-cols-2 gap-4">
                  <div className="text-left">
                    <p className="text-xs font-semibold text-ink-muted">
                      Maturity Value
                    </p>
                    <p className="font-mono text-lg font-bold text-forest">
                      {formatCurrency(maturity.maturityAmount)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-ink-muted">
                      Interest Rate
                    </p>
                    <p className="font-mono text-lg font-bold text-saffron">
                      {interestRate.toFixed(2)}% p.a.
                    </p>
                  </div>
                  {bank && (
                    <>
                      <div className="text-left">
                        <p className="text-xs font-semibold text-ink-muted">Minimum</p>
                        <p className="font-mono text-sm font-medium text-ink">
                          {formatCurrency(bank.minAmount)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-ink-muted">Maximum</p>
                        <p className="font-mono text-sm font-medium text-ink">
                          {formatCurrency(bank.maxAmount)}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {amountError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {amountError}
                </p>
              )}

              <div className="grid grid-cols-3 gap-3">
                {keypadKeys.map((key) => (
                  <button
                    key={key}
                    onClick={() => handleKeypad(key)}
                    className={`h-14 flex items-center justify-center rounded-lg font-mono text-lg font-medium transition-colors shadow-sm ${
                      key === "del"
                        ? "bg-saffron text-white"
                        : "bg-white border border-outline/20 text-ink hover:bg-cream-dark"
                    }`}
                  >
                    {key === "del" ? (
                      <span className="material-symbols-outlined">backspace</span>
                    ) : (
                      key
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div className="text-center">
                <h2 className="font-heading text-xl font-semibold text-saffron">
                  Choose Tenure
                </h2>
                <p className="text-sm text-ink-light mt-1">
                  Pick the time period that fits your savings goal.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {tenorPresets.map((preset) => {
                  const outsideBankRange =
                    bank &&
                    (preset.months < bank.tenorMinMonths ||
                      preset.months > bank.tenorMaxMonths);

                  return (
                    <button
                      key={preset.months}
                      onClick={() => setTenor(preset.months)}
                      disabled={Boolean(outsideBankRange)}
                      className={`p-4 rounded-xl border-2 text-center transition-all ${
                        tenorMonths === preset.months
                          ? "border-saffron bg-saffron-bg text-saffron font-bold"
                          : "border-outline/20 text-ink-light hover:border-saffron/50"
                      } ${outsideBankRange ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                      <span className="text-lg font-semibold block">{preset.label}</span>
                      <span className="text-xs text-ink-muted">
                        {preset.months} months
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="bg-forest-bg/50 rounded-xl p-5 text-center border border-forest/20">
                <p className="text-sm text-forest-dark font-semibold mb-2">Your returns</p>
                <p className="font-mono text-3xl font-bold text-forest">
                  {formatCurrency(maturity.maturityAmount)}
                </p>
                <p className="text-sm text-forest-dark mt-1">
                  Interest earned:{" "}
                  <span className="font-bold">{formatCurrency(maturity.interestEarned)}</span>
                </p>
                <p className="text-xs text-ink-muted mt-2">
                  Maturity Date:{" "}
                  {maturity.maturityDate.toLocaleDateString("en-IN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-5 animate-fade-in">
              <div className="text-center">
                <h2 className="font-heading text-xl font-semibold text-saffron">
                  KYC Verification
                </h2>
                <p className="text-sm text-ink-light mt-1">
                  Is your Aadhaar and PAN already linked with your bank account?
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setKycAnswer("yes")}
                  className={`p-6 rounded-xl border-2 text-center transition-all ${
                    kycAnswer === "yes"
                      ? "border-forest bg-forest-bg text-forest"
                      : "border-outline/20 hover:border-forest/50"
                  }`}
                >
                  <span className="material-symbols-outlined text-4xl mb-2 block">
                    check_circle
                  </span>
                  <span className="font-bold text-lg">Yes</span>
                  <span className="text-xs block mt-1 text-ink-muted">KYC Complete</span>
                </button>
                <button
                  onClick={() => setKycAnswer("no")}
                  className={`p-6 rounded-xl border-2 text-center transition-all ${
                    kycAnswer === "no"
                      ? "border-saffron bg-saffron-bg text-saffron"
                      : "border-outline/20 hover:border-saffron/50"
                  }`}
                >
                  <span className="material-symbols-outlined text-4xl mb-2 block">
                    help
                  </span>
                  <span className="font-bold text-lg">No</span>
                  <span className="text-xs block mt-1 text-ink-muted">Need KYC</span>
                </button>
              </div>

              {kycAnswer === "yes" && (
                <div className="bg-forest-bg/50 rounded-xl p-5 border border-forest/20 animate-fade-in">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="material-symbols-outlined text-forest text-2xl">
                      celebration
                    </span>
                    <p className="font-bold text-forest">Great, you are ready to continue.</p>
                  </div>
                  <p className="text-sm text-ink-light">
                    We will create a booking intent and send you to the bank&apos;s official FD page.
                  </p>
                </div>
              )}

              {kycAnswer === "no" && (
                <div className="bg-saffron-bg/50 rounded-xl p-5 border border-saffron/20 animate-fade-in space-y-3">
                  <p className="font-bold text-saffron">Complete these KYC steps first:</p>
                  <ol className="text-sm text-ink-light space-y-2 list-decimal list-inside">
                    <li>Keep your PAN card and Aadhaar card ready.</li>
                    <li>Visit the nearest branch or start the bank&apos;s online KYC flow.</li>
                    <li>Tell the staff you want to open a new FD.</li>
                    <li>Verify your identity and submit the needed form.</li>
                    <li>Return here or continue on the official bank page below.</li>
                  </ol>
                </div>
              )}
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-5 animate-fade-in">
              <div className="text-center">
                <span className="material-symbols-outlined text-forest text-5xl mb-2 block">
                  verified
                </span>
                <h2 className="font-heading text-xl font-semibold text-forest">
                  Booking Summary
                </h2>
                <p className="text-sm text-ink-light mt-1">
                  Review before continuing to the official bank website.
                </p>
              </div>

              <div className="bg-surface rounded-xl p-5 border border-outline/20 space-y-4">
                <div className="flex justify-between py-2 border-b border-outline/10">
                  <span className="text-ink-light text-sm">Bank</span>
                  <span className="font-semibold text-ink">{bank?.bankName ?? "Not selected"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-outline/10">
                  <span className="text-ink-light text-sm">Investment</span>
                  <span className="font-mono font-bold text-ink">{formatCurrency(amount)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-outline/10">
                  <span className="text-ink-light text-sm">Tenure</span>
                  <span className="font-mono font-bold text-ink">
                    {tenorMonths >= 12
                      ? `${tenorMonths / 12} Year${tenorMonths > 12 ? "s" : ""}`
                      : `${tenorMonths} Months`}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-outline/10">
                  <span className="text-ink-light text-sm">Interest Rate</span>
                  <span className="font-mono font-bold text-saffron">
                    {interestRate.toFixed(2)}% p.a.
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-outline/10">
                  <span className="text-ink-light text-sm">Interest Earned</span>
                  <span className="font-mono font-bold text-forest">
                    {formatCurrency(maturity.interestEarned)}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-ink font-bold text-sm">Maturity Amount</span>
                  <span className="font-mono font-bold text-forest text-lg">
                    {formatCurrency(maturity.maturityAmount)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-forest-bg rounded-lg px-4 py-2.5">
                <span
                  className="material-symbols-outlined text-forest"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  verified_user
                </span>
                <span className="text-sm text-forest-dark font-medium">
                  DICGC cover applies up to Rs 5 lakh per bank.
                </span>
              </div>

              {bookingError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {bookingError}
                </p>
              )}

              <button
                onClick={() => void confirmBooking()}
                disabled={!bank || redirecting}
                className="w-full h-14 bg-forest text-white font-bold rounded-lg shadow-lg hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-lg disabled:opacity-60"
              >
                <span className="material-symbols-outlined">open_in_new</span>
                {redirecting ? "Opening bank site..." : "Continue to Bank Website"}
              </button>
            </div>
          )}

          <div className="flex gap-3">
            {currentStep > 1 && (
              <button
                onClick={prevStep}
                className="flex-1 h-12 border-2 border-outline/30 text-ink-light font-semibold rounded-lg hover:bg-cream-dark transition-colors"
              >
                Back
              </button>
            )}
            {currentStep < 4 && (
              <button
                onClick={nextStep}
                disabled={
                  bankLoading ||
                  Boolean(bankError) ||
                  (currentStep === 1 && Boolean(amountError)) ||
                  (currentStep === 3 && !kycAnswer)
                }
                className="flex-1 h-12 bg-saffron text-white font-bold rounded-lg shadow-md hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {currentStep === 3 ? "Review & Confirm" : "Next Step"}
                <span className="material-symbols-outlined text-lg">chevron_right</span>
              </button>
            )}
          </div>
        </div>

        <div className="mt-8 flex items-center gap-3 opacity-60">
          <span
            className="material-symbols-outlined text-forest"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            verified_user
          </span>
          <span className="text-sm text-ink">
            RBI-regulated banks with official handoff links only
          </span>
        </div>
      </main>

      <button className="fixed bottom-20 lg:bottom-8 right-6 w-14 h-14 bg-forest text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform z-40">
        <span className="material-symbols-outlined">support_agent</span>
      </button>

      <BottomNav />
    </>
  );
}
