"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  FileScan,
  IndianRupee,
  Landmark,
  Loader2,
  Percent,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { withCsrfHeaders } from "@/lib/csrf";
import type { FdPayoutFrequency, FdRecordDto } from "@/lib/fd-tracker/types";
import { cn } from "@/lib/utils";

type FdEntryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (record: FdRecordDto) => void;
};

type FormState = {
  amount: string;
  bankName: string;
  fdType: string;
  interestRate: string;
  maturityDate: string;
  nominee: string;
  notes: string;
  payoutFrequency: FdPayoutFrequency;
  startDate: string;
};

const payoutOptions: Array<{ label: string; value: FdPayoutFrequency }> = [
  { label: "Cumulative", value: "cumulative" },
  { label: "Monthly", value: "monthly" },
  { label: "Quarterly", value: "quarterly" },
  { label: "Half-yearly", value: "half-yearly" },
  { label: "Annual", value: "annual" },
];

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getInitialForm(): FormState {
  const start = new Date();
  const maturity = new Date();
  maturity.setFullYear(maturity.getFullYear() + 1);

  return {
    amount: "",
    bankName: "",
    fdType: "",
    interestRate: "",
    maturityDate: dateKey(maturity),
    nominee: "",
    notes: "",
    payoutFrequency: "cumulative",
    startDate: dateKey(start),
  };
}

function normalizePayoutFrequency(value?: string | null): FdPayoutFrequency {
  const clean = value?.toLowerCase().replace(/\s+/g, "-") ?? "";
  if (clean.includes("month")) return "monthly";
  if (clean.includes("quarter")) return "quarterly";
  if (clean.includes("half")) return "half-yearly";
  if (clean.includes("annual") || clean.includes("year")) return "annual";
  return "cumulative";
}

