"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";

import { firebaseAuth, getFirebaseAnalytics } from "@/lib/firebase";
import { useAuthStore } from "@/stores/authStore";

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
          phoneNumber: user.phoneNumber,
        });
        return;
      }

      clearUser();
    });
  }, [clearUser, setStatus, setUser]);

  return null;
}
