import { Tag } from "@/components/ui";

export const STATUS_LABEL: Record<string, string> = {
  pending: "受付中",
  allocation_pending: "割り当て待ち",
  confirmed: "受付完了",
  cancelled: "キャンセル",
};

const STATUS_VARIANT: Record<string, React.ComponentProps<typeof Tag>["variant"]> = {
  pending: "plate",
  allocation_pending: "amber",
  confirmed: "forest",
  cancelled: "crimson",
};

export function StatusBadge({ status }: { status: string }) {
  return <Tag variant={STATUS_VARIANT[status] ?? "default"}>{STATUS_LABEL[status] ?? status}</Tag>;
}
