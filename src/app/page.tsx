"use client";

import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import { FD_RATES } from "@/lib/fd-data";

const topRates = FD_RATES.sort((a, b) => b.regularRate - a.regularRate).slice(0, 3);



const badgeLabels: Record<string, { text: string; color: string }> = {
  "best-value": { text: "Best Value", color: "bg-forest text-white" },
  popular: { text: "Popular", color: "bg-saffron text-white" },
  "safe-choice": { text: "Safe Choice", color: "bg-forest-light text-forest-dark" },
};

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main className="pt-16">
        {/* ============ HERO SECTION ============ */}
        <section className="max-w-[1200px] mx-auto px-6 py-12 md:py-24 flex flex-col md:flex-row items-center gap-12">
          <div className="w-full md:w-[55%] space-y-8">
            <div className="space-y-4 animate-fade-in">
              <h1 className="font-heading text-[40px] md:text-[60px] leading-tight text-ink font-bold">
                Keep your money safe,{" "}
                <span className="text-saffron">earn more</span>
              </h1>
              <p className="text-lg text-ink-light max-w-lg">
                Compare 15+ bank FD rates, guided in your language. Build your
                wealth with certainty and local trust.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4">
              <Link
                href="/compare"
                className="h-12 px-8 bg-saffron text-white font-bold rounded-lg flex items-center justify-center card-shadow hover:opacity-90 active:scale-95 transition-all"
                id="cta-compare"
              >
                Compare FDs
              </Link>
              <Link
                href="/voice"
                className="h-12 px-8 border-2 border-saffron text-saffron font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-saffron-bg transition-colors"
                id="cta-voice"
              >
                <span className="material-symbols-outlined text-xl">mic</span>
                Ask by Voice
              </Link>
            </div>

            {/* Trust Strip */}
            <div className="pt-6 flex flex-wrap gap-x-6 gap-y-3 items-center border-t border-outline/30">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-forest text-xl">
                  group
                </span>
                <span className="text-sm font-semibold text-ink-muted">
                  3 Lakh+ users
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-forest text-xl">
                  payments
                </span>
                <span className="text-sm font-semibold text-ink-muted">
                  Starts at ₹500
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-forest text-xl">
                  account_balance
                </span>
                <span className="text-sm font-semibold text-ink-muted">
                  15+ Banks
                </span>
              </div>
              <div className="flex items-center gap-2 bg-forest-bg px-3 py-1 rounded-full">
                <span className="material-symbols-outlined text-forest text-sm">
                  verified_user
                </span>
                <span className="text-xs font-bold text-forest">
                  DICGC Insured
                </span>
              </div>
            </div>
          </div>

          {/* Hero Illustration */}
          <div className="w-full md:w-[45%] flex justify-center">
            <div className="relative w-full aspect-square max-w-md">
              <div className="absolute inset-0 bg-saffron-bg hero-mask opacity-40 animate-float"></div>
              <div className="absolute inset-4 overflow-hidden hero-mask card-shadow-lg bg-white">
                <Image
                  src="/hero-illustration.png"
                  alt="Indian family discussing investments on tablet"
                  width={500}
                  height={500}
                  className="w-full h-full object-cover"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        {/* ============ LIVE RATES SECTION ============ */}
        <section className="bg-surface py-16 md:py-20 px-6" id="live-rates">
          <div className="max-w-[1200px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
              <div>
                <h2 className="font-heading text-2xl md:text-3xl font-semibold text-ink">
                  Today&apos;s Highest Interest Rates
                </h2>
                <p className="text-ink-light mt-1">
                  Live FD rates from top-rated banks updated daily.
                </p>
              </div>
              <Link
                href="/compare"
                className="text-saffron font-bold flex items-center gap-1 hover:underline"
              >
                View All Rates
                <span className="material-symbols-outlined">chevron_right</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {topRates.map((rate, i) => {
                const borderColor =
                  i === 0
                    ? "border-saffron"
                    : i === 1
                    ? "border-forest"
                    : "border-gold";
                const rateColor =
                  i === 0
                    ? "text-saffron"
                    : i === 1
                    ? "text-forest"
                    : "text-gold";
                return (
                  <div
                    key={rate.id}
                    className={`bg-white p-6 rounded-xl card-shadow border-t-4 ${borderColor} hover:card-shadow-lg transition-shadow animate-fade-in`}
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <div className="flex justify-between items-start mb-5">
                      <div className="w-12 h-12 bg-cream-dark rounded-lg flex items-center justify-center font-bold text-ink-muted text-sm">
                        {rate.bankCode}
                      </div>
                      {rate.badge && badgeLabels[rate.badge] && (
                        <span
                          className={`text-xs px-3 py-1 rounded-full font-bold ${badgeLabels[rate.badge].color}`}
                        >
                          {badgeLabels[rate.badge].text}
                        </span>
                      )}
                    </div>
                    <p className="text-ink-muted text-sm font-semibold mb-1">
                      Max Interest
                    </p>
                    <p className={`font-mono text-[32px] font-semibold ${rateColor} mb-4`}>
                      {rate.regularRate.toFixed(2)}%{" "}
                      <span className="text-sm text-ink-muted font-normal">
                        p.a.
                      </span>
                    </p>
                    <div className="flex justify-between border-t border-cream-dark pt-3 text-sm text-ink-muted">
                      <span>Tenure: {rate.tenorLabel}</span>
                      <span className="font-bold">DICGC Insured</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ============ FEATURES BENTO GRID ============ */}
        <section className="py-16 md:py-24 px-6 max-w-[1200px] mx-auto">
          <h2 className="font-heading text-2xl md:text-3xl text-center mb-12 font-semibold">
            Why choose Nivesh Saathi?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-5 md:h-[520px]">
            {/* Voice — Large Card */}
            <div className="md:col-span-2 md:row-span-2 bg-saffron-bg/50 p-8 rounded-xl flex flex-col justify-between border border-saffron/20 hover:border-saffron/40 transition-colors">
              <div className="w-16 h-16 bg-saffron rounded-full flex items-center justify-center text-white mb-6">
                <span className="material-symbols-outlined text-4xl">
                  mic_none
                </span>
              </div>
              <div>
                <h3 className="font-heading text-xl font-semibold mb-2 text-saffron">
                  Invest by speaking your language
                </h3>
                <p className="text-ink-light">
                  Just ask &quot;Best FD for 1 year?&quot; and we&apos;ll guide
                  you in Hindi, Tamil, or 5 other languages.
                </p>
              </div>
            </div>

            {/* Compare */}
            <div className="md:col-span-2 bg-forest-bg/50 p-6 rounded-xl border border-forest/20 flex gap-5 items-center hover:border-forest/40 transition-colors">
              <div className="w-12 h-12 bg-forest rounded-full flex items-center justify-center text-white shrink-0">
                <span className="material-symbols-outlined">
                  compare_arrows
                </span>
              </div>
              <div>
                <h3 className="font-heading text-lg font-semibold text-forest mb-1">
                  Accurate Comparison
                </h3>
                <p className="text-sm text-ink-light">
                  No hidden charges. Compare real returns after tax.
                </p>
              </div>
            </div>

            {/* Guided */}
            <div className="bg-cream-dark/40 p-6 rounded-xl border border-outline/20 hover:border-outline/40 transition-colors">
              <div className="w-10 h-10 bg-ink-light/10 rounded-full flex items-center justify-center text-ink-light mb-4">
                <span className="material-symbols-outlined">verified</span>
              </div>
              <h3 className="text-sm font-bold mb-2">Guided Booking</h3>
              <p className="text-xs text-ink-light">
                Step-by-step help for first-time investors.
              </p>
            </div>

            {/* Safe */}
            <div className="bg-cream-dark/40 p-6 rounded-xl border border-outline/20 hover:border-outline/40 transition-colors">
              <div className="w-10 h-10 bg-ink-light/10 rounded-full flex items-center justify-center text-ink-light mb-4">
                <span className="material-symbols-outlined">shield</span>
              </div>
              <h3 className="text-sm font-bold mb-2">Safe &amp; Insured</h3>
              <p className="text-xs text-ink-light">
                Your money stays in the bank, always.
              </p>
            </div>
          </div>
        </section>

        {/* ============ FD EXPLAINER STRIP ============ */}
        <section className="bg-ink text-white py-16 md:py-24 px-6 overflow-hidden relative">
          <div className="absolute right-[-10%] top-0 w-1/2 h-full opacity-5 pointer-events-none flex items-center">
            <span className="material-symbols-outlined text-[400px]">
              account_balance
            </span>
          </div>
          <div className="max-w-[800px] mx-auto text-center space-y-6 relative z-10">
            <h2 className="font-heading text-2xl md:text-3xl font-semibold">
              What is an FD?
            </h2>
            <p className="text-lg text-outline">
              A Fixed Deposit (FD) is a secure way to keep your money in a bank
              for a fixed period. In return, the bank gives you much higher
              interest than a savings account. It is risk-free and your money is
              insured up to ₹5 Lakhs by DICGC.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
              <div className="space-y-2">
                <p className="font-mono text-lg text-saffron-light font-semibold">
                  Guaranteed Returns
                </p>
                <p className="text-sm text-ink-muted">
                  Away from market fluctuations
                </p>
              </div>
              <div className="space-y-2">
                <p className="font-mono text-lg text-saffron-light font-semibold">
                  Withdraw Anytime
                </p>
                <p className="text-sm text-ink-muted">
                  Withdrawal possible when needed
                </p>
              </div>
              <div className="space-y-2">
                <p className="font-mono text-lg text-saffron-light font-semibold">
                  Loan Facility
                </p>
                <p className="text-sm text-ink-muted">
                  Get an instant loan against your FD
                </p>
              </div>
            </div>
          </div>
        </section>


      </main>

      <Footer />
      <BottomNav />
    </>
  );
}
