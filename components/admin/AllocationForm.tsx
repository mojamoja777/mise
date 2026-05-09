"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { confirmAllocations } from "@/app/(admin)/admin/allocations/actions";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";

export type AllocationRequest = {
  id: string;
  orderId: string;
  companyName: string;
  orderedAt: string;
  note: string | null;
  requestedQuantity: number;
};

type Props = {
  productId: string;
  stock: number;
  requests: AllocationRequest[];
};

export function AllocationForm({ productId, stock, requests }: Props) {
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(requests.map((r) => [r.id, r.requestedQuantity])),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [aiPending, setAiPending] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiReasons, setAiReasons] = useState<Record<string, string>>({});
  const router = useRouter();

  const totalAllocated = useMemo(
    () => Object.values(values).reduce((a, b) => a + (b || 0), 0),
    [values],
  );
  const overStock = totalAllocated > stock;
  const remaining = stock - totalAllocated;

  function setQty(id: string, raw: string, max: number) {
    const n = raw === "" ? 0 : Math.max(0, Math.min(max, parseInt(raw, 10) || 0));
    setValues((prev) => ({ ...prev, [id]: n }));
  }

  function distributeProportional() {
    const totalReq = requests.reduce((a, r) => a + r.requestedQuantity, 0);
    if (totalReq === 0) return;
    const shareLimit = Math.min(stock, totalReq);
    const next: Record<string, number> = {};
    let assigned = 0;
    const fractional: { id: string; frac: number }[] = [];
    for (const r of requests) {
      const exact = (r.requestedQuantity / totalReq) * shareLimit;
      const base = Math.floor(exact);
      next[r.id] = Math.min(base, r.requestedQuantity);
      assigned += next[r.id];
      fractional.push({ id: r.id, frac: exact - base });
    }
    let leftover = shareLimit - assigned;
    fractional.sort((a, b) => b.frac - a.frac);
    for (const f of fractional) {
      if (leftover <= 0) break;
      const r = requests.find((x) => x.id === f.id)!;
      if (next[f.id] < r.requestedQuantity) {
        next[f.id] += 1;
        leftover -= 1;
      }
    }
    setValues(next);
    setAiReasons({});
    setAiSummary(null);
  }

  function fillRequested() {
    setValues(Object.fromEntries(requests.map((r) => [r.id, r.requestedQuantity])));
    setAiReasons({});
    setAiSummary(null);
  }

  function clearAll() {
    setValues(Object.fromEntries(requests.map((r) => [r.id, 0])));
    setAiReasons({});
    setAiSummary(null);
  }

  async function suggestWithAI(strategy: "balanced" | "tier" | "fcfs") {
    setAiPending(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/suggest-allocation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, strategy }),
      });
      const json = (await res.json()) as
        | { success: true; suggestions: Array<{ requestId: string; allocated: number; reason: string }>; summary: string }
        | { success: false; error: string };
      if (!json.success) {
        setError(json.error);
        return;
      }
      const next = { ...values };
      const reasons: Record<string, string> = {};
      for (const s of json.suggestions) {
        next[s.requestId] = s.allocated;
        if (s.reason) reasons[s.requestId] = s.reason;
      }
      setValues(next);
      setAiReasons(reasons);
      setAiSummary(json.summary || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI 提案に失敗しました");
    } finally {
      setAiPending(false);
    }
  }

  function handleSubmit() {
    setError(null);
    if (overStock) {
      setError("配分合計が在庫を超えています。");
      return;
    }
    const decisions = requests.map((r) => ({
      orderItemId: r.id,
      allocatedQuantity: values[r.id] ?? 0,
    }));
    startTransition(async () => {
      const result = await confirmAllocations(productId, decisions);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/admin/allocations");
      router.refresh();
    });
  }

  return (
    <div className="bg-paper border border-rule overflow-hidden">
      <div className="px-5 py-3 border-b border-rule flex flex-wrap items-center justify-between gap-2 bg-paper-2">
        <p className="caps">各飲食店への配分本数を入力（希望本数を上限）</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="default" onClick={distributeProportional}>
            希望比で按分
          </Button>
          <Button size="sm" variant="default" onClick={fillRequested}>
            希望どおり
          </Button>
          <Button size="sm" variant="default" onClick={clearAll}>
            全て0
          </Button>
          <span className="w-px h-5 self-center bg-rule" aria-hidden />
          <Button
            size="sm"
            variant="default"
            onClick={() => suggestWithAI("balanced")}
            disabled={aiPending}
            className="border-violet text-violet"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI 比例
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={() => suggestWithAI("tier")}
            disabled={aiPending}
            className="border-violet text-violet"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI VIP優先
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={() => suggestWithAI("fcfs")}
            disabled={aiPending}
            className="border-violet text-violet"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI 先着順
          </Button>
        </div>
      </div>

      {aiSummary && (
        <div className="px-5 py-3 bg-violet-bg border-b border-violet flex items-baseline gap-3">
          <Tag variant="violet">⚡ AI · suggest</Tag>
          <p className="text-sm text-ink-2 font-italic-serif flex-1">{aiSummary}</p>
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-plate">
            <th className="text-left px-5 py-2 caps">飲食店</th>
            <th className="text-left px-5 py-2 caps w-32">注文日</th>
            <th className="text-right px-5 py-2 caps w-20">希望</th>
            <th className="text-right px-5 py-2 caps w-32">配分</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => {
            const v = values[r.id] ?? 0;
            const reason = aiReasons[r.id];
            return (
              <tr key={r.id} className="border-b border-rule hover:bg-paper-2 transition-colors">
                <td className="px-5 py-3">
                  <p className="font-serif tracking-tight">{r.companyName}</p>
                  {reason && (
                    <p className="text-[11px] text-violet font-italic-serif mt-0.5">
                      ⚡ {reason}
                    </p>
                  )}
                  {r.note && !reason && (
                    <p className="text-[11px] text-ink-3 mt-0.5">備考: {r.note}</p>
                  )}
                </td>
                <td className="px-5 py-3 text-xs text-ink-3 plate-num">
                  {r.orderedAt
                    ? new Date(r.orderedAt).toLocaleString("ja-JP", {
                        month: "numeric",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </td>
                <td className="px-5 py-3 text-right plate-num">{r.requestedQuantity}</td>
                <td className="px-5 py-3 text-right">
                  <input
                    type="number"
                    min={0}
                    max={r.requestedQuantity}
                    value={v}
                    onChange={(e) => setQty(r.id, e.target.value, r.requestedQuantity)}
                    className="w-20 border border-rule-strong px-2 py-1 text-right text-sm bg-paper focus:outline-none focus:border-plate plate-num"
                  />
                  <span className="ml-1 text-xs text-ink-3">本</span>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="bg-paper-2 border-t-2 border-rule-strong">
          <tr>
            <td colSpan={2} className="px-5 py-3 text-xs text-ink-3 caps">
              在庫: <span className="plate-num text-ink-2">{stock}</span> ／ 残り:{" "}
              <span className={`plate-num ${remaining < 0 ? "text-crimson" : "text-ink-2"}`}>{remaining}</span>
            </td>
            <td className="px-5 py-3 text-right caps">合計</td>
            <td className="px-5 py-3 text-right">
              <span
                className={`font-serif text-lg plate-num ${
                  overStock ? "text-crimson" : "text-plate"
                }`}
              >
                {totalAllocated}
              </span>
              <span className="ml-1 text-xs text-ink-3">本</span>
            </td>
          </tr>
        </tfoot>
      </table>

      <div className="px-5 py-4 border-t border-rule flex items-center justify-between gap-3">
        {error ? (
          <p className="text-sm text-crimson">{error}</p>
        ) : (
          <p className="caps text-ink-3">
            確定すると各注文に配分本数が反映され、その注文は受付完了になります。
          </p>
        )}
        <Button
          variant="primary"
          size="lg"
          onClick={handleSubmit}
          disabled={pending || overStock || aiPending}
        >
          {pending ? "確定中..." : "配分を確定する ⏎"}
        </Button>
      </div>
    </div>
  );
}
