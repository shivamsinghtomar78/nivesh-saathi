import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  AudioLines,
  Banknote,
  Mic,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import Footer from "@/components/layout/Footer";
import { FD_RATES } from "@/lib/fd-data";
import { ROUTES } from "@/lib/routes";
import { formatCurrency } from "@/lib/utils";

const topRates = [...FD_RATES]
  .sort((left, right) => right.regularRate - left.regularRate)
  .slice(0, 3);

const trustPoints = [
  { icon: ShieldCheck, label: "Plain-language safety context" },
  { icon: Banknote, label: "Starts from Rs 500 style guidance" },
  { icon: AudioLines, label: "Voice-led, low-friction flow" },
];

const workflow = [
  {
    title: "Compare clearly",
    body: "Start with a filtered list of FD options instead of a generic chatbot answer.",
  },
  {
    title: "Shortlist with confidence",
    body: "Save the banks that look promising and keep them across refreshes or sign-ins.",
  },
  {
    title: "Ask Saathi what changed",
    body: "Use chat or voice to understand safety, maturity, and jargon in plain language.",
  },
];

export default function LandingPage() {
  return (
    <>
      <main className="pb-16">
        <section className="relative flex min-h-screen items-center overflow-hidden px-4 py-8 md:px-6 md:py-14">
          <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="mb-10 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-highlight text-black">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-text-strong">
                    Nivesh Saathi
                  </p>
                  <p className="text-xs uppercase tracking-[0.22em] text-text-muted">
                    Aapka bharosemand FD guide
                  </p>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-outline bg-panel px-4 py-2 text-xs uppercase tracking-[0.22em] text-highlight">
                <Sparkles className="h-4 w-4" />
                Voice-first FD advisor for Bharat
              </div>

              <h1 className="clamp-title mt-6 max-w-4xl font-heading font-semibold leading-[0.96] text-text-strong">
                Apna paisa samajhkar
                <span className="block text-highlight">FD choose kijiye.</span>
              </h1>

              <p className="clamp-section mt-5 max-w-2xl text-text-muted">
                Nivesh Saathi turns confusing FD tables into a guided flow:
                compare rates, save a shortlist, then ask in chat or by voice
                what actually matters for your amount, tenure, and safety needs.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={ROUTES.COMPARE}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-highlight px-6 py-3 text-sm font-semibold text-black transition hover:brightness-110"
                >
                  Compare FD rates
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={ROUTES.VOICE}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-outline bg-panel px-6 py-3 text-sm font-semibold text-text-strong transition hover:border-highlight hover:text-highlight"
                >
                  <Mic className="h-4 w-4" />
                  Ask by voice
                </Link>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {trustPoints.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-outline bg-panel px-4 py-4 shadow-soft"
                    >
                      <Icon className="h-5 w-5 text-highlight" />
                      <p className="mt-3 text-sm leading-6 text-text">{item.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="relative">
              <div className="relative rounded-[32px] border border-outline bg-panel p-4 shadow-soft">
                <div className="rounded-[28px] border border-outline bg-panel-strong p-3">
                  <Image
                    src="/hero-illustration.png"
                    alt="Family using a phone to compare safe fixed deposit choices"
                    width={880}
                    height={880}
                    priority
                    sizes="(max-width: 768px) 100vw, 42vw"
                    className="aspect-[4/4.2] w-full rounded-[22px] object-cover"
                  />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {topRates.map((rate) => (
                    <div
                      key={rate.id}
                      className="rounded-2xl border border-outline bg-app px-4 py-4"
                    >
                      <p className="text-xs uppercase tracking-[0.2em] text-text-muted">
                        {rate.bankCode}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-text-strong">
                        {rate.bankName}
                      </p>
                      <p className="mt-4 font-mono text-3xl font-semibold text-highlight">
                        {rate.regularRate.toFixed(2)}%
                      </p>
                      <p className="mt-2 text-xs text-text-muted">{rate.tenorLabel}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-8 md:px-6 md:py-14">
          <div className="mx-auto max-w-7xl rounded-[32px] border border-outline bg-panel p-6 shadow-soft md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-highlight">
                  Why this flow wins demos
                </p>
                <h2 className="mt-3 text-3xl font-semibold text-text-strong">
                  One decision path, not five disconnected screens
                </h2>
              </div>
              <Link
                href={ROUTES.LOGIN}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-outline bg-panel-strong px-5 py-3 text-sm font-semibold text-text-strong transition hover:border-highlight hover:text-highlight"
              >
                Sign in to sync shortlist
              </Link>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {workflow.map((step, index) => (
                <div
                  key={step.title}
                  className="rounded-[28px] border border-outline bg-panel-strong p-5"
                >
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-highlight text-sm font-semibold text-black">
                    0{index + 1}
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-text-strong">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-text-muted">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-8 md:px-6 md:py-10">
          <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[32px] border border-outline bg-panel p-6 shadow-soft">
              <p className="text-xs uppercase tracking-[0.24em] text-highlight">
                FD in plain words
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-text-strong">
                Fixed deposit means locked money, fixed return, low drama.
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-text-muted">
                You place a fixed amount with a bank for a chosen tenure. The
                bank gives a known interest rate, so your maturity amount is more
                predictable than market-linked products. Saathi explains terms
                like p.a., tenor, DICGC cover, and maturity in a way first-time
                savers can actually use.
              </p>
            </div>

            <div className="rounded-[32px] border border-outline bg-panel p-6 shadow-soft">
              <p className="text-xs uppercase tracking-[0.24em] text-highlight">
                Quick lens
              </p>
              <div className="mt-4 grid gap-3">
                {topRates.map((rate) => (
                  <div
                    key={`${rate.id}-summary`}
                    className="flex items-center justify-between rounded-2xl border border-outline bg-panel-strong px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-text-strong">
                        {rate.bankName}
                      </p>
                      <p className="mt-1 text-xs text-text-muted">{rate.tenorLabel}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-lg font-semibold text-highlight">
                        {rate.regularRate.toFixed(2)}%
                      </p>
                      <p className="text-xs text-text-muted">
                        {formatCurrency(100000)} demo amount
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
