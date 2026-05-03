"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import {
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { withCsrfHeaders } from "@/lib/csrf";
import { firebaseAuth } from "@/lib/firebase";
import { ROUTES } from "@/lib/routes";
import { useAuthStore } from "@/stores/authStore";

function readableAuthError(error: unknown) {
  if (!(error instanceof Error)) {
    return "Authentication failed. Please try again.";
  }

  if (error.message.includes("auth/operation-not-allowed")) {
    return "This Firebase sign-in provider is not enabled yet.";
  }

  if (error.message.includes("auth/invalid-credential")) {
    return "The email or password is incorrect.";
  }

  if (error.message.includes("auth/email-already-in-use")) {
    return "That email already has an account. Please sign in instead.";
  }

  if (error.message.includes("auth/weak-password")) {
    return "Use at least 6 characters for the password.";
  }

  return error.message;
}

async function createServerSession(user: User) {
  const idToken = await user.getIdToken();
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: withCsrfHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    toast.message(
      payload.error || "Signed in locally. Server session is not enabled yet."
    );
    return;
  }

  toast.success("Signed in successfully.");
}

export default function FirebaseAuthCard({
  nextPath = ROUTES.HOME,
}: {
  nextPath?: string;
}) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const user = useAuthStore((state) => state.user);
  const clearUser = useAuthStore((state) => state.clearUser);
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const handleEmailAuth = async () => {
    if (!email.trim() || password.length < 6) {
      toast.error("Enter a valid email and a 6+ character password.");
      return;
    }

    setBusyAction("email");
    try {
      const credential = isSignUp
        ? await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password)
        : await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);

      await createServerSession(credential.user);
      router.push(nextPath);
    } catch (error) {
      toast.error(readableAuthError(error));
    } finally {
      setBusyAction(null);
    }
  };

  const handleGoogleAuth = async () => {
    setBusyAction("google");
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const credential = await signInWithPopup(firebaseAuth, provider);

      await createServerSession(credential.user);
      router.push(nextPath);
    } catch (error) {
      toast.error(readableAuthError(error));
    } finally {
      setBusyAction(null);
    }
  };

  const handleSignOut = async () => {
    setBusyAction("sign-out");
    await signOut(firebaseAuth).catch(() => undefined);
    await fetch("/api/auth/session", {
      method: "DELETE",
      headers: withCsrfHeaders(),
    }).catch(() => undefined);
    clearUser();
    setBusyAction(null);
    toast.success("Signed out.");
  };

  if (user) {
    return (
      <motion.div
        className="rounded-[var(--radius-card)] border border-outline bg-panel p-5 shadow-soft"
        initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.98 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-panel)] bg-accent-soft text-accent">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-[0.22em] text-text-muted">
              Signed in
            </p>
            <p className="mt-2 text-lg font-semibold text-text-strong">
              {user.email || "Verified Nivesh Saathi user"}
            </p>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              Your shortlist and advisor context are ready.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <motion.button
            type="button"
            onClick={() => router.push(nextPath)}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-input)] bg-accent px-4 text-sm font-semibold text-on-accent shadow-[0_18px_42px_rgba(215,182,109,0.2)] transition hover:bg-accent-hover"
            whileHover={reduceMotion ? undefined : { y: -2 }}
            whileTap={reduceMotion ? undefined : { scale: 0.97 }}
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </motion.button>
          <motion.button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={busyAction === "sign-out"}
            className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-input)] border border-outline px-4 text-sm font-semibold text-text-strong transition hover:border-accent/35 hover:text-accent disabled:opacity-60"
            whileHover={reduceMotion ? undefined : { y: -2 }}
            whileTap={reduceMotion ? undefined : { scale: 0.97 }}
          >
            Sign out
          </motion.button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="w-full"
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={isSignUp ? "signup" : "login"}
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -10 }}
            transition={{ duration: 0.22 }}
          >
            <h1 className="text-3xl font-semibold text-text-strong md:text-4xl">
              {isSignUp ? "Create an account" : "Welcome back"}
            </h1>
            <p className="mt-3 text-sm text-text-muted">
              {isSignUp ? "Already have an account?" : "New to Nivesh Saathi?"}{" "}
              <button
                type="button"
                onClick={() => setIsSignUp((value) => !value)}
                className="font-semibold text-accent underline-offset-4 hover:underline"
              >
                {isSignUp ? "Login" : "Create one"}
              </button>
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <motion.form
        className="mt-10 grid gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          void handleEmailAuth();
        }}
        initial={reduceMotion ? false : "hidden"}
        animate={reduceMotion ? undefined : "show"}
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.07 } },
        }}
      >
        <motion.label
          className="grid gap-2"
          variants={{
            hidden: { opacity: 0, y: 12 },
            show: { opacity: 1, y: 0 },
          }}
        >
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            Enter work email
          </span>
          <div className="flex min-h-14 items-center rounded-[var(--radius-input)] border border-outline bg-panel px-4 transition focus-within:border-accent">
            <Mail className="h-4 w-4 text-text-muted" />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="me@example.com"
              className="w-full bg-transparent px-3 text-base text-text-strong outline-none placeholder:text-text-muted/70"
              autoComplete="email"
            />
          </div>
        </motion.label>

        <motion.label
          className="grid gap-2"
          variants={{
            hidden: { opacity: 0, y: 12 },
            show: { opacity: 1, y: 0 },
          }}
        >
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            Enter password
            <LockKeyhole className="h-3.5 w-3.5" />
          </span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="********"
            className="min-h-14 rounded-[var(--radius-input)] border border-outline bg-panel px-4 text-base text-text-strong outline-none transition placeholder:text-text-muted/70 focus:border-accent"
            autoComplete={isSignUp ? "new-password" : "current-password"}
          />
        </motion.label>

        <motion.button
          type="submit"
          disabled={busyAction !== null}
          className="inline-flex min-h-14 items-center justify-center gap-3 rounded-[var(--radius-input)] bg-accent px-5 text-sm font-bold uppercase tracking-[0.08em] text-on-accent shadow-[0_18px_42px_rgba(215,182,109,0.2)] transition hover:bg-accent-hover disabled:opacity-60"
          variants={{
            hidden: { opacity: 0, y: 12 },
            show: { opacity: 1, y: 0 },
          }}
          whileHover={reduceMotion ? undefined : { y: -2 }}
          whileTap={reduceMotion ? undefined : { scale: 0.97 }}
        >
          {busyAction === "email" ? (
            <LoaderCircle className="h-5 w-5 animate-spin" />
          ) : (
            <CheckCircle2 className="h-5 w-5" />
          )}
          {isSignUp ? "Create secure account" : "Sign in"}
          <ArrowRight className="h-4 w-4" />
        </motion.button>
      </motion.form>

      <div className="my-7 flex items-center gap-3">
        <div className="h-px flex-1 bg-outline" />
        <span className="text-xs uppercase tracking-[0.2em] text-text-muted">
          or
        </span>
        <div className="h-px flex-1 bg-outline" />
      </div>

      <div className="grid gap-3">
        <motion.button
          type="button"
          onClick={() => void handleGoogleAuth()}
          disabled={busyAction !== null}
          className="inline-flex min-h-14 items-center justify-center gap-3 rounded-[var(--radius-input)] border border-outline bg-panel px-5 text-sm font-bold uppercase tracking-[0.06em] text-text-strong transition hover:border-accent/35 hover:text-accent disabled:opacity-60"
          whileHover={reduceMotion ? undefined : { y: -2 }}
          whileTap={reduceMotion ? undefined : { scale: 0.97 }}
        >
          {busyAction === "google" ? (
            <LoaderCircle className="h-5 w-5 animate-spin" />
          ) : (
            <span className="text-lg font-black text-accent">G</span>
          )}
          {isSignUp ? "Sign up with Google" : "Sign in with Google"}
        </motion.button>

      </div>

      <p className="mt-7 text-center text-xs leading-6 text-text-muted">
        By signing up, you agree to use Nivesh Saathi for educational FD
        guidance, not personalized investment advice.
      </p>
    </motion.div>
  );
}
