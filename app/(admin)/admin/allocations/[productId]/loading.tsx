import { Skeleton, SkeletonTable } from "@/components/ui/Skeleton";

export default function AdminAllocationDetailLoading() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-5">
      <Skeleton className="h-5 w-32" />
      <div className="card-float p-6 space-y-3">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-1/4" />
      </div>
      <SkeletonTable rows={5} cols={4} />
    </div>
  );
}
