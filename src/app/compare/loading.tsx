import Skeleton from "@/components/shared/Skeleton";

export default function CompareLoading() {
  return (
    <div className="min-h-screen bg-app px-4 py-24 md:px-6">
      <div className="mx-auto max-w-7xl">
        <Skeleton className="h-20 rounded-[var(--radius-card)]" />
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="rounded-[var(--radius-card)] border border-outline bg-panel p-5 shadow-soft"
            >
              <div className="flex justify-between">
                <Skeleton className="h-12 w-12 rounded-2xl" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="mt-5 h-10 w-28 rounded-2xl" />
              <Skeleton className="mt-4 h-24 rounded-[var(--radius-panel)]" />
              <Skeleton className="mt-4 h-12 rounded-2xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
