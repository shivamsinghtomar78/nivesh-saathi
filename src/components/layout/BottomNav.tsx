"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircleMore, Mic, Radar, Sparkles } from "lucide-react";

import { APP_COPY } from "@/lib/copy";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/stores/chatStore";

const tabs = [
  { href: ROUTES.HOME, key: "home", icon: Sparkles },
  { href: ROUTES.COMPARE, key: "compare", icon: Radar },
  { href: ROUTES.CHAT, key: "chat", icon: MessageCircleMore },
  { href: ROUTES.VOICE, key: "voice", icon: Mic },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  const language = useChatStore((state) => state.language);
  const copy = APP_COPY[language];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-outline bg-panel/95 backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid h-16 max-w-xl grid-cols-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = pathname === tab.href;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-label={copy.nav[tab.key]}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition",
                active ? "text-highlight" : "text-text-muted"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "scale-110")} />
              <span>{copy.nav[tab.key]}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
