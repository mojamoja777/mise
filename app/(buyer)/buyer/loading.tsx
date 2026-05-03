import { SkeletonCardGrid } from "@/components/ui/Skeleton";

export default function BuyerLoading() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 bg-white border-b border-gray-100">
        <div className="h-9 rounded-full bg-gray-100 animate-pulse" />
      </div>
      <div className="flex-1 overflow-hidden bg-gray-50">
        <SkeletonCardGrid count={8} />
      </div>
    </div>
  );
}
