"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

/**
 * INV-02: FD Time Machine — Historical Rate Visualizer
 * 
 * Animated line chart showing how FD rates at major banks
 * trended over the last 12 months. Creates a "wow" moment in demos.
 */

// Curated historical data (last 12 months)
const HISTORICAL_DATA = [
  { month: "May 25", au: 7.25, hdfc: 7.10, sbi: 6.80, icici: 7.00 },
  { month: "Jun 25", au: 7.25, hdfc: 7.10, sbi: 6.80, icici: 7.00 },
  { month: "Jul 25", au: 7.50, hdfc: 7.25, sbi: 7.10, icici: 7.10 },
  { month: "Aug 25", au: 7.50, hdfc: 7.25, sbi: 7.10, icici: 7.10 },
  { month: "Sep 25", au: 7.75, hdfc: 7.40, sbi: 7.25, icici: 7.15 },
  { month: "Oct 25", au: 7.75, hdfc: 7.50, sbi: 7.30, icici: 7.15 },
  { month: "Nov 25", au: 7.80, hdfc: 7.50, sbi: 7.30, icici: 7.15 },
  { month: "Dec 25", au: 7.85, hdfc: 7.60, sbi: 7.40, icici: 7.20 },
  { month: "Jan 26", au: 7.90, hdfc: 7.65, sbi: 7.40, icici: 7.20 },
  { month: "Feb 26", au: 7.95, hdfc: 7.70, sbi: 7.45, icici: 7.20 },
  { month: "Mar 26", au: 8.00, hdfc: 7.75, sbi: 7.50, icici: 7.20 },
  { month: "Apr 26", au: 8.00, hdfc: 7.75, sbi: 7.50, icici: 7.20 },
];

const BANK_COLORS: Record<string, string> = {
  au: "#d7b66d",
  hdfc: "#e4c87e",
  sbi: "#a7aaa7",
  icici: "#6dbba1",
};

const BANK_NAMES: Record<string, string> = {
  au: "AU SFB",
  hdfc: "HDFC",
  sbi: "SBI",
  icici: "ICICI",
};

const banks = ["au", "hdfc", "sbi", "icici"] as const;

export function FDTimeMachineChart() {
  const [activeBank, setActiveBank] = useState<string | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="w-full overflow-hidden border-outline bg-panel shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2 text-text-strong">
                <TrendingUp className="h-4 w-4 text-accent" />
                FD Time Machine
              </CardTitle>
              <CardDescription className="text-xs text-text-muted mt-1">
                12-month rate trends across top banks
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {/* Bank filter chips */}
          <div className="custom-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1 tablet:mx-0 tablet:flex-wrap tablet:overflow-visible tablet:px-0 tablet:pb-0">
            {banks.map((bank) => (
              <button
                key={bank}
                type="button"
                onClick={() => setActiveBank(activeBank === bank ? null : bank)}
                className={`min-h-9 shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                  activeBank === bank || !activeBank
                    ? "border-transparent text-[#080806] shadow-sm"
                    : "border-outline bg-inner-panel text-text-muted opacity-50"
                }`}
                style={
                  activeBank === bank || !activeBank
                    ? { backgroundColor: BANK_COLORS[bank] }
                    : {}
                }
              >
                {BANK_NAMES[bank]}
              </button>
            ))}
          </div>

          <div className="h-56 w-full tablet:h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={HISTORICAL_DATA} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(225,244,235,0.10)" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: "#a7b7b0" }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(225,244,235,0.12)" }}
                />
                <YAxis
                  domain={[6.5, 8.5]}
                  tick={{ fontSize: 10, fill: "#a7b7b0" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    background: "#151513",
                    borderRadius: "8px",
                    border: "1px solid rgba(246,240,228,0.12)",
                    boxShadow: "0 18px 46px rgba(0,0,0,0.42)",
                    color: "#f6f0e4",
                    fontSize: "12px",
                  }}
                  formatter={(value: unknown, name: unknown) => [
                    `${Number(value ?? 0).toFixed(2)}%`,
                    BANK_NAMES[String(name)] || String(name),
                  ]}
                />
                <Legend
                  formatter={(value: string) => BANK_NAMES[value] || value}
                  wrapperStyle={{ fontSize: "11px" }}
                />
                {banks.map((bank) => (
                  <Line
                    key={bank}
                    type="monotone"
                    dataKey={bank}
                    stroke={BANK_COLORS[bank]}
                    strokeWidth={activeBank === bank ? 3 : activeBank ? 1 : 2}
                    dot={false}
                    opacity={activeBank && activeBank !== bank ? 0.25 : 1}
                    animationDuration={1500}
                    animationEasing="ease-out"
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <p className="text-[10px] text-text-muted/60 mt-2 text-center italic">
            Historical data curated from public sources. Verify current rates on bank websites.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
