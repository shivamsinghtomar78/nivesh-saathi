"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
  type ConfirmationResult,
  type User,
} from "firebase/auth";
import {
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { withCsrfHeaders } from "@/lib/csrf";
import { firebaseAuth } from "@/lib/firebase";
import { ROUTES } from "@/lib/routes";
import { useAuthStore } from "@/stores/authStore";

declare global {
  interface Window {
    firebaseAuthRecaptcha?: RecaptchaVerifier;
  }
}

function normalizeIndianPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }

  return phone;
}

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

  if (error.message.includes("auth/invalid-phone-number")) {
    return "Enter a valid phone number with country code.";
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

export default function FirebaseAuthCard() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const user = useAuthStore((state) => state.user);
  const clearUser = useAuthStore((state) => state.clearUser);
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(
    null
  );
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const verifierRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaId = "firebase-auth-recaptcha";

  useEffect(() => {
    return () => {
      verifierRef.current?.clear();
      verifierRef.current = null;
      window.firebaseAuthRecaptcha = undefined;
    };
  }, []);

  const getPhoneVerifier = () => {
    if (typeof window === "undefined") {
      return null;
    }

    if (!verifierRef.current) {
      verifierRef.current = new RecaptchaVerifier(
        firebaseAuth,
        recaptchaId,
        {
          size: "invisible",
        }
      );
      window.firebaseAuthRecaptcha = verifierRef.current;
    }

    return verifierRef.current;
  };

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
      router.push(ROUTES.COMPARE);
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
      router.push(ROUTES.COMPARE);
    } catch (error) {
      toast.error(readableAuthError(error));
    } finally {
      setBusyAction(null);
    }
  };

  const sendOtp = async () => {
    setBusyAction("phone");
    try {
      const verifier = getPhoneVerifier();

      if (!verifier) {
        throw new Error("Secure phone check is not available in this browser.");
      }

      const result = await signInWithPhoneNumber(
        firebaseAuth,
        normalizeIndianPhone(phoneNumber),
        verifier
      );
      setConfirmation(result);
      toast.success("OTP sent to your phone.");
    } catch (error) {
      toast.error(readableAuthError(error));
    } finally {
      setBusyAction(null);
    }
  };

  const verifyOtp = async () => {
    if (!confirmation) {
      toast.error("Send OTP first.");
      return;
    }

    setBusyAction("otp");
    try {
      const credential = await confirmation.confirm(otp);
      await createServerSession(credential.user);
      router.push(ROUTES.COMPARE);
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
        className="rounded-[28px] border border-outline bg-panel p-5 shadow-soft"
        initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.98 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-highlight/15 text-highlight">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-[0.22em] text-text-muted">
              Signed in
            </p>
            <p className="mt-2 text-lg font-semibold text-text-strong">
              {user.email || user.phoneNumber || "Verified Nivesh Saathi user"}
            </p>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              Your shortlist and advisor context are ready.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <motion.button
            type="button"
            onClick={() => router.push(ROUTES.COMPARE)}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-highlight px-4 text-sm font-semibold text-black transition hover:brightness-110"
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
            className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-outline px-4 text-sm font-semibold text-text-strong transition hover:border-highlight hover:text-highlight disabled:opacity-60"
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
                className="font-semibold text-highlight underline-offset-4 hover:underline"
              >
                {isSignUp ? "Login" : "Create one"}
              </button>
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <motion.div
        className="mt-10 grid gap-5"
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
          <div className="flex min-h-14 items-center rounded-lg border border-outline bg-panel px-4 transition focus-within:border-highlight">
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
            className="min-h-14 rounded-lg border border-outline bg-panel px-4 text-base text-text-strong outline-none transition placeholder:text-text-muted/70 focus:border-highlight"
            autoComplete={isSignUp ? "new-password" : "current-password"}
          />
        </motion.label>

        <motion.button
          type="button"
          onClick={() => void handleEmailAuth()}
          disabled={busyAction !== null}
          className="inline-flex min-h-14 items-center justify-center gap-3 rounded-lg bg-highlight px-5 text-sm font-bold uppercase tracking-[0.08em] text-black transition hover:brightness-110 disabled:opacity-60"
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
          {isSignUp ? "Start for free" : "Sign in"}
          <ArrowRight className="h-4 w-4" />
        </motion.button>
      </motion.div>

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
          className="inline-flex min-h-14 items-center justify-center gap-3 rounded-lg border border-outline bg-panel px-5 text-sm font-bold uppercase tracking-[0.06em] text-text-strong transition hover:border-highlight hover:text-highlight disabled:opacity-60"
          whileHover={reduceMotion ? undefined : { y: -2 }}
          whileTap={reduceMotion ? undefined : { scale: 0.97 }}
        >
          {busyAction === "google" ? (
            <LoaderCircle className="h-5 w-5 animate-spin" />
          ) : (
            <span className="text-lg font-black text-highlight">G</span>
          )}
          {isSignUp ? "Sign up with Google" : "Sign in with Google"}
        </motion.button>

        <motion.div
          className="rounded-lg border border-outline bg-panel p-4"
          whileHover={reduceMotion ? undefined : { borderColor: "#f7b843" }}
        >
          <div className="flex items-center gap-3">
            <Phone className="h-5 w-5 text-highlight" />
            <div>
              <p className="text-sm font-semibold text-text-strong">
                Continue with phone
              </p>
              <p className="mt-1 text-xs text-text-muted">
                Uses Firebase Phone Auth and invisible reCAPTCHA.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              type="tel"
              inputMode="tel"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              placeholder="+91 9876543210"
              className="min-h-12 rounded-lg border border-outline bg-app px-4 text-base text-text-strong outline-none transition placeholder:text-text-muted/70 focus:border-highlight"
            />
            <motion.button
              type="button"
              onClick={() => void sendOtp()}
              disabled={busyAction !== null}
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-outline px-4 text-sm font-semibold text-text-strong transition hover:border-highlight hover:text-highlight disabled:opacity-60"
              whileHover={reduceMotion ? undefined : { y: -2 }}
              whileTap={reduceMotion ? undefined : { scale: 0.97 }}
            >
              {busyAction === "phone" ? "Sending..." : "Send OTP"}
            </motion.button>
          </div>

          <AnimatePresence>
            {confirmation ? (
              <motion.div
                className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]"
                initial={reduceMotion ? false : { opacity: 0, height: 0, y: -8 }}
                animate={reduceMotion ? undefined : { opacity: 1, height: "auto", y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, height: 0, y: -8 }}
                transition={{ duration: 0.24 }}
              >
                <input
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  placeholder="Enter OTP"
                  className="min-h-12 rounded-lg border border-outline bg-app px-4 text-base text-text-strong outline-none transition placeholder:text-text-muted/70 focus:border-highlight"
                />
                <motion.button
                  type="button"
                  onClick={() => void verifyOtp()}
                  disabled={busyAction !== null}
                  className="inline-flex min-h-12 items-center justify-center rounded-lg bg-highlight px-4 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-60"
                  whileHover={reduceMotion ? undefined : { y: -2 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                >
                  {busyAction === "otp" ? "Verifying..." : "Verify"}
                </motion.button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </div>

      <p className="mt-7 text-center text-xs leading-6 text-text-muted">
        By signing up, you agree to use Nivesh Saathi for educational FD
        guidance, not personalized investment advice.
      </p>

      <div id={recaptchaId} />
    </motion.div>
  );
}
