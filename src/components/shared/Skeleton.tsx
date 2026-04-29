import { cn } from "@/lib/utils";

export default function Skeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-[linear-gradient(90deg,rgba(17,17,19,0.05),rgba(17,17,19,0.1),rgba(17,17,19,0.05))] bg-[length:200%_100%]",
        className
      )}
      style={{ animation: "skeleton-shimmer 2s ease-in-out infinite" }}
    />
  );
}
