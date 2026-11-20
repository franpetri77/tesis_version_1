import { ChatThreadSkeleton } from "@/components/chat/ChatSkeletons";
import { Skeleton } from "@/components/ui/Skeleton";

export default function MessagesLoading() {
  return (
    <div className="space-y-4">
      <div aria-hidden="true" className="space-y-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-3 w-72" />
      </div>
      <div className="h-[min(36rem,calc(100vh-14rem))] overflow-hidden rounded-xl border border-paper-300 bg-white p-4">
        <ChatThreadSkeleton />
      </div>
    </div>
  );
}
