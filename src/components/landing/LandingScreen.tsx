"use client";

import React from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Languages,
  MessageCircleMore,
  Mic,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

import PublicHeader from "@/components/landing/PublicHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
/* Contextual rate visuals for the public hero. */
const FloatingRateCards = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-accent-warm/8" />
      <motion.div
        animate={{ y: [0, -20, 0], rotate: [0, 2, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-[10%] top-[20%] hidden w-48 rounded-[var(--radius-panel)] border border-outline/50 bg-panel-glass/70 p-4 shadow-[var(--shadow-card)] backdrop-blur-md lg:block"
      >
        <div className="text-[10px] font-semibold text-text-muted mb-1 uppercase">Senior Citizen</div>
        <div className="text-2xl font-bold text-accent">9.10%</div>
        <div className="text-sm font-medium text-text-strong">Unity SFB</div>
      </motion.div>
      <motion.div
        animate={{ y: [0, 15, 0], rotate: [0, -1, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-[25%] right-[12%] hidden w-48 rounded-[var(--radius-panel)] border border-outline/50 bg-panel-glass/70 p-4 shadow-[var(--shadow-card)] backdrop-blur-md lg:block"
      >
        <div className="text-[10px] font-semibold text-text-muted mb-1 uppercase">Tax Saver (5 Yr)</div>
        <div className="text-2xl font-bold text-highlight">7.20%</div>
        <div className="text-sm font-medium text-text-strong">HDFC Bank</div>
      </motion.div>
    </div>
  );
};

const journeyCards = [
  {
    title: "Clear Comparisons",
    body: "Review rates, maturity, and bank types in one unified interface.",
    icon: Sparkles,
  },
  {
    title: "Text AI Assistant",
    body: "Clarify jargon and explore options directly through text chat.",
    icon: MessageCircleMore,
  },
  {
    title: "Voice First Guidance",
    body: "Speak naturally and get intelligent, conversational assistance.",
    icon: Mic,
  },
];

const trustBadges = [
  { icon: Zap, label: "Powered by Gemini AI" },
  { icon: ShieldCheck, label: "DICGC Insured Banks" },
  { icon: BarChart3, label: "8+ Banks Compared" },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function LandingScreen() {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updateIsMobile = () => setIsMobile(mediaQuery.matches);
    const frame = window.requestAnimationFrame(updateIsMobile);
    mediaQuery.addEventListener("change", updateIsMobile);

    return () => {
      window.cancelAnimationFrame(frame);
      mediaQuery.removeEventListener("change", updateIsMobile);
    };
  }, []);

  const primaryHref = ROUTES.LOGIN;
  const primaryLabel = "Sign in securely";

  return (
    <main className="dark-context relative min-h-screen overflow-hidden bg-app">
      <PublicHeader />
      
      {/* Subtle floating rate cards background */}
      <div className="absolute inset-0 z-0">
        {!isMobile ? (
          <FloatingRateCards />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-accent-warm/8" />
        )}
      </div>

      <section className="relative z-10 mx-auto max-w-7xl px-4 pt-32 pb-20 md:px-6 lg:px-8 flex flex-col items-center justify-center min-h-[90vh]">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="text-center max-w-4xl mx-auto"
        >
          <motion.div variants={itemVariants} className="flex justify-center mb-6">
            <Badge variant="accent" className="border-outline bg-panel-glass px-4 py-1.5 text-sm shadow-[var(--shadow-soft-layer)] backdrop-blur-md">
              <Sparkles className="w-4 h-4 mr-2 text-accent" />
              Next-Gen FD Advisor
            </Badge>
          </motion.div>
          
          {/* Specific, benefit-driven headline */}
          <motion.h1 
            variants={itemVariants}
            className="text-4xl sm:text-5xl md:text-7xl font-semibold tracking-tight text-text-strong mb-6 leading-tight"
          >
            Find India&apos;s Best Fixed Deposits{" "}
            <br className="hidden sm:block" />
            <span className="text-accent bg-clip-text">in 30 Seconds</span>
          </motion.h1>
          
          <motion.p 
            variants={itemVariants}
            className="text-lg md:text-xl text-text-muted max-w-2xl mx-auto mb-8 leading-relaxed"
          >
            Compare 8+ banks, get AI-powered guidance via text or voice, and secure
            the highest returns - all in one place.
          </motion.p>

          {/* Trust signals */}
          <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-center gap-4 mb-10">
            {trustBadges.map((badge) => {
              const Icon = badge.icon;
              return (
                <div key={badge.label} className="flex items-center gap-2 text-text-muted text-xs font-medium">
                  <Icon className="w-3.5 h-3.5 text-accent" />
                  <span>{badge.label}</span>
                </div>
              );
            })}
          </motion.div>
          
          {/* Authentication-first CTA */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href={primaryHref}>
              <Button size="lg" className="h-14 rounded-full px-8 text-base">
                {primaryLabel}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      <section className="relative z-10 bg-panel-glass backdrop-blur-2xl border-t border-outline py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-semibold text-text-strong mb-4">
              Everything you need, nothing you don&apos;t.
            </h2>
            <p className="text-text-muted text-lg max-w-2xl mx-auto">
              A meticulously designed interface focused entirely on your investment journey.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {journeyCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: index * 0.15 }}
                  whileHover={{ y: -5 }}
                  className="group rounded-[var(--radius-card)] border border-outline bg-panel p-8 shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:border-accent/30 hover:shadow-[var(--shadow-card-hover)]"
                >
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-[var(--radius-panel)] bg-accent text-white shadow-[0_12px_28px_rgba(10,127,100,0.22)] transition-transform duration-300 group-hover:scale-105">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-text-strong mb-3">
                    {card.title}
                  </h3>
                  <p className="text-text-muted leading-relaxed">
                    {card.body}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Feature Highlights Section */}
      <section className="relative z-10 py-24 mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
          >
            <Badge variant="outline" className="mb-6">Global Accessibility</Badge>
            <h2 className="text-4xl font-semibold text-text-strong mb-6 leading-tight">
              Speaks your language, securely.
            </h2>
            <p className="text-lg text-text-muted mb-8 leading-relaxed">
              Experience the application natively. English is our foundation, but regional languages are just a tap away, ensuring guidance is always understood.
            </p>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="mt-1 bg-accent/10 p-2 rounded-xl text-accent">
                  <Languages className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-text-strong">Multilingual Support</h4>
                  <p className="text-sm text-text-muted mt-1">Seamlessly switch between English, Hindi, Tamil, and Bengali.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="mt-1 bg-accent/10 p-2 rounded-xl text-accent">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-text-strong">Secure Sessions</h4>
                  <p className="text-sm text-text-muted mt-1">Enterprise-grade authentication protects your data and preserves your context across devices.</p>
                </div>
              </div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="relative mx-auto flex aspect-square max-w-md flex-col justify-center overflow-hidden rounded-[var(--radius-card)] border border-outline bg-gradient-to-tr from-panel to-inner-panel p-8 shadow-[var(--shadow-card)]">
               <div className="absolute left-0 top-0 h-full w-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent/15 via-transparent to-transparent opacity-60"></div>
               
               <div className="relative z-10 space-y-4">
                 {["English", "Hindi", "Tamil", "Bengali"].map((lang, i) => (
                   <motion.div 
                     key={lang}
                     initial={{ opacity: 0, x: 20 }}
                     whileInView={{ opacity: 1, x: 0 }}
                     viewport={{ once: true }}
                     transition={{ delay: i * 0.1 + 0.3 }}
                     className={`flex items-center justify-between rounded-[var(--radius-panel)] border p-4 ${i === 0 ? 'border-transparent bg-accent text-white' : 'border-outline bg-panel text-text-strong'}`}
                   >
                     <span className="font-medium">{lang}</span>
                     {i === 0 && <div className="w-2 h-2 rounded-full bg-accent animate-pulse"></div>}
                   </motion.div>
                 ))}
               </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Persona cards section */}
      <section className="relative z-10 py-20 bg-panel-glass backdrop-blur-2xl border-t border-outline">
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-4xl font-semibold text-text-strong mb-4">Built for every investor</h2>
            <p className="text-text-muted text-lg max-w-xl mx-auto">No matter your experience, Nivesh Saathi adapts to your needs.</p>
          </motion.div>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { label: "Senior", title: "Retiree", body: "Find the safest senior citizen rates with DICGC insurance guidance." },
              { label: "New", title: "First-time Investor", body: "Jargon-free explanations and step-by-step comparisons for beginners." },
              { label: "NRI", title: "NRI", body: "Compare NRO/NRE-friendly banks with the best returns for overseas Indians." },
            ].map((persona, i) => (
              <motion.div
                key={persona.title}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.5 }}
                className="rounded-[var(--radius-card)] border border-outline bg-panel p-7 shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:border-accent/30 hover:shadow-[var(--shadow-card-hover)]"
              >
                <span className="inline-flex rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
                  {persona.label}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-text-strong">{persona.title}</h3>
                <p className="mt-2 text-sm text-text-muted leading-relaxed">{persona.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="relative z-10 border-t border-outline bg-panel-glass py-12">
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-text-muted text-sm">
              (c) {new Date().getFullYear()} Nivesh Saathi. Secure & intelligent FD advisor.
            </p>
            <div className="flex items-center gap-6">
              <Link href={ROUTES.PRIVACY} className="text-xs text-text-muted hover:text-text-strong transition">Privacy Policy</Link>
              <Link href={ROUTES.TERMS} className="text-xs text-text-muted hover:text-text-strong transition">Terms of Service</Link>
              <a href="https://github.com/shivamsinghtomar78/nivesh-saathi" target="_blank" rel="noopener noreferrer" className="text-xs text-text-muted hover:text-text-strong transition">GitHub</a>
              <a href="mailto:contact@niveshsaathi.in" className="text-xs text-text-muted hover:text-text-strong transition">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
