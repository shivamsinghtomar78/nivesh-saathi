"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ConfirmationResult, RecaptchaVerifier, signInWithPhoneNumber, signOut } from "firebase/auth";
import { LoaderCircle, LogIn, ShieldCheck, Smartphone } from "lucide-react";
import { toast } from "sonner";

import { APP_COPY } from "@/lib/copy";
import { withCsrfHeaders } from "@/lib/csrf";
import { firebaseAuth } from "@/lib/firebase";
import type { AppLanguage } from "@/lib/server/advisor-schemas";
import { useAuthStore } from "@/stores/authStore";

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
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

export default function PhoneAuthCard({
  language,
}: {
  language: AppLanguage;
}) {
  const copy = APP_COPY[language].auth;
  const user = useAuthStore((state) => state.user);
  const clearUser = useAuthStore((state) => state.clearUser);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const verifierReady = useRef(false);
  const recaptchaId = useMemo(() => `recaptcha-container-${language}`, [language]);

  useEffect(() => {
    if (typeof window === "undefined" || verifierReady.current) {
      return;
    }

    window.recaptchaVerifier = new RecaptchaVerifier(firebaseAuth, recaptchaId, {
      size: "invisible",
    });
    verifierReady.current = true;

    return () => {
      window.recaptchaVerifier?.clear();
      window.recaptchaVerifier = undefined;
      verifierReady.current = false;
    };
  }, [recaptchaId]);

  const sendOtp = async () => {
    if (!window.recaptchaVerifier) {
      toast.error("reCAPTCHA is not ready yet.");
      return;
    }

    setIsSending(true);
    try {
      const result = await signInWithPhoneNumber(
        firebaseAuth,
        normalizeIndianPhone(phoneNumber),
        window.recaptchaVerifier
      );
      setConfirmation(result);
      toast.success("OTP sent to your phone.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to send OTP right now."
      );
    } finally {
      setIsSending(false);
    }
  };

  const verifyOtp = async () => {
    if (!confirmation) {
      toast.error("Send OTP first.");
      return;
    }

    setIsVerifying(true);
    try {
      const credential = await confirmation.confirm(otp);
      const idToken = await credential.user.getIdToken();
      const sessionResponse = await fetch("/api/auth/session", {
        method: "POST",
        headers: withCsrfHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ idToken }),
      });

      if (!sessionResponse.ok) {
        const payload = await sessionResponse.json().catch(() => ({}));
        toast.message(
          payload.error || "Signed in on this device. Server session is not enabled yet."
        );
      } else {
        toast.success("Signed in successfully.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to verify OTP."
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(firebaseAuth);
    await fetch("/api/auth/session", {
      method: "DELETE",
      headers: withCsrfHeaders(),
    }).catch(() => undefined);
    clearUser();
    toast.success("Signed out.");
  };

  if (user) {
    return (
      <div className="rounded-2xl border border-outline bg-panel px-5 py-5 shadow-soft">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-highlight/12 text-highlight">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm uppercase tracking-[0.2em] text-text-muted">
              Signed in
            </p>
            <p className="mt-1 text-lg font-semibold text-text-strong">
              {user.phoneNumber || "Verified mobile user"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-xl border border-outline px-4 py-2 text-sm font-medium text-text-muted transition hover:border-highlight hover:text-highlight"
          >
            {copy.signOut}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-outline bg-panel px-5 py-5 shadow-soft">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-highlight/12 text-highlight">
          <Smartphone className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-text-strong">{copy.title}</h2>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            {copy.subtitle}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        <label className="grid gap-2 text-sm text-text-muted">
          <span>{copy.phoneLabel}</span>
          <input
            type="tel"
            inputMode="numeric"
            value={phoneNumber}
            onChange={(event) => setPhoneNumber(event.target.value)}
            placeholder="+91 9876543210"
            className="h-12 rounded-xl border border-outline bg-panel-strong px-4 text-base text-text-strong outline-none transition focus:border-highlight"
          />
        </label>

        {confirmation && (
          <label className="grid gap-2 text-sm text-text-muted">
            <span>{copy.otpLabel}</span>
            <input
              type="text"
              inputMode="numeric"
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
              placeholder="123456"
              className="h-12 rounded-xl border border-outline bg-panel-strong px-4 text-base text-text-strong outline-none transition focus:border-highlight"
            />
          </label>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void sendOtp()}
            disabled={isSending}
            className="inline-flex items-center gap-2 rounded-xl bg-highlight px-4 py-3 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-60"
          >
            {isSending ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            {copy.sendOtp}
          </button>

          {confirmation && (
            <button
              type="button"
              onClick={() => void verifyOtp()}
              disabled={isVerifying}
              className="inline-flex items-center gap-2 rounded-xl border border-outline px-4 py-3 text-sm font-semibold text-text-strong transition hover:border-highlight disabled:opacity-60"
            >
              {isVerifying ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              {copy.verifyOtp}
            </button>
          )}
        </div>
      </div>

      <div id={recaptchaId} />
    </div>
  );
}
