import { Skeleton, SkeletonTable } from "@/components/ui/Skeleton";

export default function AdminInvoicesLoading() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-9 w-40 rounded-full" />
      </div>
      <SkeletonTable rows={5} cols={4} />
    </div>
  );
}
