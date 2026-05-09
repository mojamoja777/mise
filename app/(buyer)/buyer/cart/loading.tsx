import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";

export default function BuyerCartLoading() {
  return (
    <div className="p-4 space-y-3 max-w-2xl mx-auto">
      <Skeleton className="h-6 w-24" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-xl border border-rule p-4 flex gap-3"
        >
          <Skeleton className="w-16 h-16 shrink-0" />
          <SkeletonText lines={2} className="flex-1" />
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}
