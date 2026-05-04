"use client";

import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";

interface VoiceSummaryCardProps {
  summary: string;
  topRates: { bankName: string; rate: string }[];
  onClose: () => void;
}

export function VoiceSummaryCard({ summary, topRates, onClose }: VoiceSummaryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 backdrop-blur-sm tablet:p-4"
      onClick={onClose}
    >
      <Card 
      className="max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-hidden border-accent bg-panel shadow-[var(--shadow-card-hover)]"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="bg-surface-dark pb-6 text-center">
          <motion.div 
            initial={{ scale: 0 }} 
            animate={{ scale: 1 }} 
            transition={{ type: "spring", delay: 0.2 }}
            className="mx-auto w-12 h-12 bg-accent rounded-full flex items-center justify-center mb-3"
          >
            <CheckCircle2 className="w-6 h-6 text-on-accent" />
          </motion.div>
          <CardTitle className="text-xl text-on-dark">Session Summary</CardTitle>
        </CardHeader>
        
        <CardContent className="custom-scrollbar max-h-[55dvh] space-y-6 overflow-y-auto pt-6">
          <p className="text-text-strong text-sm leading-relaxed text-center">
            {summary || "Here is a quick recap of what we just discussed."}
          </p>

          {topRates && topRates.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted text-center">Top Rates Discussed</h4>
              <div className="grid gap-2">
                {topRates.map((rate, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + (i * 0.1) }}
                    className="flex items-center justify-between gap-3 rounded-lg border border-outline bg-input-bg p-3"
                  >
                    <span className="min-w-0 break-words font-medium text-text-strong">{rate.bankName}</span>
                    <span className="shrink-0 font-bold text-highlight">{rate.rate}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3 px-4 pb-5 pt-2 tablet:flex-row tablet:px-6 tablet:pb-6">
          <Button variant="outline" className="w-full tablet:flex-1" onClick={onClose}>
            Close
          </Button>
          <Link href={ROUTES.COMPARE} className="w-full tablet:flex-1">
          <Button className="w-full">
              Compare Rates <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
