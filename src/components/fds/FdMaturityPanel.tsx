"use client";

import { CalendarDays, Clock3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { FdUpcomingMaturity } from "@/lib/fd-tracker/types";
import { cn, formatCurrency } from "@/lib/utils";

type FdMaturityPanelProps = {
  items: FdUpcomingMaturity[];
};

function getStatusTone(statusLabel: string) {
  if (statusLabel === "Today") return "border-danger/25 bg-danger/10 text-danger";
  if (statusLabel === "Tomorrow") return "border-highlight/25 bg-highlight-soft text-highlight";
  if (statusLabel.includes("days")) return "border-accent/25 bg-accent-soft text-accent";
  return "border-outline bg-inner-panel text-text-muted";
}

export function FdMaturityPanel({ items }: FdMaturityPanelProps) {
  return (
    <Card className="border-outline bg-panel p-5 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-accent" />
          <CardTitle className="text-base">Upcoming Maturities</CardTitle>
        </div>
        <CardDescription>Prioritized by days left.</CardDescription>
      </CardHeader>
      <CardContent className="mt-0 grid gap-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.id}
              className="rounded-[var(--radius-panel)] border border-outline bg-inner-panel p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-text-strong">
                    {item.bankName}
                  </p>
                  <p className="financial-value mt-1 text-sm font-medium text-text-muted">
                    {formatCurrency(item.amount)}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={cn("shrink-0", getStatusTone(item.statusLabel))}
                >
                  {item.statusLabel}
                </Badge>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-text-muted">
                <CalendarDays className="h-3.5 w-3.5 text-accent" />
                {new Intl.DateTimeFormat("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }).format(new Date(item.maturityDate))}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[var(--radius-panel)] border border-dashed border-outline bg-inner-panel/50 p-6 text-center text-sm text-text-muted">
            Add an FD to see maturity timing here.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
