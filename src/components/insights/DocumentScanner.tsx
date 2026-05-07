"use client";

import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  CheckCircle2,
  FileText,
  Loader2,
  Sparkles,
  Upload,
  X,
  AlertTriangle,
  IndianRupee,
  Calendar,
  Percent,
  Building2,
  ArrowRight,
  Scan,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { withCsrfHeaders } from "@/lib/csrf";
import { formatCurrency, cn } from "@/lib/utils";

/* ─── Types matching the API response ─── */
type ExtractedDeposit = {
  bankName?: string;
  principal?: number;
  interestRate?: number;
  tenorMonths?: number;
  maturityDate?: string;
  depositDate?: string;
  accountNumber?: string;
  depositorName?: string;
  compounding?: "quarterly" | "monthly" | "annual";
  depositType?: "cumulative" | "non-cumulative";
  seniorCitizen?: boolean;
};

type ExtractionResult = {
  documentType: string;
  confidence: number;
  deposits: ExtractedDeposit[];
  suggestions: string[];
};

type ExtractionApiResponse = {
  ok: boolean;
  extraction?: ExtractionResult;
  fileName?: string;
  fileSize?: number;
  error?: string;
};

type ScanState = "idle" | "uploading" | "scanning" | "done" | "error";

const DOC_TYPE_LABELS: Record<string, string> = {
  fd_receipt: "FD Receipt",
  bank_statement: "Bank Statement",
  fd_certificate: "FD Certificate",
  investment_summary: "Investment Summary",
  unknown: "Document",
};

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const tone =
    pct >= 80 ? "text-success" : pct >= 50 ? "text-highlight" : "text-danger";

  return (
    <Badge
      variant="outline"
      className={cn(
        "border-outline bg-inner-panel text-[10px] font-semibold",
        tone
      )}
    >
      {pct}% confident
    </Badge>
  );
}

