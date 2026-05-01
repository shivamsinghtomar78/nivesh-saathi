"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Languages,
  LockKeyhole,
  MessageCircleMore,
  Mic,
  ShieldCheck,
  Star,
} from "lucide-react";

import PublicHeader from "@/components/landing/PublicHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.62, ease: [0.22, 1, 0.36, 1] } },
};

const trustItems = [
  { icon: ShieldCheck, label: "DICGC insured banks" },
  { icon: Languages, label: "Multilingual advisor" },
  { icon: MessageCircleMore, label: "AI-powered explanations" },
  { icon: LockKeyhole, label: "Secure shortlist" },
];

const productCards = [
  { label: "Senior Citizen", value: "9.10%", meta: "Top yield shortlist", tone: "green" },
  { label: "Tax Saver", value: "7.20%", meta: "5 year option", tone: "gold" },
  { label: "Safety", value: "DICGC", meta: "Insurance status", tone: "green" },
];

export default function LandingScreen() {
  return (
    <main className="dark-context min-h-screen overflow-hidden bg-app text-text">
      <PublicHeader />

      <section className="safe-grid relative border-b border-outline bg-[#0D0D1A]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(139,92,246,0.20),transparent_36%),radial-gradient(circle_at_72%_18%,rgba(0,102,255,0.16),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_42%)]" />
        <div className="relative mx-auto grid min-h-[92vh] max-w-7xl items-center gap-10 px-4 pb-16 pt-32 md:px-6 lg:grid-cols-[1fr_0.88fr] lg:px-8">
          <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.09 } } }}>
            <motion.div variants={fadeUp} className="mb-5 inline-flex items-center gap-2 rounded-full border border-outline bg-panel-glass px-3 py-2 text-xs font-semibold text-text">
              <span className="font-heading text-base text-accent">निवेश साथी</span>
              <span>Nivesh Saathi</span>
            </motion.div>

            <motion.h1 variants={fadeUp} className="clamp-title max-w-4xl font-semibold tracking-tight text-text-strong">
              Find India&apos;s Best Fixed Deposits in 30 Seconds
            </motion.h1>

            <motion.p variants={fadeUp} className="mt-5 max-w-2xl text-lg leading-8 text-text-muted md:text-xl">
              Compare banks, calculate maturity, and ask Saathi in your language by text or voice.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={ROUTES.LOGIN}>
                <Button size="lg" className="min-h-14 px-7">
                  Sign in securely
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href={ROUTES.COMPARE}>
                <Button size="lg" variant="outline" className="min-h-14 border-white/14 bg-white/8 px-7 text-text-strong hover:bg-white/12">
                  Compare rates
                </Button>
              </Link>
            </motion.div>

            <motion.div variants={fadeUp} className="mt-9 grid gap-3 sm:grid-cols-2">
              {trustItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.55 + index * 0.08, duration: 0.45 }}
                    className="flex items-center gap-3 rounded-[var(--radius-panel)] border border-outline bg-panel-glass px-4 py-3 backdrop-blur-xl"
                  >
                    <Icon className="h-4 w-4 text-accent" />
                    <span className="text-sm font-medium text-text">{item.label}</span>
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.24, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <div className="glass-panel relative mx-auto max-w-xl rounded-[var(--radius-card)] p-4 sm:p-5">
              <div className="rounded-[var(--radius-panel)] border border-outline bg-panel-strong p-4">
                <div className="flex items-start justify-between gap-3 border-b border-outline pb-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Market snapshot</p>
                    <h2 className="mt-2 text-xl font-semibold text-text-strong">FD comparison board</h2>
                  </div>
                  <Badge variant="accent" className="bg-highlight-soft text-highlight">Live rates</Badge>
                </div>

                <div className="mt-4 grid gap-3">
                  {productCards.map((card, index) => (
                    <motion.div
                      key={card.label}
                      animate={{ y: [0, index % 2 ? 7 : -7, 0] }}
                      transition={{ duration: 5 + index, repeat: Infinity, ease: "easeInOut" }}
                      className="rounded-[var(--radius-panel)] border border-outline bg-panel-glass p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">{card.label}</p>
                          <p className="mt-1 text-sm text-text">{card.meta}</p>
                        </div>
                        <p className={`financial-value text-3xl font-semibold ${card.tone === "gold" ? "text-highlight" : "text-accent"}`}>
                          {card.value}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                  {["Maturity", "Tenure", "Safety"].map((label) => (
                    <div key={label} className="rounded-[var(--radius-panel)] border border-outline bg-inner-panel p-3">
                      <p className="text-xs text-text-muted">{label}</p>
                      <p className="mt-1 text-sm font-semibold text-text-strong">Clear</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="bg-app py-16">
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { icon: BarChart3, title: "Compare rates", body: "Dense FD cards with rate, tenure, maturity, insurance, and deposit limits." },
              { icon: MessageCircleMore, title: "Ask Saathi", body: "Structured answers with recommendation, safety note, calculation, and next step." },
              { icon: Mic, title: "Voice advisor", body: "Calm voice mode with listening, processing, speaking, and transcript states." },
              { icon: Star, title: "Shortlist safely", body: "Save banks and keep them in context across compare, chat, and profile." },
            ].map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.article
                  key={feature.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ delay: index * 0.08, duration: 0.48 }}
                  className="rounded-[var(--radius-card)] border border-outline bg-panel p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:border-accent/30"
                >
                  <Icon className="h-5 w-5 text-accent" />
                  <h3 className="mt-4 text-base font-semibold text-text-strong">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-text-muted">{feature.body}</p>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
