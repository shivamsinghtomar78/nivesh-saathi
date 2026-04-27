"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type CompareStore = {
  shortlist: string[];
  toggleShortlist: (bankId: string) => void;
  clearShortlist: () => void;
};

export const useCompareStore = create<CompareStore>()(
  persist(
    (set, get) => ({
      shortlist: [],
      toggleShortlist: (bankId) => {
        const shortlist = get().shortlist;
        set({
          shortlist: shortlist.includes(bankId)
            ? shortlist.filter((id) => id !== bankId)
            : [...shortlist, bankId],
        });
      },
      clearShortlist: () => set({ shortlist: [] }),
    }),
    {
      name: "nivesh-shortlist",
    }
  )
);
