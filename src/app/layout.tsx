import type { Metadata } from "next";
import {
  IBM_Plex_Mono,
  Noto_Serif,
  Noto_Serif_Devanagari,
  Work_Sans,
} from "next/font/google";
import { Analytics } from "@vercel/analytics/next";

import AppProviders from "@/components/providers/AppProviders";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nivesh Saathi | Voice-first FD advisor",
  description:
    "Voice-first fixed deposit advisor for India with plain-language compare flows, multilingual chat, and secure mobile auth.",
  keywords: [
    "FD rates",
    "Fixed Deposit",
    "India",
    "voice finance assistant",
    "Nivesh Saathi",
  ],
};

const notoSerifDevanagari = Noto_Serif_Devanagari({
  subsets: ["devanagari"],
  variable: "--font-noto-serif-devanagari",
  weight: ["400", "600", "700", "900"],
});

const notoSerif = Noto_Serif({
  subsets: ["latin"],
  variable: "--font-noto-serif",
  weight: ["400", "700"],
});

const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-work-sans",
  weight: ["400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500", "600"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#08121c" />
        <link rel="preconnect" href="https://firebaseapp.com" />
        <link rel="preconnect" href="https://generativelanguage.googleapis.com" />
      </head>
      <body
        className={`${notoSerifDevanagari.variable} ${notoSerif.variable} ${workSans.variable} ${ibmPlexMono.variable} bg-app text-text-strong`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AppProviders />
          {children}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
