import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";

export default function AdminOrderDetailLoading() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-5">
      <Skeleton className="h-5 w-24" />
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
        <Skeleton className="h-6 w-1/3" />
        <SkeletonText lines={2} />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="px-5 py-4 flex justify-between items-center">
            <SkeletonText lines={2} className="flex-1 mr-6" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
