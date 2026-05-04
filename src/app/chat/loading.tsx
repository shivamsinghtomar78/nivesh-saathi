import Skeleton from "@/components/shared/Skeleton";

export default function ChatLoading() {
  return (
    <div className="min-h-screen bg-app px-3 py-20 tablet:px-6 tablet:py-24">
      <div className="mx-auto max-w-6xl">
        <Skeleton className="h-20 rounded-[var(--radius-card)]" />
        <div className="mt-6 rounded-[var(--radius-card)] border border-outline bg-panel p-4 shadow-soft">
          <div className="space-y-4">
            <Skeleton className="h-20 max-w-[68%] rounded-[var(--radius-panel)]" />
            <Skeleton className="ml-auto h-24 max-w-[60%] rounded-[var(--radius-panel)]" />
            <Skeleton className="h-32 max-w-[72%] rounded-[var(--radius-panel)]" />
          </div>
          <Skeleton className="mt-6 h-16 rounded-[var(--radius-panel)]" />
        </div>
      </div>
    </div>
  );
}
