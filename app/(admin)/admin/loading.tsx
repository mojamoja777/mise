import { Skeleton, SkeletonTable } from "@/components/ui/Skeleton";

export default function AdminLoading() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-9 w-36 rounded-full" />
      </div>
      <SkeletonTable rows={6} cols={5} />
    </div>
  );
}
