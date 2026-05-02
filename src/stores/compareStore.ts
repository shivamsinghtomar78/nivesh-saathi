"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CompareSnapshot = {
  amount: number;
  tenorMonths: number;
  bankType: "all" | "public" | "private" | "small-finance";
  seniorCitizen: boolean;
  topBanks: Array<{
    bankId: string;
    bankName: string;
    ratePercent: number;
    maturityAmount?: number;
  }>;
  updatedAt: string;
};

type CompareStore = {
  shortlist: string[];
  lastCompareSnapshot: CompareSnapshot | null;
  toggleShortlist: (bankId: string) => void;
  setLastCompareSnapshot: (snapshot: CompareSnapshot) => void;
  clearShortlist: () => void;
};

export const useCompareStore = create<CompareStore>()(
  persist(
    (set, get) => ({
      shortlist: [],
      lastCompareSnapshot: null,
      toggleShortlist: (bankId) => {
        const shortlist = get().shortlist;
        set({
          shortlist: shortlist.includes(bankId)
            ? shortlist.filter((id) => id !== bankId)
            : [...shortlist, bankId],
        });
      },
      setLastCompareSnapshot: (snapshot) => set({ lastCompareSnapshot: snapshot }),
      clearShortlist: () => set({ shortlist: [] }),
    }),
    {
      name: "nivesh-shortlist",
    }
  )
);
