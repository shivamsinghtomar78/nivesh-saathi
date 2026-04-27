import type { Metadata } from "next";
import {
  IBM_Plex_Mono,
  Noto_Serif,
  Noto_Serif_Devanagari,
  Work_Sans,
} from "next/font/google";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nivesh Saathi — Your Trusted Investment Companion",
  description:
    "Compare 15+ bank FD rates, guided in your language. Build your wealth with certainty and local trust. DICGC Insured deposits.",
  keywords: [
    "FD rates",
    "Fixed Deposit",
    "India",
    "bank comparison",
    "investment",
    "Nivesh Saathi",
  ],
};

const notoSerifDevanagari = Noto_Serif_Devanagari({
  subsets: ["devanagari"],
  variable: "--font-noto-serif-devanagari",
  weight: ["400", "600", "700", "900"],
  display: "swap",
});

const notoSerif = Noto_Serif({
  subsets: ["latin"],
  variable: "--font-noto-serif",
  weight: ["400", "700"],
  display: "swap",
});

const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-work-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500", "600"],
  display: "swap",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${notoSerifDevanagari.variable} ${notoSerif.variable} ${workSans.variable} ${ibmPlexMono.variable} overflow-x-hidden`}
      >
        {children}
      </body>
    </html>
  );
}
