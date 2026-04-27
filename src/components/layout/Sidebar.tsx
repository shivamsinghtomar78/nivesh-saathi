"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const sidebarLinks = [
  { href: "/chat", label: "Support Chat", icon: "forum" },
  { href: "/compare", label: "Fixed Deposits", icon: "account_balance" },
  { href: "#", label: "Gold Loan", icon: "payments" },
  { href: "#", label: "Insurance", icon: "verified_user" },
  { href: "#", label: "Settings", icon: "settings" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-16 h-[calc(100vh-64px)] z-40 w-64 bg-white border-r border-ink/5 card-shadow-lg">
      <div className="p-6">
        {/* User Greeting */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-cream-dark flex items-center justify-center">
            <span className="material-symbols-outlined text-saffron text-3xl">
              account_circle
            </span>
          </div>
          <div>
            <p className="font-heading font-semibold text-base">
              Hello, Investor
            </p>
            <p className="text-xs text-ink-light">
              Your portfolio is safe
            </p>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="space-y-1">
          {sidebarLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-md transition-all text-sm font-semibold",
                pathname === link.href
                  ? "bg-saffron-bg text-saffron border-r-4 border-saffron font-bold"
                  : "text-ink-muted hover:bg-cream-dark"
              )}
            >
              <span className="material-symbols-outlined text-xl">
                {link.icon}
              </span>
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      {/* Logout */}
      <div className="mt-auto p-6 border-t border-outline/10">
        <button className="text-ink-muted hover:bg-cream-dark px-4 py-3 flex items-center gap-3 w-full transition-all rounded-md text-sm font-semibold">
          <span className="material-symbols-outlined">logout</span>
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}
