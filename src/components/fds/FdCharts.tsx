"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarClock, ChartNoAxesCombined, Landmark } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { FdDashboardDto } from "@/lib/fd-tracker/types";
import { formatCurrency } from "@/lib/utils";

const chartColors = ["#d7b66d", "#e4c87e", "#a7aaa7", "#6dbba1", "#8d7a58"];

const tooltipStyle = {
  background: "#151513",
  border: "1px solid rgba(246,240,228,0.12)",
  borderRadius: "8px",
  boxShadow: "0 18px 46px rgba(0,0,0,0.42)",
  color: "#f6f0e4",
  fontSize: "12px",
};

type FdChartsProps = {
  dashboard: FdDashboardDto;
};

export function FdCharts({ dashboard }: FdChartsProps) {
  return (
    <div className="grid gap-5 laptop:grid-cols-[1.2fr_0.8fr]">
      <Card className="border-outline bg-panel-glass p-4 shadow-sm tablet:p-5">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <ChartNoAxesCombined className="h-4 w-4 text-accent" />
            <CardTitle className="text-base">Portfolio Growth</CardTitle>
          </div>
          <CardDescription>
            Projected FD value as deposits approach maturity.
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-0">
          <div className="h-64 w-full tablet:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={dashboard.growthSeries}
                margin={{ bottom: 8, left: -12, right: 12, top: 12 }}
              >
                <CartesianGrid stroke="rgba(225,244,235,0.10)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#a7b7b0", fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#a7b7b0", fontSize: 11 }}
                  tickFormatter={(value: number) =>
                    value >= 100000 ? `${Math.round(value / 100000)}L` : `${value / 1000}K`
                  }
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => [formatCurrency(Number(value ?? 0)), "Value"]}
                  labelStyle={{ color: "#f6f0e4" }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#d7b66d"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 5, fill: "#d7b66d" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-outline bg-panel-glass p-4 shadow-sm tablet:p-5">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-accent" />
            <CardTitle className="text-base">Bank Distribution</CardTitle>
          </div>
          <CardDescription>Where your principal is concentrated.</CardDescription>
        </CardHeader>
        <CardContent className="mt-0">
          <div className="h-64 w-full tablet:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dashboard.bankDistribution}
                  dataKey="amount"
                  nameKey="bankName"
                  innerRadius="58%"
                  outerRadius="84%"
                  paddingAngle={3}
                  stroke="rgba(5,13,11,0.72)"
                  strokeWidth={2}
                >
                  {dashboard.bankDistribution.map((item, index) => (
                    <Cell
                      key={item.bankName}
                      fill={chartColors[index % chartColors.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value, _name, item) => [
                    formatCurrency(Number(value ?? 0)),
                    item.payload.bankName,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid gap-2">
            {dashboard.bankDistribution.slice(0, 4).map((item, index) => (
              <div
                key={item.bankName}
                className="flex items-center justify-between gap-3 rounded-[var(--radius-input)] border border-outline bg-inner-panel px-3 py-2 text-xs"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: chartColors[index % chartColors.length] }}
                  />
                  <span className="truncate text-text-strong">{item.bankName}</span>
                </span>
                <span className="financial-value font-semibold text-text-muted">
                  {item.share}%
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-outline bg-panel-glass p-4 shadow-sm laptop:col-span-2 tablet:p-5">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-accent" />
            <CardTitle className="text-base">Upcoming Maturity Amounts</CardTitle>
          </div>
          <CardDescription>
            Cash flow expected from the next tracked maturity dates.
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-0">
          <div className="h-64 w-full tablet:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dashboard.maturityBars}
                margin={{ bottom: 8, left: -12, right: 12, top: 12 }}
              >
                <CartesianGrid stroke="rgba(225,244,235,0.10)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#a7b7b0", fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#a7b7b0", fontSize: 11 }}
                  tickFormatter={(value: number) =>
                    value >= 100000 ? `${Math.round(value / 100000)}L` : `${value / 1000}K`
                  }
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => [
                    formatCurrency(Number(value ?? 0)),
                    "Maturity",
                  ]}
                />
                <Bar
                  dataKey="amount"
                  fill="#f0bd53"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={44}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
