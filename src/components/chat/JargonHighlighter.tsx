"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, X } from "lucide-react";

// Import the jargon catalog for lookup
import { JARGON_DICTIONARY } from "@/lib/jargon";

interface JargonHighlighterProps {
  text: string;
  className?: string;
}

/**
 * F-05: Contextual Jargon Auto-Detection
 * 
 * Scans assistant message text for known financial jargon terms
 * and renders them as clickable inline chips. Clicking opens a 
 * micro-tooltip with the definition, without page navigation.
 */
export function JargonHighlighter({ text, className }: JargonHighlighterProps) {
  const [activeTerm, setActiveTerm] = useState<string | null>(null);

  // Build a map of term patterns to definitions from JARGON_DICTIONARY
  const jargonMap = useMemo(() => {
    const map = new Map<string, { term: string; definition: string; example: string }>();

    // Map dictionary entries to searchable patterns
    const patternsByKey: Record<string, string[]> = {
      "pa": ["p.a.", "per annum"],
      "dicgc": ["DICGC", "dicgc"],
      "tds": ["TDS", "tds"],
      "maturity": ["maturity"],
      "tenor": ["tenor", "tenure"],
      "compound-interest": ["compound interest", "compounding"],
      "small-finance-bank": ["small finance bank"],
      "form-15g": ["Form 15G", "Form 15H", "15G", "15H"],
    };

    for (const entry of JARGON_DICTIONARY) {
      const patterns = patternsByKey[entry.id] || [entry.termEn.toLowerCase()];
      for (const pattern of patterns) {
        map.set(pattern.toLowerCase(), {
          term: entry.termEn,
          definition: entry.plainEn,
          example: entry.exampleEn,
        });
      }
    }

    // Add extra built-in terms not in the dictionary
    const extras: Record<string, { term: string; def: string; ex: string; patterns: string[] }> = {
      kyc: { term: "KYC", def: "Know Your Customer: identity verification required to open an FD.", ex: "You need Aadhaar + PAN for KYC.", patterns: ["kyc"] },
      senior: { term: "Senior Citizen", def: "People aged 60+ get 0.25%-0.75% extra FD interest.", ex: "SBI gives 8% to seniors vs 7.5% regular.", patterns: ["senior citizen"] },
    };
    for (const extra of Object.values(extras)) {
      for (const p of extra.patterns) {
        map.set(p.toLowerCase(), { term: extra.term, definition: extra.def, example: extra.ex });
      }
    }

    return map;
  }, []);

  // Find all jargon matches in the text and their positions
  const segments = useMemo(() => {
    if (jargonMap.size === 0) return [{ text, isJargon: false, term: "" }];

    const matches: { start: number; end: number; term: string; pattern: string }[] = [];
    const lowerText = text.toLowerCase();

    for (const [pattern] of jargonMap) {
      let searchFrom = 0;
      while (searchFrom < lowerText.length) {
        const idx = lowerText.indexOf(pattern, searchFrom);
        if (idx === -1) break;

        // Check word boundary (avoid matching inside longer words)
        const before = idx > 0 ? lowerText[idx - 1] : " ";
        const after = idx + pattern.length < lowerText.length ? lowerText[idx + pattern.length] : " ";
        const isBoundary =
          /[\s,.;:!?()\-\/]/.test(before) || idx === 0;
        const isEndBoundary =
          /[\s,.;:!?()\-\/]/.test(after) || idx + pattern.length === lowerText.length;

        if (isBoundary && isEndBoundary) {
          matches.push({
            start: idx,
            end: idx + pattern.length,
            term: pattern,
            pattern,
          });
        }
        searchFrom = idx + pattern.length;
      }
    }

    // Sort by position and deduplicate overlapping
    matches.sort((a, b) => a.start - b.start);
    const deduped: typeof matches = [];
    for (const match of matches) {
      if (deduped.length === 0 || match.start >= deduped[deduped.length - 1].end) {
        deduped.push(match);
      }
    }

    // Build segments
    const result: { text: string; isJargon: boolean; term: string }[] = [];
    let cursor = 0;
    for (const match of deduped) {
      if (match.start > cursor) {
        result.push({ text: text.slice(cursor, match.start), isJargon: false, term: "" });
      }
      result.push({
        text: text.slice(match.start, match.end),
        isJargon: true,
        term: match.pattern,
      });
      cursor = match.end;
    }
    if (cursor < text.length) {
      result.push({ text: text.slice(cursor), isJargon: false, term: "" });
    }

    return result;
  }, [text, jargonMap]);

  const activeDefinition = activeTerm ? jargonMap.get(activeTerm) : null;

  return (
    <span className={className}>
      {segments.map((segment, i) => {
        if (!segment.isJargon) {
          return <React.Fragment key={i}>{segment.text}</React.Fragment>;
        }

        return (
          <span key={i} className="relative inline">
            <button
              type="button"
              onClick={() =>
                setActiveTerm(activeTerm === segment.term ? null : segment.term)
              }
              className="inline-flex items-center gap-0.5 px-1 py-0 mx-0.5 rounded-md bg-accent/8 text-accent font-medium border border-accent/15 hover:bg-accent/15 hover:border-accent/30 transition-all cursor-help text-inherit leading-inherit"
              style={{ fontSize: "inherit", lineHeight: "inherit" }}
              aria-label={`Explain: ${segment.text}`}
            >
              {segment.text}
              <BookOpen className="h-2.5 w-2.5 opacity-60 shrink-0" />
            </button>

            {/* Micro-tooltip popover */}
            <AnimatePresence>
              {activeTerm === segment.term && activeDefinition && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.95 }}
                  className="absolute left-0 top-full mt-1 z-30 w-64 bg-panel border border-outline rounded-[var(--radius-panel)] p-3 shadow-lg"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 text-accent">
                      <BookOpen className="h-3.5 w-3.5" />
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {activeDefinition.term}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTerm(null)}
                      className="p-0.5 rounded hover:bg-inner-panel"
                    >
                      <X className="h-3 w-3 text-text-muted" />
                    </button>
                  </div>
                  <p className="text-xs text-text-strong leading-relaxed">
                    {activeDefinition.definition}
                  </p>
                  {activeDefinition.example && (
                    <p className="mt-1.5 text-[11px] text-text-muted italic leading-relaxed">
                      Tip: {activeDefinition.example}
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </span>
        );
      })}
    </span>
  );
}
