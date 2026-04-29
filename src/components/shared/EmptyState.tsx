"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
  children?: React.ReactNode;
}

export default function EmptyState({
  icon: Icon,
  title,
  body,
  ctaLabel,
  onCtaClick,
  children,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="flex flex-col items-center justify-center text-center py-16 px-6"
    >
      <div className="w-16 h-16 rounded-full bg-accent-soft flex items-center justify-center mb-5">
        <Icon className="w-7 h-7 text-accent" />
      </div>
      <h3 className="text-xl font-semibold text-text-strong mb-2">{title}</h3>
      <p className="text-sm text-text-muted max-w-md leading-relaxed">{body}</p>
      {ctaLabel && onCtaClick && (
        <Button
          variant="secondary"
          className="mt-6 rounded-full shadow-sm"
          onClick={onCtaClick}
        >
          {ctaLabel}
        </Button>
      )}
      {children && <div className="mt-6 w-full max-w-md">{children}</div>}
    </motion.div>
  );
}
