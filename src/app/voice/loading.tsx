import Skeleton from "@/components/shared/Skeleton";

export default function VoiceLoading() {
  return (
    <div className="min-h-screen bg-app px-3 py-20 tablet:px-6 tablet:py-24">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-[var(--radius-card)] border border-outline bg-panel p-4 shadow-soft tablet:p-6">
          <div className="mx-auto max-w-3xl text-center">
            <Skeleton className="mx-auto h-5 w-32 rounded-full" />
            <Skeleton className="mx-auto mt-4 h-16 w-full rounded-[var(--radius-card)]" />
            <Skeleton className="mx-auto mt-8 h-28 w-28 rounded-full" />
            <Skeleton className="mx-auto mt-8 h-16 w-full rounded-[var(--radius-card)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
