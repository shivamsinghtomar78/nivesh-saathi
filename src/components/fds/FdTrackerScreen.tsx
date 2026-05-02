"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Plus, RefreshCcw, WalletCards } from "lucide-react";

import AppShell from "@/components/app/AppShell";
import AuthGate from "@/components/auth/AuthGate";
import { FdDashboard } from "@/components/fds/FdDashboard";
import { FdEntryModal } from "@/components/fds/FdEntryModal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { FdDashboardDto } from "@/lib/fd-tracker/types";
import { useAuthStore } from "@/stores/authStore";
import { useLadderStore } from "@/stores/ladderStore";

export default function FdTrackerScreen() {
  const user = useAuthStore((state) => state.user);
  const dashboardDraft = useLadderStore((state) => state.dashboardDraft);
  const advanceDashboardDraft = useLadderStore((state) => state.advanceDashboardDraft);
  const [dashboard, setDashboard] = useState<FdDashboardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(true);

  const loadDashboard = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/fds/dashboard");
      const payload = (await response.json()) as {
        dashboard?: FdDashboardDto;
        error?: string;
      };

      if (!response.ok || !payload.dashboard) {
        throw new Error(payload.error || "Unable to load FD dashboard");
      }

      setDashboard(payload.dashboard);
    } catch (caught) {
      setDashboard(null);
      setError(
        caught instanceof Error ? caught.message : "Unable to load FD dashboard"
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadDashboard]);

  useEffect(() => {
    if (dashboardDraft) {
      const timer = window.setTimeout(() => setIsModalOpen(true), 0);
      return () => window.clearTimeout(timer);
    }
  }, [dashboardDraft]);

  const draftBlock = dashboardDraft?.blocks[dashboardDraft.nextIndex] ?? null;
  const entryDraft = useMemo(
    () =>
      draftBlock && dashboardDraft
        ? {
            draftKey: draftBlock.id,
            sourceLabel: `${dashboardDraft.planLabel} ladder block ${draftBlock.sequence} of ${dashboardDraft.blocks.length}`,
            amount: String(draftBlock.amount),
            bankName: "",
            fdType: "Ladder FD",
            interestRate: draftBlock.ratePercent.toFixed(2),
            maturityDate: draftBlock.maturityDate,
            notes: `${dashboardDraft.planLabel} ladder - ${draftBlock.label}, ${draftBlock.tenureMonths} month block.`,
            payoutFrequency: "cumulative" as const,
            startDate: new Date().toISOString().slice(0, 10),
          }
        : null,
    [dashboardDraft, draftBlock]
  );

  return (
    <AppShell
      eyebrow="FD Tracker"
      title="Dashboard"
      description="Capture deposits fast, understand upcoming cash flow, and get smart reminders before maturity."
      actions={
        user ? (
          <>
            <Button variant="outline" onClick={() => void loadDashboard()}>
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Add FD
            </Button>
          </>
        ) : null
      }
    >
      <AuthGate
        title="Sign in to track your FDs"
        body="Your deposits, maturity alerts, and notification tokens stay tied to your secure profile."
      >
        {loading ? (
          <div className="grid gap-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <Card key={index} className="h-32 animate-pulse bg-panel-glass p-5 shadow-sm">
                  <div className="h-full rounded-[var(--radius-panel)] bg-inner-panel/60" />
                </Card>
              ))}
            </div>
            <Card className="h-96 animate-pulse bg-panel-glass p-5 shadow-sm">
              <div className="h-full rounded-[var(--radius-panel)] bg-inner-panel/60" />
            </Card>
          </div>
        ) : error ? (
          <Card className="border-danger/25 bg-danger/10 p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-danger/25 bg-danger/10 text-danger">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-text-strong">
                    FD tracker needs attention
                  </h2>
                  <p className="mt-1 text-sm text-text-muted">{error}</p>
                </div>
              </div>
              <Button variant="outline" onClick={() => void loadDashboard()}>
                Try again
              </Button>
            </div>
          </Card>
        ) : dashboard ? (
          <FdDashboard
            dashboard={dashboard}
            onAdd={() => setIsModalOpen(true)}
            onRefresh={() => void loadDashboard()}
          />
        ) : (
          <Card className="p-10 text-center">
            <WalletCards className="mx-auto h-8 w-8 text-accent" />
            <p className="mt-4 text-sm text-text-muted">
              Your FD tracker is ready.
            </p>
          </Card>
        )}

        <FdEntryModal
          draft={entryDraft}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSaved={() => {
            void loadDashboard();
            if (!dashboardDraft) return;

            const hasNextBlock =
              dashboardDraft.nextIndex + 1 < dashboardDraft.blocks.length;
            advanceDashboardDraft();
            if (hasNextBlock) {
              window.setTimeout(() => setIsModalOpen(true), 240);
            }
          }}
        />
      </AuthGate>
    </AppShell>
  );
}
