"use client";

import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ShieldAlert, Info } from "lucide-react";
import type { PortfolioSplit } from "@/lib/server/advisor-schemas";

interface PortfolioSplitCardProps {
  split: PortfolioSplit;
}

const COLORS = ["#d7b66d", "#a7aaa7", "#6dbba1", "#8d7a58", "#caa15f"];

export function PortfolioSplitCard({ split }: PortfolioSplitCardProps) {
  const chartData = split.allocations.map((alloc, i) => ({
    name: alloc.bankName,
    value: alloc.allocationAmount,
    color: COLORS[i % COLORS.length],
  }));

  return (
    <Card className="w-full overflow-hidden border-outline bg-panel shadow-sm tablet:max-w-sm">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2 text-text-strong">
              Portfolio Diversification
            </CardTitle>
            <CardDescription className="text-xs text-text-muted mt-1">
              Optimized for DICGC Safety Limit
            </CardDescription>
          </div>
          <ShieldAlert className="w-5 h-5 text-success" />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 pt-2">
        <div className="h-40 w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={65}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: unknown) => `Rs ${Number(value ?? 0).toLocaleString("en-IN")}`}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
            </PieChart>
          </ResponsiveContainer>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] text-text-muted font-medium">Blended</span>
            <span className="text-lg font-bold text-text-strong leading-none">{split.blendedRate.toFixed(2)}%</span>
          </div>
        </div>

        <div className="space-y-2">
          {split.allocations.map((alloc, i) => (
            <motion.div 
              key={alloc.bankId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center justify-between gap-3 rounded-md border border-outline bg-input-bg p-2 text-sm"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="font-medium text-text-strong truncate">{alloc.bankName}</span>
              </div>
              <div className="max-w-[45%] shrink-0 text-right">
                <div className="break-words font-semibold text-text-strong">Rs {alloc.allocationAmount.toLocaleString("en-IN")}</div>
                <div className="text-[10px] text-highlight font-medium">@{alloc.rate.toFixed(2)}%</div>
              </div>
            </motion.div>
          ))}
        </div>
        
            <div className="flex items-start gap-2 rounded-[var(--radius-input)] bg-accent-warm-soft p-3 text-xs text-accent-warm">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <p>By splitting your investment, you maximize returns while keeping deposits in each bank fully insured under the Rs 5L DICGC limit.</p>
        </div>
      </CardContent>
    </Card>
  );
}
