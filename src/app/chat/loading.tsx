import Skeleton from "@/components/shared/Skeleton";

export default function ChatLoading() {
  return (
    <div className="min-h-screen bg-app px-4 py-24 md:px-6">
      <div className="mx-auto max-w-6xl">
        <Skeleton className="h-20 rounded-[28px]" />
        <div className="mt-6 rounded-[32px] border border-outline bg-panel p-4 shadow-soft">
          <div className="space-y-4">
            <Skeleton className="h-20 max-w-[68%] rounded-[24px]" />
            <Skeleton className="ml-auto h-24 max-w-[60%] rounded-[24px]" />
            <Skeleton className="h-32 max-w-[72%] rounded-[24px]" />
          </div>
          <Skeleton className="mt-6 h-16 rounded-[24px]" />
        </div>
      </div>
    </div>
  );
}
