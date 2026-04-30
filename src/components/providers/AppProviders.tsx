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
            background: "#14202d",
            border: "1px solid #2b394a",
            color: "#f2f6fb",
          },
        }}
      />
    </>
  );
}
