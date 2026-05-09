import { SkeletonCardGrid } from "@/components/ui/Skeleton";

export default function BuyerLoading() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 bg-white border-b border-rule">
        <div className="h-9 rounded-full bg-paper-2 animate-pulse" />
      </div>
      <div className="flex-1 overflow-hidden bg-paper-2">
        <SkeletonCardGrid count={8} />
      </div>
    </div>
  );
}
