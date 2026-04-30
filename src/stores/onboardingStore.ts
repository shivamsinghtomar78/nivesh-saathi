"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface UserFinancialProfile {
  investmentGoal: string | null;
  availableAmount: number | null;
  investmentHorizonMonths: number | null;
  isSeniorCitizen: boolean | null;
}

interface OnboardingState {
  hasCompletedOnboarding: boolean;
  profile: UserFinancialProfile;
  setProfileField: <K extends keyof UserFinancialProfile>(field: K, value: UserFinancialProfile[K]) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      profile: {
        investmentGoal: null,
        availableAmount: null,
        investmentHorizonMonths: null,
        isSeniorCitizen: null,
      },
      setProfileField: (field, value) =>
        set((state) => ({
          profile: {
            ...state.profile,
            [field]: value,
          },
        })),
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
      resetOnboarding: () =>
        set({
          hasCompletedOnboarding: false,
          profile: {
            investmentGoal: null,
            availableAmount: null,
            investmentHorizonMonths: null,
            isSeniorCitizen: null,
          },
        }),
    }),
    {
      name: "nivesh-onboarding-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
