"use client";

import { LockKeyhole, ShieldCheck, Smartphone } from "lucide-react";

import PhoneAuthCard from "@/components/auth/PhoneAuthCard";
import BottomNav from "@/components/layout/BottomNav";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import { useChatStore } from "@/stores/chatStore";

function LoginPageContent() {
  const language = useChatStore((state) => state.language);

  return (
    <>
      <Navbar />
      <main className="min-h-screen px-4 pb-24 pt-20 md:px-6 lg:pb-10">
        <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[32px] border border-outline bg-panel p-6 shadow-soft">
            <p className="text-xs uppercase tracking-[0.24em] text-highlight">
              Secure sign-in
            </p>
            <h1 className="mt-3 text-4xl font-semibold text-text-strong">
              Mobile auth makes the advisor feel trustworthy.
            </h1>
            <p className="mt-4 text-sm leading-7 text-text-muted">
              Phone authentication gives the demo a real user identity, lets us
              save shortlists and conversation history, and removes the
              &quot;stateless hackathon toy&quot; feeling from the product flow.
            </p>

            <div className="mt-8 grid gap-3">
              {[
                {
                  icon: Smartphone,
                  title: "Phone-first UX",
                  body: "Natural for Tier 2 and Tier 3 users who may not want email-password flows.",
                },
                {
                  icon: ShieldCheck,
                  title: "Secure shortlist sync",
                  body: "Keep compare results and chat context across refreshes and devices.",
                },
                {
                  icon: LockKeyhole,
                  title: "Production-style session",
                  body: "Firebase phone auth plus session cookies creates a more launch-ready backbone.",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="rounded-[24px] border border-outline bg-panel-strong p-4"
                  >
                    <Icon className="h-5 w-5 text-highlight" />
                    <h2 className="mt-3 text-lg font-semibold text-text-strong">
                      {item.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-text-muted">{item.body}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[32px] border border-outline bg-panel p-6 shadow-soft">
            <PhoneAuthCard language={language} />
          </div>
        </section>
      </main>

      <Footer />
      <BottomNav />
    </>
  );
}

export default function LoginPage() {
  return <LoginPageContent />;
}
