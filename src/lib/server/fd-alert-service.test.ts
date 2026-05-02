import { describe, expect, it } from "vitest";

import { getFdAlertTargets } from "@/lib/fd-tracker/alerts";

describe("getFdAlertTargets", () => {
  it("creates the three non-duplicating maturity alert target dates", () => {
    const targets = getFdAlertTargets(new Date("2026-05-02T04:00:00.000Z"));

    expect(targets).toEqual([
      {
        milestone: "7_days",
        flag: "alert7Sent",
        dateKey: "2026-05-09",
        label: "in 7 days",
      },
      {
        milestone: "1_day",
        flag: "alert1Sent",
        dateKey: "2026-05-03",
        label: "tomorrow",
      },
      {
        milestone: "today",
        flag: "alertTodaySent",
        dateKey: "2026-05-02",
        label: "today",
      },
    ]);
  });
});