function isDateKey(value?: string | null) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export function FdEntryModal({ isOpen, onClose, onSaved }: FdEntryModalProps) {
  const [form, setForm] = useState<FormState>(() => getInitialForm());
  const [showOptional, setShowOptional] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const [sourceType, setSourceType] = useState<"manual" | "ocr">("manual");
  const [ocrRawData, setOcrRawData] = useState<unknown>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSave = useMemo(
    () =>
      form.bankName.trim().length >= 2 &&
      Number(form.amount) > 0 &&
      Number(form.interestRate) >= 0 &&
      Boolean(form.startDate) &&
      Boolean(form.maturityDate),
    [form]
  );

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleOcrFile(file: File) {
    const formData = new FormData();
    formData.append("receipt", file);
    setOcrLoading(true);

    try {
      const response = await fetch("/api/fds/ocr", {
        method: "POST",
        headers: withCsrfHeaders(),
        body: formData,
      });
      const payload = (await response.json()) as {
        fields?: {
          amount?: number | null;
          bankName?: string | null;
          fdType?: string | null;
          interestRate?: number | null;
          maturityDate?: string | null;
          nominee?: string | null;
          notes?: string | null;
          payoutFrequency?: string | null;
          startDate?: string | null;
        };
        confidence?: number | null;
        rawData?: unknown;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "OCR failed");
      }

      setForm((current) => ({
        ...current,
        amount: payload.fields?.amount ? String(payload.fields.amount) : current.amount,
        bankName: payload.fields?.bankName || current.bankName,
        fdType: payload.fields?.fdType || current.fdType,
        interestRate: payload.fields?.interestRate
          ? String(payload.fields.interestRate)
          : current.interestRate,
        maturityDate: isDateKey(payload.fields?.maturityDate)
          ? String(payload.fields?.maturityDate)
          : current.maturityDate,
        nominee: payload.fields?.nominee || current.nominee,
        notes: payload.fields?.notes || current.notes,
        payoutFrequency: normalizePayoutFrequency(payload.fields?.payoutFrequency),
        startDate: isDateKey(payload.fields?.startDate)
          ? String(payload.fields?.startDate)
          : current.startDate,
      }));
      setOcrConfidence(payload.confidence ?? null);
      setOcrRawData(payload.rawData ?? null);
      setSourceType("ocr");
      setShowOptional(true);
      toast.success("Receipt scanned. Review the autofilled values before saving.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to scan receipt");
    } finally {
      setOcrLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleSave() {
    if (!canSave || saving) return;

    setSaving(true);
    try {
      const response = await fetch("/api/fds", {
        method: "POST",
        headers: withCsrfHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          bankName: form.bankName,
          amount: Number(form.amount),
          interestRate: Number(form.interestRate),
          startDate: form.startDate,
          maturityDate: form.maturityDate,
          fdType: form.fdType || null,
          payoutFrequency: form.payoutFrequency,
          notes: form.notes || null,
          nominee: form.nominee || null,
          sourceType,
          receiptUrl: null,
          ocrConfidence,
          ocrRawData,
        }),
      });
      const payload = (await response.json()) as {
        record?: FdRecordDto;
        error?: string;
      };

      if (!response.ok || !payload.record) {
        throw new Error(payload.error || "Unable to save FD");
      }

      toast.success("FD saved to your tracker");
      onSaved(payload.record);
      setForm(getInitialForm());
      setSourceType("manual");
      setOcrConfidence(null);
      setOcrRawData(null);
      setShowOptional(false);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save FD");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.button
            type="button"
            aria-label="Close FD form"
            className="fixed inset-0 z-[70] bg-black/65 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="fd-entry-title"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className="fixed inset-x-3 bottom-3 top-16 z-[80] mx-auto flex max-w-3xl flex-col overflow-hidden rounded-[var(--radius-card)] border border-outline bg-panel shadow-[var(--shadow-card)] sm:inset-x-6 sm:bottom-auto sm:top-20 sm:max-h-[calc(100vh-7rem)]"
          >
            <div className="border-b border-outline bg-panel-glass px-5 py-4 backdrop-blur-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                    Quick FD capture
                  </p>
                  <h2
                    id="fd-entry-title"
                    className="mt-1 text-2xl font-semibold text-text-strong"
                  >
                    Add a fixed deposit
                  </h2>
                  <p className="mt-1 text-sm text-text-muted">
                    Start with essentials. Scan only if it saves time.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-outline bg-input-bg text-text-muted hover:border-accent/35 hover:text-text-strong"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="custom-scrollbar flex-1 overflow-y-auto px-5 py-5">
              {ocrConfidence !== null ? (
                <div className="mb-4 rounded-[var(--radius-panel)] border border-accent/20 bg-accent-soft px-4 py-3 text-sm text-text-strong">
                  <div className="flex items-center gap-2 font-semibold">
                    <Sparkles className="h-4 w-4 text-accent" />
                    OCR filled this form. Confidence: {Math.round(ocrConfidence * 100)}%
                  </div>
                  <p className="mt-1 text-xs text-text-muted">
                    Please review every value before saving.
                  </p>
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 sm:col-span-2">
                  <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                    <Landmark className="h-3.5 w-3.5 text-accent" />
                    Bank name
                  </span>
                  <input
                    value={form.bankName}
                    onChange={(event) => updateField("bankName", event.target.value)}
                    placeholder="HDFC Bank"
                    className="min-h-12 rounded-[var(--radius-input)] border border-outline bg-input-bg px-4 text-sm font-medium text-text-strong outline-none focus:border-accent"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                    <IndianRupee className="h-3.5 w-3.5 text-accent" />
                    FD amount
                  </span>
                  <input
                    type="number"
                    min="1"
                    value={form.amount}
                    onChange={(event) => updateField("amount", event.target.value)}
                    placeholder="50000"
                    className="financial-value min-h-12 rounded-[var(--radius-input)] border border-outline bg-input-bg px-4 text-sm font-semibold text-text-strong outline-none focus:border-accent"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                    <Percent className="h-3.5 w-3.5 text-accent" />
                    Interest rate
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="25"
                    step="0.01"
                    value={form.interestRate}
                    onChange={(event) =>
                      updateField("interestRate", event.target.value)
                    }
                    placeholder="7.25"
                    className="financial-value min-h-12 rounded-[var(--radius-input)] border border-outline bg-input-bg px-4 text-sm font-semibold text-text-strong outline-none focus:border-accent"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                    <CalendarDays className="h-3.5 w-3.5 text-accent" />
                    Start date
                  </span>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(event) => updateField("startDate", event.target.value)}
                    className="min-h-12 rounded-[var(--radius-input)] border border-outline bg-input-bg px-4 text-sm font-medium text-text-strong outline-none focus:border-accent"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                    <CalendarDays className="h-3.5 w-3.5 text-accent" />
                    Maturity date
                  </span>
                  <input
                    type="date"
                    value={form.maturityDate}
                    onChange={(event) =>
                      updateField("maturityDate", event.target.value)
                    }
                    className="min-h-12 rounded-[var(--radius-input)] border border-outline bg-input-bg px-4 text-sm font-medium text-text-strong outline-none focus:border-accent"
                  />
                </label>
              </div>

              <div className="mt-5 flex flex-col gap-3 rounded-[var(--radius-panel)] border border-outline bg-inner-panel p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-text-strong">
                    Optional receipt scan
                  </p>
                  <p className="text-xs text-text-muted">
                    Auto-fill visible values, then edit before saving.
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void handleOcrFile(file);
                  }}
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={ocrLoading}
                  className="shrink-0"
                >
                  {ocrLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileScan className="h-4 w-4" />
                  )}
                  Scan receipt
                </Button>
              </div>

              <button
                type="button"
                onClick={() => setShowOptional((current) => !current)}
                className="mt-4 text-sm font-semibold text-accent hover:text-accent-hover"
              >
                {showOptional ? "Hide optional details" : "Add optional details"}
              </button>

              <AnimatePresence initial={false}>
                {showOptional ? (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <label className="grid gap-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                          FD type
                        </span>
                        <input
                          value={form.fdType}
                          onChange={(event) =>
                            updateField("fdType", event.target.value)
                          }
                          placeholder="Regular / Tax saver"
                          className="min-h-11 rounded-[var(--radius-input)] border border-outline bg-input-bg px-4 text-sm text-text-strong outline-none focus:border-accent"
                        />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                          Payout frequency
                        </span>
                        <select
                          value={form.payoutFrequency}
                          onChange={(event) =>
                            updateField(
                              "payoutFrequency",
                              event.target.value as FdPayoutFrequency
                            )
                          }
                          className="custom-select min-h-11 rounded-[var(--radius-input)] border border-outline bg-input-bg px-4 text-sm text-text-strong outline-none focus:border-accent"
                        >
                          {payoutOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                          Nominee
                        </span>
                        <input
                          value={form.nominee}
                          onChange={(event) =>
                            updateField("nominee", event.target.value)
                          }
                          placeholder="Nominee name"
                          className="min-h-11 rounded-[var(--radius-input)] border border-outline bg-input-bg px-4 text-sm text-text-strong outline-none focus:border-accent"
                        />
                      </label>
                      <label className="grid gap-2 sm:col-span-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                          Notes
                        </span>
                        <textarea
                          value={form.notes}
                          onChange={(event) =>
                            updateField("notes", event.target.value)
                          }
                          rows={3}
                          placeholder="Renewal preference, receipt reference, or branch note"
                          className="resize-none rounded-[var(--radius-input)] border border-outline bg-input-bg px-4 py-3 text-sm text-text-strong outline-none focus:border-accent"
                        />
                      </label>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            <div className="border-t border-outline bg-panel-glass px-5 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-text-muted">
                  Alerts will be scheduled for 7 days before, 1 day before, and
                  maturity day.
                </p>
                <div className="flex gap-3">
                  <Button variant="ghost" onClick={onClose}>
                    Later
                  </Button>
                  <Button
                    onClick={() => void handleSave()}
                    disabled={!canSave || saving}
                    className={cn("min-w-32", saving && "opacity-80")}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Save FD
                  </Button>
                </div>
              </div>
            </div>
          </motion.section>
        </>
      ) : null}
    </AnimatePresence>
  );
}
