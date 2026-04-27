"use client";

import { create } from "zustand";

type AuthUser = {
  uid: string;
  email: string | null;
  phoneNumber: string | null;
  displayName: string | null;
  photoURL: string | null;
  providerId: string | null;
};

type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  user: AuthUser | null;
  status: AuthStatus;
  setStatus: (status: AuthStatus) => void;
  setUser: (user: AuthUser | null) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>()(
  (set) => ({
    user: null,
    status: "loading",
    setStatus: (status) => set({ status }),
    setUser: (user) =>
      set({
        user,
        status: user ? "authenticated" : "unauthenticated",
      }),
    clearUser: () => set({ user: null, status: "unauthenticated" }),
  })
);
