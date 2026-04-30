"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const updateNetworkState = () => setIsOffline(!navigator.onLine);
    const frame = window.requestAnimationFrame(updateNetworkState);

    window.addEventListener("online", updateNetworkState);
    window.addEventListener("offline", updateNetworkState);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("online", updateNetworkState);
      window.removeEventListener("offline", updateNetworkState);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          className="fixed inset-x-0 top-3 z-[70] mx-auto flex w-[calc(100%-2rem)] max-w-xl items-center gap-3 rounded-2xl border border-accent/20 bg-panel px-4 py-3 text-sm text-text-strong shadow-soft backdrop-blur-xl"
          role="status"
          aria-live="polite"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <WifiOff className="h-4 w-4" />
          </span>
          <span>
            You are offline. Cached FD rates and glossary answers will keep working where available.
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
