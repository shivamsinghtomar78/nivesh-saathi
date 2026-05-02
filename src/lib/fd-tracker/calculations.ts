import type {
  FdBankDistributionPoint,
  FdDashboardDto,
  FdGrowthPoint,
  FdRecordDto,
  FdSummary,
  FdUpcomingMaturity,
} from "@/lib/fd-tracker/types";

export const INDIA_TIME_ZONE = "Asia/Kolkata";

const DAY_MS = 24 * 60 * 60 * 1000;

const monthFormatter = new Intl.DateTimeFormat("en-IN", {
  month: "short",
  timeZone: INDIA_TIME_ZONE,
});

function parseDateKey(dateKey: string) {
  const [year = "0", month = "1", day = "1"] = dateKey.split("-");
  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
  };
}

export function dateKeyToUtcDate(dateKey: string) {
  const { day, month, year } = parseDateKey(dateKey);
  return new Date(Date.UTC(year, month - 1, day));
}

export function getIndiaDateKey(value: Date | string = new Date()) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = typeof value === "string" ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: INDIA_TIME_ZONE,
    year: "numeric",
  }).formatToParts(date);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

export function addDaysToDateKey(dateKey: string, days: number) {
  const date = dateKeyToUtcDate(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function daysBetweenDateKeys(startDateKey: string, endDateKey: string) {
  const start = dateKeyToUtcDate(startDateKey).getTime();
  const end = dateKeyToUtcDate(endDateKey).getTime();
  return Math.round((end - start) / DAY_MS);
}

export function calculateExpectedMaturity(input: {
  amount: number;
  interestRate: number;
  startDate: string | Date;
  maturityDate: string | Date;
  payoutFrequency?: string | null;
}) {
  const startKey = getIndiaDateKey(input.startDate);
  const maturityKey = getIndiaDateKey(input.maturityDate);
  const days = Math.max(daysBetweenDateKeys(startKey, maturityKey), 0);
  const years = days / 365;
  const rate = input.interestRate / 100;
  const frequency = input.payoutFrequency ?? "cumulative";
  const maturityAmount =
    frequency === "cumulative"
      ? input.amount * Math.pow(1 + rate / 4, 4 * years)
      : input.amount * (1 + rate * years);

  return {
    expectedMaturityAmount: Math.round(maturityAmount),
    interestEarned: Math.max(0, Math.round(maturityAmount - input.amount)),
  };
}

export function getFdStatus(maturityDate: string | Date, now = new Date()) {
  return daysBetweenDateKeys(getIndiaDateKey(now), getIndiaDateKey(maturityDate)) < 0
    ? "matured"
    : "active";
}

function getStatusLabel(daysLeft: number) {
  if (daysLeft <= 0) return "Today";
  if (daysLeft === 1) return "Tomorrow";
  if (daysLeft <= 7) return `${daysLeft} days left`;
  return "Upcoming";
}

export function toUpcomingMaturity(
  fd: FdRecordDto,
  now = new Date()
): FdUpcomingMaturity {
  const daysLeft = Math.max(
    0,
    daysBetweenDateKeys(getIndiaDateKey(now), getIndiaDateKey(fd.maturityDate))
  );

  return {
    id: fd.id,
    bankName: fd.bankName,
    amount: fd.expectedMaturityAmount,
    maturityDate: fd.maturityDate,
    daysLeft,
    statusLabel: getStatusLabel(daysLeft),
  };
}

function buildSummary(records: FdRecordDto[], now: Date): FdSummary {
  const today = getIndiaDateKey(now);
  const currentMonth = today.slice(0, 7);
  const activeRecords = records.filter((record) => record.status === "active");

  return {
    totalAmount: activeRecords.reduce((sum, record) => sum + record.amount, 0),
    totalExpectedMaturity: activeRecords.reduce(
      (sum, record) => sum + record.expectedMaturityAmount,
      0
    ),
    totalInterestEarned: activeRecords.reduce(
      (sum, record) => sum + record.interestEarned,
      0
    ),
    activeCount: activeRecords.length,
    upcomingThisMonth: activeRecords.filter((record) =>
      getIndiaDateKey(record.maturityDate).startsWith(currentMonth)
    ).length,
  };
}

function buildBankDistribution(
  records: FdRecordDto[]
): FdBankDistributionPoint[] {
  const activeRecords = records.filter((record) => record.status === "active");
  const total = activeRecords.reduce((sum, record) => sum + record.amount, 0);
  const byBank = new Map<string, number>();

  for (const record of activeRecords) {
    byBank.set(record.bankName, (byBank.get(record.bankName) ?? 0) + record.amount);
  }

  return Array.from(byBank.entries())
    .map(([bankName, amount]) => ({
      bankName,
      amount,
      share: total > 0 ? Math.round((amount / total) * 100) : 0,
    }))
    .sort((left, right) => right.amount - left.amount);
}

function buildMaturityBars(records: FdRecordDto[]): FdGrowthPoint[] {
  return records
    .filter((record) => record.status === "active")
    .sort(
      (left, right) =>
        dateKeyToUtcDate(left.maturityDate).getTime() -
        dateKeyToUtcDate(right.maturityDate).getTime()
    )
    .slice(0, 8)
    .map((record) => {
      const date = dateKeyToUtcDate(record.maturityDate);
      return {
        date: record.maturityDate,
        label: `${monthFormatter.format(date)} ${date.getUTCDate()}`,
        value: record.expectedMaturityAmount,
      };
    });
}

function getMonthSteps(startKey: string, endKey: string) {
  const steps: string[] = [];
  const cursor = dateKeyToUtcDate(startKey);
  const end = dateKeyToUtcDate(endKey);

  cursor.setUTCDate(1);
  end.setUTCDate(1);

  while (cursor.getTime() <= end.getTime() && steps.length < 14) {
    steps.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return steps.length > 0 ? steps : [startKey];
}

function valueAtDate(record: FdRecordDto, dateKey: string) {
  const startKey = getIndiaDateKey(record.startDate);
  const maturityKey = getIndiaDateKey(record.maturityDate);

  if (daysBetweenDateKeys(dateKey, startKey) > 0) {
    return 0;
  }

  if (daysBetweenDateKeys(dateKey, maturityKey) <= 0) {
    return record.expectedMaturityAmount;
  }

  const totalDays = Math.max(daysBetweenDateKeys(startKey, maturityKey), 1);
  const elapsedDays = Math.max(daysBetweenDateKeys(startKey, dateKey), 0);
  const progress = Math.min(elapsedDays / totalDays, 1);

  return Math.round(record.amount + record.interestEarned * progress);
}

function buildGrowthSeries(records: FdRecordDto[], now: Date): FdGrowthPoint[] {
  const activeRecords = records.filter((record) => record.status === "active");
  const todayKey = getIndiaDateKey(now);

  if (activeRecords.length === 0) {
    return [];
  }

  const latestMaturity = activeRecords
    .map((record) => getIndiaDateKey(record.maturityDate))
    .sort()
    .at(-1);
  const steps = getMonthSteps(todayKey, latestMaturity ?? todayKey);

  return steps.map((dateKey) => {
    const date = dateKeyToUtcDate(dateKey);

    return {
      date: dateKey,
      label: `${monthFormatter.format(date)} ${date.getUTCFullYear()}`,
      value: activeRecords.reduce(
        (sum, record) => sum + valueAtDate(record, dateKey),
        0
      ),
    };
  });
}

function buildInsights(params: {
  bankDistribution: FdBankDistributionPoint[];
  records: FdRecordDto[];
  summary: FdSummary;
  upcoming: FdUpcomingMaturity[];
}) {
  const insights: string[] = [];
  const nextSeven = params.upcoming.filter((item) => item.daysLeft <= 7);
  const nextSevenAmount = nextSeven.reduce((sum, item) => sum + item.amount, 0);
  const topBank = params.bankDistribution[0];

  if (nextSeven.length > 0) {
    insights.push(`${nextSeven.length} FDs mature in the next 7 days`);
    insights.push(
      `${new Intl.NumberFormat("en-IN", {
        currency: "INR",
        maximumFractionDigits: 0,
        style: "currency",
      }).format(nextSevenAmount)} will mature this week`
    );
  }

  if (topBank) {
    insights.push(`${topBank.bankName} holds ${topBank.share}% of your FD value`);
  }

  if (params.summary.upcomingThisMonth > 0) {
    insights.push("You may want to plan reinvestment this month");
  }

  if (insights.length === 0) {
    insights.push("Add your first FD to unlock maturity insights");
  }

  return insights.slice(0, 4);
}

export function buildFdDashboard(
  records: FdRecordDto[],
  alerts: FdDashboardDto["alerts"] = [],
  now = new Date()
): FdDashboardDto {
  const summary = buildSummary(records, now);
  const bankDistribution = buildBankDistribution(records);
  const upcoming = records
    .filter((record) => record.status === "active")
    .map((record) => toUpcomingMaturity(record, now))
    .sort((left, right) => left.daysLeft - right.daysLeft);

  return {
    records,
    summary,
    growthSeries: buildGrowthSeries(records, now),
    bankDistribution,
    maturityBars: buildMaturityBars(records).map((point) => ({
      amount: point.value,
      date: point.date,
      label: point.label,
    })),
    maturityTimeline: upcoming.slice(0, 10),
    insights: buildInsights({
      bankDistribution,
      records,
      summary,
      upcoming,
    }),
    upcomingMaturities: upcoming.slice(0, 6),
    alerts,
  };
}
