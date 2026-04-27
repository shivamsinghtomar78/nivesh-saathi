"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircleMore, Mic, Radar, Shield, Sparkles } from "lucide-react";

import { APP_COPY } from "@/lib/copy";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore } from "@/stores/chatStore";

const sidebarLinks = [
  { href: ROUTES.CHAT, key: "chat", icon: MessageCircleMore },
  { href: ROUTES.COMPARE, key: "compare", icon: Radar },
  { href: ROUTES.VOICE, key: "voice", icon: Mic },
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const language = useChatStore((state) => state.language);
  const user = useAuthStore((state) => state.user);
  const copy = APP_COPY[language];

  return (
    <aside className="fixed left-0 top-16 z-40 hidden h-[calc(100vh-64px)] w-72 flex-col border-r border-outline bg-panel/92 backdrop-blur-xl lg:flex">
      <div className="border-b border-outline p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-highlight text-black shadow-soft">
            <Shield className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-text-muted">
              Secure session
            </p>
            <p className="mt-1 truncate font-semibold text-text-strong">
              {user?.phoneNumber || "Guest mode"}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="rounded-2xl border border-outline bg-panel-strong p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-text-muted">
            Workflow
          </p>
          <div className="mt-4 grid gap-3">
            {[
              { icon: Sparkles, label: "Start with compare" },
              { icon: MessageCircleMore, label: "Ask Saathi what changed" },
              { icon: Shield, label: "Keep a trusted shortlist" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-3 text-sm text-text">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-highlight/12 text-highlight">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <nav className="px-4">
        {sidebarLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "mt-2 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                pathname === link.href
                  ? "bg-highlight text-black"
                  : "text-text-muted hover:bg-panel-strong hover:text-text-strong"
              )}
            >
              <Icon className="h-4 w-4" />
              {copy.nav[link.key]}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
