import {
  addDaysToDateKey,
  getIndiaDateKey,
} from "@/lib/fd-tracker/calculations";
import type { FdAlertMilestone } from "@/lib/fd-tracker/types";

export type FdAlertTarget = {
  milestone: FdAlertMilestone;
  flag: "alert7Sent" | "alert1Sent" | "alertTodaySent";
  dateKey: string;
  label: string;
};

export function getFdAlertTargets(now = new Date()): FdAlertTarget[] {
  const todayKey = getIndiaDateKey(now);

  return [
    {
      milestone: "7_days",
      flag: "alert7Sent",
      dateKey: addDaysToDateKey(todayKey, 7),
      label: "in 7 days",
    },
    {
      milestone: "1_day",
      flag: "alert1Sent",
      dateKey: addDaysToDateKey(todayKey, 1),
      label: "tomorrow",
    },
    {
      milestone: "today",
      flag: "alertTodaySent",
      dateKey: todayKey,
      label: "today",
    },
  ];
}
