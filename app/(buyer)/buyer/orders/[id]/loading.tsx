import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";

export default function BuyerOrderDetailLoading() {
  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto">
      <Skeleton className="h-5 w-32" />
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <SkeletonText lines={2} />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="px-5 py-4 flex justify-between items-center">
            <SkeletonText lines={2} className="flex-1 mr-6" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
