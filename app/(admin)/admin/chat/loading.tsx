import { Skeleton } from "@/components/ui/Skeleton";

export default function AdminChatLoading() {
  return (
    <div className="flex h-screen">
      <aside className="w-72 shrink-0 bg-white border-r border-gray-200 p-4 space-y-3">
        <Skeleton className="h-4 w-20" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </aside>
      <div className="flex-1 bg-gray-50" />
    </div>
  );
}
