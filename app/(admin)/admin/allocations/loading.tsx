import { Skeleton, SkeletonTable } from "@/components/ui/Skeleton";

export default function AdminAllocationsLoading() {
  return (
    <div className="p-8 space-y-6">
      <Skeleton className="h-7 w-28" />
      <SkeletonTable rows={4} cols={5} />
    </div>
  );
}
