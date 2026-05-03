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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <Card 
      className="w-full max-w-md overflow-hidden border-accent bg-panel shadow-[var(--shadow-card-hover)]"
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
        
        <CardContent className="pt-6 space-y-6">
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
                    className="flex justify-between items-center p-3 rounded-lg bg-input-bg border border-outline"
                  >
                    <span className="font-medium text-text-strong">{rate.bankName}</span>
                    <span className="font-bold text-highlight">{rate.rate}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex gap-3 pt-2 pb-6 px-6">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Close
          </Button>
          <Link href={ROUTES.COMPARE} className="flex-1">
          <Button className="w-full">
              Compare Rates <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
