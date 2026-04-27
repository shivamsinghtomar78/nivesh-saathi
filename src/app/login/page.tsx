import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";

import FirebaseAuthCard from "@/components/auth/FirebaseAuthCard";
import { ROUTES } from "@/lib/routes";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-black text-text-strong">
      <section className="grid min-h-screen lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
          <div className="w-full max-w-xl">
            <Link
              href={ROUTES.HOME}
              className="inline-flex items-center gap-2 text-sm font-semibold text-text-muted transition hover:text-highlight"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Nivesh Saathi
            </Link>

            <div className="mt-10 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-highlight text-black">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xl font-semibold text-text-strong">
                  Nivesh Saathi
                </p>
                <p className="text-xs uppercase tracking-[0.22em] text-text-muted">
                  Secure Firebase auth
                </p>
              </div>
            </div>

            <div className="mt-10">
              <FirebaseAuthCard />
            </div>
          </div>
        </div>

        <div className="relative hidden min-h-screen overflow-hidden border-l border-outline bg-panel lg:block">
          <Image
            src="/hero-illustration.png"
            alt="Family reviewing fixed deposit options together"
            fill
            priority
            sizes="50vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/18 to-transparent" />
          <div className="absolute bottom-10 left-10 right-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/45 px-4 py-2 text-xs uppercase tracking-[0.2em] text-highlight backdrop-blur">
              <ShieldCheck className="h-4 w-4" />
              Email, phone, and Google sign-in
            </div>
            <h2 className="mt-5 max-w-2xl text-4xl font-semibold leading-tight text-white">
              Keep the compare-to-advisor journey personal and secure.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/78">
              Firebase Auth gives Nivesh Saathi a real user identity, synced
              shortlist context, and a more production-ready demo flow.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
