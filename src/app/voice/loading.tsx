import Skeleton from "@/components/shared/Skeleton";

export default function VoiceLoading() {
  return (
    <div className="min-h-screen bg-app px-4 py-24 md:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-[32px] border border-outline bg-panel p-6 shadow-soft">
          <div className="mx-auto max-w-3xl text-center">
            <Skeleton className="mx-auto h-5 w-32 rounded-full" />
            <Skeleton className="mx-auto mt-4 h-16 w-full rounded-[28px]" />
            <Skeleton className="mx-auto mt-8 h-28 w-28 rounded-full" />
            <Skeleton className="mx-auto mt-8 h-16 w-full rounded-[28px]" />
          </div>
        </div>
      </div>
    </div>
  );
}
