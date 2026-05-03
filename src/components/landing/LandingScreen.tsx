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
  { label: "Senior Citizen", value: "9.10%", meta: "Top yield shortlist", tone: "gold" },
  { label: "Tax Saver", value: "7.20%", meta: "5 year option", tone: "gold" },
  { label: "Safety", value: "DICGC", meta: "Insurance status", tone: "success" },
];

export default function LandingScreen() {
  return (
    <main className="dark-context min-h-screen overflow-x-hidden bg-app text-text">
      <PublicHeader />

      <section className="safe-grid relative border-b border-outline bg-app pt-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_74%_18%,rgba(215,182,109,0.16),transparent_28rem),radial-gradient(circle_at_20%_24%,rgba(255,255,255,0.05),transparent_22rem),linear-gradient(180deg,rgba(255,255,255,0.045),transparent_44%)]" />
        <div className="relative mx-auto grid min-h-[calc(100svh-7rem)] max-w-7xl items-center gap-12 px-4 py-12 md:px-6 lg:grid-cols-[minmax(0,0.96fr)_minmax(360px,0.84fr)] lg:px-8">
          <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.09 } } }}>
            <motion.div variants={fadeUp} className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent-soft px-3 py-2 text-xs font-semibold text-accent shadow-[0_16px_42px_rgba(0,0,0,0.24)]">
              <span className="font-heading text-base text-accent">Private FD advisor</span>
              <span className="text-text-muted">Nivesh Saathi</span>
            </motion.div>

            <motion.h1 variants={fadeUp} className="clamp-title max-w-4xl font-semibold text-text-strong">
              Nivesh Saathi
            </motion.h1>

            <motion.p variants={fadeUp} className="mt-5 max-w-2xl text-lg leading-8 text-text md:text-xl">
              Compare fixed deposits, calculate maturity, and speak with Saathi in one calm, secure wealth workspace.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={ROUTES.LOGIN}>
                <Button size="lg" className="min-h-14 px-7 shadow-[0_22px_54px_rgba(215,182,109,0.22)]">
                  Sign in securely
                  <ArrowRight className="h-4 w-4" />
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
                    className="flex min-h-14 items-center gap-3 rounded-[var(--radius-panel)] border border-outline bg-panel-glass px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl"
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
            className="relative min-w-0"
          >
            <div className="glass-panel relative mx-auto w-full max-w-xl rounded-[var(--radius-card)] p-3 sm:p-4">
              <div className="rounded-[var(--radius-panel)] border border-outline bg-panel-strong p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:p-5">
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
                      className="rounded-[var(--radius-panel)] border border-outline bg-inner-panel p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">{card.label}</p>
                          <p className="mt-1 text-sm text-text">{card.meta}</p>
                        </div>
                        <p className={`financial-value text-3xl font-semibold ${card.tone === "success" ? "text-success" : "text-highlight"}`}>
                          {card.value}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                  {["Maturity", "Tenure", "Safety"].map((label) => (
                    <div key={label} className="rounded-[var(--radius-panel)] border border-outline bg-input-bg p-3">
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
                  className="flex min-h-56 flex-col rounded-[var(--radius-card)] border border-outline bg-panel p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:border-accent/30 hover:bg-panel-strong"
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
