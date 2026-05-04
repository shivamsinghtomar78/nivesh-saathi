import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";

import FirebaseAuthCard from "@/components/auth/FirebaseAuthCard";
import {
  MotionFloat,
  MotionReveal,
  MotionStagger,
  MotionStaggerItem,
} from "@/components/motion/MotionPrimitives";
import { ROUTES } from "@/lib/routes";

function getSafeNextPath(value?: string | string[]) {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (!candidate?.startsWith("/") || candidate.startsWith("//")) {
    return ROUTES.HOME;
  }

  return candidate;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{
    next?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const nextPath = getSafeNextPath(params?.next);

  return (
    <main className="dark-context min-h-[100svh] bg-app">
      <section className="grid min-h-[100svh] laptop:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="flex min-h-[100svh] items-center justify-center px-4 py-8 tablet:px-8 laptop:px-12">
          <MotionStagger className="w-full max-w-xl">
            <MotionStaggerItem>
              <Link
                href={ROUTES.LANDING}
                className="inline-flex items-center gap-2 text-sm font-semibold text-text-muted transition hover:text-accent"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Nivesh Saathi
              </Link>
            </MotionStaggerItem>

            <MotionStaggerItem>
              <div className="mt-10 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-panel)] bg-accent text-on-accent">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xl font-semibold text-text-strong">
                    Nivesh Saathi
                  </p>
                  <p className="text-xs uppercase tracking-[0.22em] text-text-muted">
                    Your investments, secured
                  </p>
                </div>
              </div>
            </MotionStaggerItem>

            <MotionStaggerItem>
              <div className="mt-10">
                <FirebaseAuthCard nextPath={nextPath} />
              </div>
            </MotionStaggerItem>

          </MotionStagger>
        </div>

        <MotionReveal
          className="relative hidden min-h-[100svh] overflow-hidden border-l border-outline bg-panel laptop:block"
          direction="left"
        >
          <Image
            src="/hero-illustration.png"
            alt="Family reviewing fixed deposit options together"
            fill
            priority
            sizes="50vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/38 to-black/18" />
          <MotionFloat className="absolute bottom-10 left-10 right-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-black/55 px-4 py-2 text-xs uppercase tracking-[0.2em] text-accent backdrop-blur">
              <ShieldCheck className="h-4 w-4" />
              Bank-grade encryption
            </div>
            <h2 className="mt-5 max-w-2xl text-4xl font-semibold leading-tight text-white">
              Keep the compare-to-advisor journey personal and secure.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/78">
              Sign in to save your shortlist, sync preferences across devices,
              and get personalized AI recommendations based on your profile.
            </p>
          </MotionFloat>
        </MotionReveal>
      </section>
    </main>
  );
}
