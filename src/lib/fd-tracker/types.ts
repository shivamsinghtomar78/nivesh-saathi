export type FdPayoutFrequency =
  | "cumulative"
  | "monthly"
  | "quarterly"
  | "half-yearly"
  | "annual";

export type FdSourceType = "manual" | "ocr";

export type FdStatus = "active" | "matured";

export type FdAlertMilestone = "7_days" | "1_day" | "today";

export type FdRecordDto = {
  id: string;
  userId: string;
  bankName: string;
  amount: number;
  interestRate: number;
  startDate: string;
  maturityDate: string;
  expectedMaturityAmount: number;
  interestEarned: number;
  status: FdStatus;
  fdType: string | null;
  payoutFrequency: FdPayoutFrequency;
  notes: string | null;
  nominee: string | null;
  sourceType: FdSourceType;
  receiptUrl: string | null;
  ocrConfidence: number | null;
  alert7Sent: boolean;
  alert1Sent: boolean;
  alertTodaySent: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FdInput = {
  bankName: string;
  amount: number;
  interestRate: number;
  startDate: string;
  maturityDate: string;
  fdType?: string | null;
  payoutFrequency?: FdPayoutFrequency;
  notes?: string | null;
  nominee?: string | null;
  sourceType?: FdSourceType;
  receiptUrl?: string | null;
  ocrConfidence?: number | null;
  ocrRawData?: unknown;
};

export type FdAlertDto = {
  id: string;
  userId: string;
  fdId: string;
  milestone: FdAlertMilestone;
  title: string;
  body: string;
  readAt: string | null;
  sentAt: string;
  pushStatus: "not_configured" | "no_tokens" | "sent" | "partial" | "failed";
};

export type FdSummary = {
  totalAmount: number;
  totalExpectedMaturity: number;
  totalInterestEarned: number;
  activeCount: number;
  upcomingThisMonth: number;
};

export type FdGrowthPoint = {
  label: string;
  date: string;
  value: number;
};

export type FdBankDistributionPoint = {
  bankName: string;
  amount: number;
  share: number;
};

export type FdMaturityBarPoint = {
  label: string;
  date: string;
  amount: number;
};

export type FdUpcomingMaturity = {
  id: string;
  bankName: string;
  amount: number;
  maturityDate: string;
  daysLeft: number;
  statusLabel: string;
};

export type FdDashboardDto = {
  records: FdRecordDto[];
  summary: FdSummary;
  growthSeries: FdGrowthPoint[];
  bankDistribution: FdBankDistributionPoint[];
  maturityBars: FdMaturityBarPoint[];
  maturityTimeline: FdUpcomingMaturity[];
  insights: string[];
  upcomingMaturities: FdUpcomingMaturity[];
  alerts: FdAlertDto[];
};
