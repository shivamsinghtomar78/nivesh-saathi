"use client";

import { Bot, LoaderCircle, Mic, Volume2, Waves } from "lucide-react";

import { cn } from "@/lib/utils";

type AgentState = "connecting" | "listening" | "speaking" | "thinking" | "idle";

const stateCopy: Record<AgentState, { label: string; icon: typeof Mic }> = {
  connecting: { label: "Connecting", icon: LoaderCircle },
  listening: { label: "Listening", icon: Mic },
  speaking: { label: "Speaking", icon: Volume2 },
  thinking: { label: "Thinking", icon: Bot },
  idle: { label: "Ready", icon: Waves },
};

export function AgentAudioVisualizerAura({
  state,
  color = "#00c3ff",
  className,
}: {
  size?: "sm" | "md" | "lg" | "xl";
  color?: string;
  colorShift?: number;
  state: AgentState;
  themeMode?: string;
  className?: string;
}) {
  const Icon = stateCopy[state].icon;
  const active = state !== "idle";

  return (
    <div
      className={cn(
        "relative mx-auto flex aspect-square w-full max-w-[320px] items-center justify-center",
        className
      )}
      style={{ "--aura-color": color } as React.CSSProperties}
      aria-label={`Voice agent ${stateCopy[state].label}`}
    >
      <div 
        className="absolute h-[86%] w-[86%] rounded-full blur-sm transition-opacity duration-500" 
        style={{ 
          background: `radial-gradient(circle, ${color}35, transparent 62%)`,
          opacity: active ? 1 : 0.4
        }}
      />
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className={cn(
            "absolute rounded-full border border-[color:var(--aura-color)]/40 transition-all duration-700",
            active ? "animate-pulse-ring" : "opacity-10"
          )}
          style={{
            height: `${58 + index * 16}%`,
            width: `${58 + index * 16}%`,
            animationDelay: `${index * 0.32}s`,
          }}
        />
      ))}
      <div className="relative flex h-[46%] w-[46%] items-center justify-center rounded-full border border-outline bg-inner-panel shadow-soft transition-all duration-500">
        <div className="absolute inset-3 rounded-full bg-[color:var(--aura-color)]/15 transition-all duration-500" />
        <Icon
          className={cn(
            "relative h-14 w-14 text-[color:var(--aura-color)] transition-all duration-300",
            state === "connecting" && "animate-spin",
            state === "listening" && "animate-mic-pulse"
          )}
        />
      </div>
    </div>
  );
}
