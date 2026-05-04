"use client";

import { useEffect } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";

import { withCsrfHeaders } from "@/lib/csrf";
import { firebaseAuth, getFirebaseAnalytics } from "@/lib/firebase";
import { useAuthStore } from "@/stores/authStore";
import { useCompareStore } from "@/stores/compareStore";

const HAD_AUTH_USER_KEY = "nivesh-had-auth-user";

async function syncServerSession(user: User) {
  const idToken = await user.getIdToken();

  await fetch("/api/auth/session", {
    method: "POST",
    headers: withCsrfHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ idToken }),
  });
}

async function clearServerSession() {
  await fetch("/api/auth/session", {
    method: "DELETE",
    headers: withCsrfHeaders(),
  });
}

async function hydrateShortlist() {
  const response = await fetch("/api/shortlist");
  if (!response.ok) return;

  const payload = (await response.json()) as {
    bankIds?: string[];
    lastCompareSnapshot?: ReturnType<
      typeof useCompareStore.getState
    >["lastCompareSnapshot"];
  };
  useCompareStore.getState().replaceShortlist(payload.bankIds ?? []);
  if (payload.lastCompareSnapshot) {
    useCompareStore.getState().setLastCompareSnapshot(payload.lastCompareSnapshot);
  }
}

export default function AuthBootstrap() {
  const setStatus = useAuthStore((state) => state.setStatus);
  const setUser = useAuthStore((state) => state.setUser);
  const clearUser = useAuthStore((state) => state.clearUser);

  useEffect(() => {
    setStatus("loading");
    void getFirebaseAnalytics();

    return onAuthStateChanged(firebaseAuth, (user) => {
      if (user) {
        setUser({
          uid: user.uid,
          email: user.email,
          phoneNumber: user.phoneNumber,
          displayName: user.displayName,
          photoURL: user.photoURL,
          providerId: user.providerData[0]?.providerId ?? null,
        });
        window.localStorage.setItem(HAD_AUTH_USER_KEY, "1");
        void syncServerSession(user)
          .then(() => hydrateShortlist())
          .catch(() => undefined);
        return;
      }

      if (window.localStorage.getItem(HAD_AUTH_USER_KEY)) {
        window.localStorage.removeItem(HAD_AUTH_USER_KEY);
        void clearServerSession().catch(() => undefined);
      }
      useCompareStore.getState().replaceShortlist([]);
      clearUser();
    });
  }, [clearUser, setStatus, setUser]);

  return null;
}
