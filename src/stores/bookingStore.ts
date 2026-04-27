import { create } from "zustand";

const MAX_BOOKING_AMOUNT = 10000000;

function sanitizeAmount(amount: string) {
  const digitsOnly = amount.replace(/\D/g, "");

  if (!digitsOnly) {
    return "0";
  }

  return String(Math.min(Number(digitsOnly), MAX_BOOKING_AMOUNT));
}

interface BookingState {
  currentStep: number;
  amount: string;
  tenorMonths: number;
  selectedBankId: string | null;
  kycStatus: "none" | "pending" | "verified";
  setStep: (step: number) => void;
  setAmount: (amount: string) => void;
  setTenor: (months: number) => void;
  setBank: (bankId: string) => void;
  setKycStatus: (status: "none" | "pending" | "verified") => void;
  appendDigit: (digit: string) => void;
  deleteDigit: () => void;
  reset: () => void;
}

export const useBookingStore = create<BookingState>((set) => ({
  currentStep: 1,
  amount: "50000",
  tenorMonths: 12,
  selectedBankId: null,
  kycStatus: "none",
  setStep: (step) => set({ currentStep: step }),
  setAmount: (amount) => set({ amount: sanitizeAmount(amount) }),
  setTenor: (months) => set({ tenorMonths: months }),
  setBank: (bankId) => set({ selectedBankId: bankId }),
  setKycStatus: (status) => set({ kycStatus: status }),
  appendDigit: (digit) =>
    set((state) => {
      const baseAmount = state.amount === "0" ? "" : state.amount;
      const nextAmount = sanitizeAmount(baseAmount + digit);
      return { amount: nextAmount };
    }),
  deleteDigit: () =>
    set((state) => ({
      amount: sanitizeAmount(state.amount.slice(0, -1)),
    })),
  reset: () =>
    set({
      currentStep: 1,
      amount: "50000",
      tenorMonths: 12,
      selectedBankId: null,
      kycStatus: "none",
    }),
}));
