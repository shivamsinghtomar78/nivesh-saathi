"use client";

import { useState } from "react";
import type { ComponentType } from "react";
import {
  Banknote,
  Bell,
  CalendarCheck2,
  Landmark,
  Plus,
  Trash2,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";

import { FdMaturityPanel } from "@/components/fds/FdMaturityPanel";
import { FdNotificationPrompt } from "@/components/fds/FdNotificationPrompt";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { withCsrfHeaders } from "@/lib/csrf";
import type { FdDashboardDto, FdRecordDto } from "@/lib/fd-tracker/types";
import { cn, formatCurrency } from "@/lib/utils";

type FdDashboardProps = {
  dashboard: FdDashboardDto;
  onAdd: () => void;
  onRefresh: () => void;
};

type SummaryCardProps = {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  tone?: "accent" | "highlight" | "muted";
};

function SummaryCard({ icon: Icon, label, tone = "accent", value }: SummaryCardProps) {
  return (
    <Card className="border-outline bg-panel-glass p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
            {label}
          </p>
          <p
            className={cn(
              "financial-value mt-3 text-2xl font-semibold text-text-strong",
              tone === "accent" && "text-accent",
              tone === "highlight" && "text-highlight"
            )}
          >
            {value}
          </p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-outline bg-inner-panel text-accent">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function EmptyDashboard({ onAdd }: { onAdd: () => void }) {
  return (
    <EmptyState
      title="Start tracking your FDs"
      description="Add your first fixed deposit and this space becomes a live maturity dashboard with insights, charts, and alerts."
      icon={<WalletCards className="h-5 w-5 text-accent" />}
      action={
        <Button onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Add FD
        </Button>
      }
    />
  );
}

function AlertInbox({
  dashboard,
  onRefresh,
}: {
  dashboard: FdDashboardDto;
  onRefresh: () => void;
}) {
  const [marking, setMarking] = useState(false);

  async function markRead() {
    setMarking(true);
    try {
      await fetch("/api/fds/alerts", {
        method: "PATCH",
        headers: withCsrfHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ markAllRead: true }),
      });
      onRefresh();
    } finally {
      setMarking(false);
    }
  }

  if (dashboard.alerts.length === 0) {
    return null;
  }

  return (
    <Card className="border-highlight/20 bg-highlight-soft p-5 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-highlight" />
            <CardTitle className="text-base">Unread Maturity Alerts</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void markRead()}
            disabled={marking}
          >
            Mark read
          </Button>
        </div>
      </CardHeader>
      <CardContent className="mt-0 grid gap-3">
        {dashboard.alerts.slice(0, 3).map((alert) => (
          <div
            key={alert.id}
            className="rounded-[var(--radius-panel)] border border-outline bg-panel/70 p-3"
          >
            <p className="text-sm font-semibold text-text-strong">{alert.title}</p>
            <p className="mt-1 text-xs text-text-muted">{alert.body}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function FdRecordsTable({
  records,
  onRefresh,
}: {
  records: FdRecordDto[];
  onRefresh: () => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function deleteRecord(record: FdRecordDto) {
    setDeletingId(record.id);
    try {
      const response = await fetch(`/api/fds/${record.id}`, {
        method: "DELETE",
        headers: withCsrfHeaders(),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Unable to delete FD");
      }
      toast.success(`${record.bankName} FD removed`);
      onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete FD");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Card className="border-outline bg-panel p-5 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Landmark className="h-4 w-4 text-accent" />
          <CardTitle className="text-base">Tracked Deposits</CardTitle>
        </div>
        <CardDescription>All active and matured FDs in this module.</CardDescription>
      </CardHeader>
      <CardContent className="mt-0 overflow-x-auto">
        <table className="w-full min-w-[720px] border-separate border-spacing-y-2 text-left text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.16em] text-text-muted">
              <th className="px-3 py-2">Bank</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Rate</th>
              <th className="px-3 py-2">Maturity</th>
              <th className="px-3 py-2">Expected</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id} className="bg-inner-panel text-text-strong">
                <td className="rounded-l-[var(--radius-input)] px-3 py-3 font-semibold">
                  <div className="max-w-[180px] truncate">{record.bankName}</div>
                </td>
                <td className="financial-value px-3 py-3">
                  {formatCurrency(record.amount)}
                </td>
                <td className="financial-value px-3 py-3">
                  {record.interestRate.toFixed(2)}%
                </td>
                <td className="px-3 py-3">
                  {new Intl.DateTimeFormat("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  }).format(new Date(record.maturityDate))}
                </td>
                <td className="financial-value px-3 py-3 font-semibold text-accent">
                  {formatCurrency(record.expectedMaturityAmount)}
                </td>
                <td className="px-3 py-3 capitalize text-text-muted">
                  {record.status}
                </td>
                <td className="rounded-r-[var(--radius-input)] px-3 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => void deleteRecord(record)}
                    disabled={deletingId === record.id}
                    aria-label={`Delete ${record.bankName} FD`}
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export function FdDashboard({ dashboard, onAdd, onRefresh }: FdDashboardProps) {
  const hasRecords = dashboard.records.length > 0;

  if (!hasRecords) {
    return (
      <div className="grid gap-5">
        <FdNotificationPrompt />
        <EmptyDashboard onAdd={onAdd} />
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          icon={Banknote}
          label="Total FD Amount"
          value={formatCurrency(dashboard.summary.totalAmount)}
        />
        <SummaryCard
          icon={TrendingUp}
          label="Expected Maturity"
          tone="highlight"
          value={formatCurrency(dashboard.summary.totalExpectedMaturity)}
        />
        <SummaryCard
          icon={WalletCards}
          label="Interest Earned"
          value={formatCurrency(dashboard.summary.totalInterestEarned)}
        />
        <SummaryCard
          icon={Landmark}
          label="Active FDs"
          tone="muted"
          value={String(dashboard.summary.activeCount)}
        />
        <SummaryCard
          icon={CalendarCheck2}
          label="This Month"
          tone="highlight"
          value={String(dashboard.summary.upcomingThisMonth)}
        />
      </div>

      <FdNotificationPrompt />
      <AlertInbox dashboard={dashboard} onRefresh={onRefresh} />

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="grid gap-5">
          <FdRecordsTable records={dashboard.records} onRefresh={onRefresh} />
        </div>
        <div className="grid gap-5 content-start">
          <FdMaturityPanel items={dashboard.upcomingMaturities} />
        </div>
      </div>
    </div>
  );
}
