import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";

export default function BuyerInvoicesLoading() {
  return (
    <div className="px-4 py-4 max-w-3xl mx-auto space-y-3">
      <Skeleton className="h-5 w-24" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-xl border border-rule p-4"
        >
          <SkeletonText lines={2} />
        </div>
      ))}
    </div>
  );
}
