import { Skeleton } from "@/components/ui/Skeleton";

export default function BuyerChatLoading() {
  return (
    <div className="px-3 py-4 space-y-2">
      <Skeleton className="h-4 w-32" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className={`flex ${i % 2 ? "justify-end" : "justify-start"}`}
        >
          <Skeleton className="h-10 w-2/3 rounded-2xl" />
        </div>
      ))}
    </div>
  );
}
