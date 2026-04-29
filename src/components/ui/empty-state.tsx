"use client";

import { ReactNode } from "react";
import { FolderOpen } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ 
  title, 
  description, 
  icon = <FolderOpen className="w-5 h-5 text-text-muted" />,
  action 
}: EmptyStateProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      <Card className="p-10 border-dashed border-outline bg-panel-glass text-center shadow-none hover:shadow-sm transition-shadow duration-300">
        <CardHeader>
          <div className="w-12 h-12 rounded-full bg-outline/20 mx-auto flex items-center justify-center mb-4">
            {icon}
          </div>
          <CardTitle className="text-xl font-semibold text-text-strong">{title}</CardTitle>
          <CardDescription className="max-w-md mx-auto mt-2 leading-relaxed">
            {description}
          </CardDescription>
          {action && (
            <div className="mt-6 flex justify-center">
              {action}
            </div>
          )}
        </CardHeader>
      </Card>
    </motion.div>
  );
}
