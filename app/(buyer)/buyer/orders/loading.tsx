import { SkeletonTable } from "@/components/ui/Skeleton";

export default function BuyerOrdersLoading() {
  return (
    <div className="p-4 space-y-4">
      <div className="h-7 w-32 bg-gray-200 rounded animate-pulse" />
      <SkeletonTable rows={5} cols={3} />
    </div>
  );
}
