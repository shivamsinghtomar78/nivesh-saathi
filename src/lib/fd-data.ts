export interface FDRate {
  id: string;
  bankName: string;
  bankNameHi: string;
  bankCode: string;
  bankType: "public" | "private" | "small-finance";
  officialUrl: string;
  sourceLabel: string;
  sourceUrl: string;
  asOf: string;
  regularRate: number;
  seniorRate: number;
  minAmount: number;
  maxAmount: number;
  tenorMinMonths: number;
  tenorMaxMonths: number;
  tenorLabel: string;
  compounding: "quarterly" | "monthly" | "annual";
  dicgcInsured: boolean;
  badge?: "best-value" | "popular" | "safe-choice";
  color: string;
}

export const FD_RATE_DATASET = {
  asOf: "2026-04-28",
  sourceLabel: "Demo seed data",
  disclosure:
    "Rates are sample data for the app experience. Verify current rates on the official bank page before acting.",
} as const;

type FDRateSeed = Omit<FDRate, "asOf" | "sourceLabel" | "sourceUrl">;

const FD_RATE_SEEDS: FDRateSeed[] = [
  {
    id: "au-sfb",
    bankName: "AU Small Finance Bank",
    bankNameHi: "AU Small Finance Bank",
    bankCode: "AU",
    bankType: "small-finance",
    officialUrl: "https://www.aubank.in/personal-banking/deposits/fixed-deposit",
    regularRate: 8.0,
    seniorRate: 8.5,
    minAmount: 5000,
    maxAmount: 10000000,
    tenorMinMonths: 12,
    tenorMaxMonths: 36,
    tenorLabel: "1 - 3 Years",
    compounding: "quarterly",
    dicgcInsured: true,
    badge: "best-value",
    color: "#8B5CF6",
  },
  {
    id: "hdfc",
    bankName: "HDFC Bank",
    bankNameHi: "HDFC Bank",
    bankCode: "HDFC",
    bankType: "private",
    officialUrl: "https://www.hdfcbank.com/personal/save/deposits/fixed-deposit",
    regularRate: 7.75,
    seniorRate: 8.25,
    minAmount: 5000,
    maxAmount: 100000000,
    tenorMinMonths: 12,
    tenorMaxMonths: 120,
    tenorLabel: "400 Days",
    compounding: "quarterly",
    dicgcInsured: true,
    badge: "popular",
    color: "#2563EB",
  },
  {
    id: "sbi",
    bankName: "State Bank of India",
    bankNameHi: "State Bank of India",
    bankCode: "SBI",
    bankType: "public",
    officialUrl:
      "https://sbi.co.in/web/personal-banking/investments-deposits/deposits",
    regularRate: 7.5,
    seniorRate: 8.0,
    minAmount: 1000,
    maxAmount: 100000000,
    tenorMinMonths: 12,
    tenorMaxMonths: 120,
    tenorLabel: "1 - 2 Years",
    compounding: "quarterly",
    dicgcInsured: true,
    badge: "safe-choice",
    color: "#1D4ED8",
  },
  {
    id: "kotak",
    bankName: "Kotak Mahindra Bank",
    bankNameHi: "Kotak Mahindra Bank",
    bankCode: "KOTAK",
    bankType: "private",
    officialUrl:
      "https://www.kotak.com/en/personal-banking/deposits/fixed-deposit.html",
    regularRate: 7.25,
    seniorRate: 7.75,
    minAmount: 5000,
    maxAmount: 100000000,
    tenorMinMonths: 7,
    tenorMaxMonths: 120,
    tenorLabel: "1 - 5 Years",
    compounding: "quarterly",
    dicgcInsured: true,
    color: "#EF4444",
  },
  {
    id: "icici",
    bankName: "ICICI Bank",
    bankNameHi: "ICICI Bank",
    bankCode: "ICICI",
    bankType: "private",
    officialUrl:
      "https://www.icicibank.com/personal-banking/deposits/fixed-deposit",
    regularRate: 7.2,
    seniorRate: 7.7,
    minAmount: 10000,
    maxAmount: 100000000,
    tenorMinMonths: 12,
    tenorMaxMonths: 120,
    tenorLabel: "1 - 10 Years",
    compounding: "quarterly",
    dicgcInsured: true,
    color: "#F97316",
  },
  {
    id: "axis",
    bankName: "Axis Bank",
    bankNameHi: "Axis Bank",
    bankCode: "AXIS",
    bankType: "private",
    officialUrl: "https://www.axisbank.com/retail/deposits/fixed-deposits",
    regularRate: 7.15,
    seniorRate: 7.65,
    minAmount: 5000,
    maxAmount: 100000000,
    tenorMinMonths: 12,
    tenorMaxMonths: 120,
    tenorLabel: "1 - 10 Years",
    compounding: "quarterly",
    dicgcInsured: true,
    badge: "popular",
    color: "#EC4899",
  },
  {
    id: "pnb",
    bankName: "Punjab National Bank",
    bankNameHi: "Punjab National Bank",
    bankCode: "PNB",
    bankType: "public",
    officialUrl: "https://www.pnbindia.in/fixed-deposit.html",
    regularRate: 7.25,
    seniorRate: 7.75,
    minAmount: 1000,
    maxAmount: 100000000,
    tenorMinMonths: 12,
    tenorMaxMonths: 120,
    tenorLabel: "2 - 3 Years",
    compounding: "quarterly",
    dicgcInsured: true,
    color: "#4338CA",
  },
  {
    id: "bob",
    bankName: "Bank of Baroda",
    bankNameHi: "Bank of Baroda",
    bankCode: "BOB",
    bankType: "public",
    officialUrl:
      "https://www.bankofbaroda.in/personal-banking/accounts/fixed-deposit",
    regularRate: 7.15,
    seniorRate: 7.65,
    minAmount: 1000,
    maxAmount: 100000000,
    tenorMinMonths: 12,
    tenorMaxMonths: 120,
    tenorLabel: "1 - 3 Years",
    compounding: "quarterly",
    dicgcInsured: true,
    color: "#F59E0B",
  },
];

export const FD_RATES: FDRate[] = FD_RATE_SEEDS.map((rate) => ({
  ...rate,
  asOf: FD_RATE_DATASET.asOf,
  sourceLabel: FD_RATE_DATASET.sourceLabel,
  sourceUrl: rate.officialUrl,
}));