function DepositCard({
  deposit,
  index,
}: {
  deposit: ExtractedDeposit;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + index * 0.1 }}
      className="rounded-[var(--radius-panel)] border border-outline bg-inner-panel p-4 transition hover:border-accent/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-accent/20 bg-accent-soft text-accent">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-strong">
              {deposit.bankName || "Unknown Bank"}
            </p>
            {deposit.accountNumber && (
              <p className="text-[10px] text-text-muted font-mono">
                #{deposit.accountNumber}
              </p>
            )}
          </div>
        </div>
        {deposit.seniorCitizen && (
          <Badge
            variant="outline"
            className="bg-highlight-soft text-[9px] text-highlight border-transparent"
          >
            Senior Citizen
          </Badge>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {deposit.principal !== undefined && (
          <div className="flex items-center gap-2">
            <IndianRupee className="h-3.5 w-3.5 text-accent shrink-0" />
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-wider">
                Principal
              </p>
              <p className="financial-value text-sm font-semibold text-text-strong">
                {formatCurrency(deposit.principal)}
              </p>
            </div>
          </div>
        )}

        {deposit.interestRate !== undefined && (
          <div className="flex items-center gap-2">
            <Percent className="h-3.5 w-3.5 text-highlight shrink-0" />
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-wider">
                Rate
              </p>
              <p className="financial-value text-sm font-semibold text-accent">
                {deposit.interestRate}% p.a.
              </p>
            </div>
          </div>
        )}

        {deposit.tenorMonths !== undefined && (
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-text-muted shrink-0" />
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-wider">
                Tenor
              </p>
              <p className="text-sm font-semibold text-text-strong">
                {deposit.tenorMonths} months
              </p>
            </div>
          </div>
        )}

        {deposit.maturityDate && (
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-success shrink-0" />
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-wider">
                Maturity
              </p>
              <p className="text-sm font-semibold text-text-strong">
                {new Intl.DateTimeFormat("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }).format(new Date(deposit.maturityDate))}
              </p>
            </div>
          </div>
        )}
      </div>

      {(deposit.compounding || deposit.depositType) && (
        <div className="mt-3 flex gap-2">
          {deposit.compounding && (
            <Badge variant="outline" className="bg-panel text-[9px] capitalize">
              {deposit.compounding} compounding
            </Badge>
          )}
          {deposit.depositType && (
            <Badge variant="outline" className="bg-panel text-[9px] capitalize">
              {deposit.depositType}
            </Badge>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default function DocumentScanner() {
  const [state, setState] = useState<ScanState>("idle");
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setError(null);
    setResult(null);
    setState("uploading");

    const formData = new FormData();
    formData.append("document", file);

    try {
      setState("scanning");

      const response = await fetch("/api/documents/extract", {
        method: "POST",
        headers: withCsrfHeaders(),
        body: formData,
      });

      const payload = (await response.json()) as ExtractionApiResponse;

      if (!response.ok || !payload.extraction) {
        throw new Error(payload.error || "Failed to extract document data");
      }

      setResult(payload.extraction);
      setState("done");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Document scan failed"
      );
      setState("error");
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) void processFile(file);
    },
    [processFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void processFile(file);
    },
    [processFile]
  );

  const reset = useCallback(() => {
    setState("idle");
    setResult(null);
    setFileName("");
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  return (
    <Card className="relative overflow-hidden border-outline bg-panel shadow-sm">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_10%,rgba(109,187,161,0.06),transparent_50%)]" />

      <CardHeader className="relative z-10 pb-3">
        <div className="flex items-center gap-2">
          <Scan className="h-4 w-4 text-accent" />
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Auto-Onboarding
          </p>
        </div>
        <CardTitle className="mt-2 text-xl">
          Smart Document Scanner
        </CardTitle>
        <CardDescription className="mt-1 max-w-lg">
          Upload a bank statement or FD receipt. Our AI instantly extracts
          deposit details, rates, and maturity dates.
        </CardDescription>
      </CardHeader>

      <CardContent className="relative z-10">
        <AnimatePresence mode="wait">
          {/* ─── IDLE: Upload zone ─── */}
          {state === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={cn(
                  "flex flex-col items-center justify-center gap-4 rounded-[var(--radius-panel)] border-2 border-dashed p-8 transition-all cursor-pointer",
                  dragOver
                    ? "border-accent bg-accent-soft scale-[1.01]"
                    : "border-outline bg-inner-panel/50 hover:border-accent/40 hover:bg-inner-panel"
                )}
                onClick={() => inputRef.current?.click()}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-accent/20 bg-accent-soft/60">
                  <Upload className="h-7 w-7 text-accent" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-text-strong">
                    Drop your document here
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    or click to browse — JPEG, PNG, WebP, PDF up to 5 MB
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge
                    variant="outline"
                    className="bg-panel text-[9px]"
                  >
                    <FileText className="h-3 w-3 mr-1" /> FD Receipts
                  </Badge>
                  <Badge
                    variant="outline"
                    className="bg-panel text-[9px]"
                  >
                    <Camera className="h-3 w-3 mr-1" /> Bank Statements
                  </Badge>
                </div>
              </div>

              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
            </motion.div>
          )}

          {/* ─── SCANNING: Progress state ─── */}
          {(state === "uploading" || state === "scanning") && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-5 rounded-[var(--radius-panel)] border border-accent/20 bg-accent-soft/30 p-10"
            >
              <div className="relative">
                <Loader2 className="h-12 w-12 text-accent animate-spin" />
                <Sparkles className="absolute -right-1 -top-1 h-5 w-5 text-highlight animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-text-strong">
                  {state === "uploading"
                    ? "Uploading document..."
                    : "AI is analyzing your document..."}
                </p>
                <p className="mt-1 text-xs text-text-muted">{fileName}</p>
              </div>

              {/* Scan animation */}
              <div className="w-full max-w-xs h-1 rounded-full bg-outline overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-accent to-highlight rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: "85%" }}
                  transition={{ duration: 4, ease: "easeOut" }}
                />
              </div>
            </motion.div>
          )}

          {/* ─── DONE: Results ─── */}
          {state === "done" && result && (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="grid gap-4"
            >
              {/* Result header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/15 text-success">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-strong">
                      {DOC_TYPE_LABELS[result.documentType] || "Document"} analyzed
                    </p>
                    <p className="text-[11px] text-text-muted">
                      Found {result.deposits.length} deposit
                      {result.deposits.length !== 1 ? "s" : ""} in {fileName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ConfidenceBadge confidence={result.confidence} />
                  <button
                    type="button"
                    onClick={reset}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-outline bg-inner-panel text-text-muted transition hover:text-text-strong"
                    aria-label="Reset"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Extracted deposits */}
              {result.deposits.length > 0 ? (
                <div className="grid gap-3 tablet:grid-cols-2">
                  {result.deposits.map((deposit, i) => (
                    <DepositCard key={i} deposit={deposit} index={i} />
                  ))}
                </div>
              ) : (
                <div className="rounded-[var(--radius-panel)] border border-dashed border-outline bg-inner-panel/50 p-6 text-center">
                  <p className="text-sm text-text-muted">
                    No FD data could be extracted from this document.
                  </p>
                </div>
              )}

              {/* AI Suggestions */}
              {result.suggestions.length > 0 && (
                <div className="grid gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                    AI Suggestions
                  </p>
                  {result.suggestions.map((suggestion, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.1 }}
                      className="flex items-start gap-3 rounded-[var(--radius-panel)] border border-outline bg-panel-strong/70 p-3"
                    >
                      <Sparkles className="h-4 w-4 shrink-0 text-highlight mt-0.5" />
                      <p className="text-sm leading-6 text-text-strong">
                        {suggestion}
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={reset}
                  className="rounded-full"
                >
                  <Upload className="h-4 w-4" />
                  Scan Another
                </Button>
                {result.deposits.length > 0 && (
                  <Button variant="secondary" className="rounded-full">
                    <ArrowRight className="h-4 w-4" />
                    Add to Dashboard
                  </Button>
                )}
              </div>
            </motion.div>
          )}

          {/* ─── ERROR ─── */}
          {state === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 rounded-[var(--radius-panel)] border border-danger/20 bg-danger/5 p-8"
            >
              <AlertTriangle className="h-10 w-10 text-danger" />
              <div className="text-center">
                <p className="text-sm font-semibold text-text-strong">
                  Scan Failed
                </p>
                <p className="mt-1 text-xs text-text-muted">{error}</p>
              </div>
              <Button
                variant="outline"
                onClick={reset}
                className="rounded-full"
              >
                Try Again
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
