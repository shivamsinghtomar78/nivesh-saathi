"use client";

import { Toaster } from "sonner";

import AuthBootstrap from "@/components/providers/AuthBootstrap";
import OfflineBanner from "@/components/providers/OfflineBanner";
import PwaRegistrar from "@/components/providers/PwaRegistrar";

export default function AppProviders() {
  return (
    <>
      <AuthBootstrap />
      <PwaRegistrar />
      <OfflineBanner />
      <Toaster
        position="top-center"
        richColors
        theme="dark"
        toastOptions={{
          style: {
            background: "#151513",
            border: "1px solid rgba(246,240,228,0.12)",
            color: "#f6f0e4",
            boxShadow: "0 24px 70px rgba(0,0,0,0.48)",
          },
        }}
      />
    </>
  );
}
