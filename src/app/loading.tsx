import Skeleton from "@/components/shared/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-app px-4 py-24 md:px-6">
      <div className="mx-auto max-w-7xl">
        <Skeleton className="h-14 w-48 rounded-2xl" />
        <Skeleton className="mt-6 h-16 max-w-3xl rounded-[var(--radius-card)]" />
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="rounded-[var(--radius-card)] border border-outline bg-panel p-5 shadow-soft"
            >
              <Skeleton className="h-12 w-12 rounded-2xl" />
              <Skeleton className="mt-4 h-5 w-40 rounded-full" />
              <Skeleton className="mt-3 h-24 rounded-[var(--radius-panel)]" />
              <Skeleton className="mt-4 h-12 rounded-2xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
