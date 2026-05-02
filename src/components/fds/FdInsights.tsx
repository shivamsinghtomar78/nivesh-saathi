"use client";

import { Lightbulb, Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type FdInsightsProps = {
  insights: string[];
};

export function FdInsights({ insights }: FdInsightsProps) {
  return (
    <Card className="border-outline bg-panel p-5 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <CardTitle className="text-base">Smart Insights</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="mt-0 grid gap-3">
        {insights.map((insight) => (
          <div
            key={insight}
            className="rounded-[var(--radius-panel)] border border-outline bg-inner-panel p-4"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-accent/20 bg-accent-soft text-accent">
                <Lightbulb className="h-4 w-4" />
              </div>
              <p className="text-sm font-medium leading-6 text-text-strong">
                {insight}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
