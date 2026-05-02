"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { FdLadderBlock, FdLadderPlan } from "@/lib/fd-ladder";

export type LadderDashboardDraft = {
  planId: string;
  planLabel: string;
  blocks: FdLadderBlock[];
  nextIndex: number;
};

type LadderStore = {
  latestPlan: FdLadderPlan | null;
  savedPlans: FdLadderPlan[];
  dashboardDraft: LadderDashboardDraft | null;
  savePlan: (plan: FdLadderPlan) => void;
  setDashboardDraft: (plan: FdLadderPlan) => void;
  advanceDashboardDraft: () => void;
  clearDashboardDraft: () => void;
};

export const useLadderStore = create<LadderStore>()(
  persist(
    (set) => ({
      latestPlan: null,
      savedPlans: [],
      dashboardDraft: null,
      savePlan: (plan) =>
        set((state) => ({
          latestPlan: plan,
          savedPlans: [
            plan,
            ...state.savedPlans.filter((saved) => saved.id !== plan.id),
          ].slice(0, 6),
        })),
      setDashboardDraft: (plan) =>
        set({
          latestPlan: plan,
          dashboardDraft: {
            planId: plan.id,
            planLabel: plan.goalLabel,
            blocks: plan.blocks,
            nextIndex: 0,
          },
        }),
      advanceDashboardDraft: () =>
        set((state) => {
          if (!state.dashboardDraft) return state;
          const nextIndex = state.dashboardDraft.nextIndex + 1;

          return {
            dashboardDraft:
              nextIndex >= state.dashboardDraft.blocks.length
                ? null
                : { ...state.dashboardDraft, nextIndex },
          };
        }),
      clearDashboardDraft: () => set({ dashboardDraft: null }),
    }),
    {
      name: "nivesh-ladder-plans",
      version: 1,
      partialize: (state) => ({
        latestPlan: state.latestPlan,
        savedPlans: state.savedPlans,
        dashboardDraft: state.dashboardDraft,
      }),
    }
  )
);
