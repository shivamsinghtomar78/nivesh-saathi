"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/chat", label: "Chat", icon: "forum" },
  { href: "/compare", label: "Invest", icon: "account_balance_wallet" },
  { href: "/voice", label: "Voice", icon: "mic" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 w-full bg-white flex justify-around items-center h-16 border-t border-ink/10 z-50">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            "flex flex-col items-center gap-1 py-1 px-3 transition-colors",
            pathname === tab.href ? "text-saffron" : "text-ink-muted"
          )}
        >
          <span
            className="material-symbols-outlined text-2xl"
            style={
              pathname === tab.href
                ? { fontVariationSettings: "'FILL' 1" }
                : {}
            }
          >
            {tab.icon}
          </span>
          <span className="text-[10px] font-semibold">{tab.label}</span>
        </Link>
      ))}
    </nav>
  );
}
