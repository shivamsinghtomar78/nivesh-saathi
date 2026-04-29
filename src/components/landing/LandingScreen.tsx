"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  ArrowRight,
  Languages,
  MessageCircleMore,
  Mic,
  ShieldCheck,
  Sparkles,
  Lock
} from "lucide-react";

import PublicHeader from "@/components/landing/PublicHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { useAuthStore } from "@/stores/authStore";
import Hero3D from "@/components/landing/Hero3D";

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
  const user = useAuthStore((state) => state.user);
  const primaryHref = user ? ROUTES.HOME : ROUTES.LOGIN;
  const primaryLabel = user ? "Open Home" : "Get Started";

  return (
    <main className="dark-context min-h-screen relative overflow-hidden bg-black">
      <PublicHeader />
      
      {/* 3D Background */}
      <div className="absolute inset-0 z-0">
        <Hero3D />
      </div>

      <section className="relative z-10 mx-auto max-w-7xl px-4 pt-32 pb-20 md:px-6 lg:px-8 flex flex-col items-center justify-center min-h-[90vh]">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center max-w-4xl mx-auto"
        >
          <motion.div variants={itemVariants} className="flex justify-center mb-6">
            <Badge variant="accent" className="px-4 py-1.5 text-sm shadow-sm bg-panel-glass backdrop-blur-md border-outline">
              <Sparkles className="w-4 h-4 mr-2 text-accent" />
              Next-Gen FD Advisor
            </Badge>
          </motion.div>
          
          <motion.h1 
            variants={itemVariants}
            className="text-5xl md:text-7xl font-semibold tracking-tight text-text-strong mb-6 leading-tight"
          >
            Smarter Investments, <br/>
            <span className="text-accent bg-clip-text">Powered by AI</span>
          </motion.h1>
          
          <motion.p 
            variants={itemVariants}
            className="text-lg md:text-xl text-text-muted max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Experience a seamless journey from clear comparisons to intelligent voice and text guidance. Your secure path to optimized fixed deposits.
          </motion.p>
          
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href={primaryHref}>
              <Button size="lg" className="rounded-full px-8 h-14 text-base shadow-lg transition-transform hover:scale-105 active:scale-95">
                {primaryLabel}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            {!user && (
              <Link href={ROUTES.LOGIN}>
                <Button size="lg" variant="primary" className="rounded-full px-8 h-14 text-base bg-highlight text-black hover:bg-highlight/90 transition-transform hover:scale-105 active:scale-95 shadow-lg">
                  <Lock className="mr-2 h-4 w-4" />
                  Sign In / Register
                </Button>
              </Link>
            )}
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
                  className="bg-panel rounded-[var(--radius-card)] p-8 border border-outline shadow-soft transition-colors hover:border-accent/30 group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-surface-dark text-on-dark flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
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
            <div className="aspect-square max-w-md mx-auto relative bg-gradient-to-tr from-panel to-inner-panel rounded-[var(--radius-card)] border border-outline shadow-card-lg overflow-hidden flex flex-col justify-center p-8">
               <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent/10 via-transparent to-transparent opacity-50"></div>
               
               <div className="relative z-10 space-y-4">
                 {["English", "Hindi", "Tamil", "Bengali"].map((lang, i) => (
                   <motion.div 
                     key={lang}
                     initial={{ opacity: 0, x: 20 }}
                     whileInView={{ opacity: 1, x: 0 }}
                     viewport={{ once: true }}
                     transition={{ delay: i * 0.1 + 0.3 }}
                     className={`p-4 rounded-2xl border \${i === 0 ? 'bg-surface-dark text-on-dark border-transparent' : 'bg-panel border-outline text-text-strong'} flex justify-between items-center`}
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
      
      {/* Footer */}
      <footer className="relative z-10 border-t border-outline bg-panel-glass py-12">
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8 text-center text-text-muted text-sm">
          <p>© {new Date().getFullYear()} Nivesh Saathi. Secure & intelligent FD advisor.</p>
        </div>
      </footer>
    </main>
  );
}
