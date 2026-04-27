"use client";

import { useEffect } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";

import { withCsrfHeaders } from "@/lib/csrf";
import { firebaseAuth, getFirebaseAnalytics } from "@/lib/firebase";
import { useAuthStore } from "@/stores/authStore";

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
        void syncServerSession(user).catch(() => undefined);
        return;
      }

      void clearServerSession().catch(() => undefined);
      clearUser();
    });
  }, [clearUser, setStatus, setUser]);

  return null;
}
