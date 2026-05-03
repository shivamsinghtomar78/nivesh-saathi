import { cn } from "@/lib/utils";

export default function Skeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-[linear-gradient(90deg,rgba(255,255,255,0.045),rgba(215,182,109,0.10),rgba(255,255,255,0.045))] bg-[length:200%_100%]",
        className
      )}
      style={{ animation: "skeleton-shimmer 2s ease-in-out infinite" }}
    />
  );
}
