"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type AuthUser = {
  uid: string;
  phoneNumber: string | null;
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
  persist(
    (set) => ({
      user: null,
      status: "idle",
      setStatus: (status) => set({ status }),
      setUser: (user) =>
        set({
          user,
          status: user ? "authenticated" : "unauthenticated",
        }),
      clearUser: () => set({ user: null, status: "unauthenticated" }),
    }),
    {
      name: "nivesh-auth",
      partialize: (state) => ({
        user: state.user,
        status: state.status,
      }),
    }
  )
);
