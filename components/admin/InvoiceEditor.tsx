// components/admin/InvoiceEditor.tsx
// 請求書の明細・備考を編集するフォーム（admin用）
// 税率は明細ごとに保持し、税率別小計＋消費税＋税込総額をリアルタイム算出する

"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { updateInvoiceAction } from "@/app/(admin)/admin/invoices/actions";
import {
  TAX_CLASSES,
  TAX_LABEL,
  TAX_RATES,
  classForRate,
  rateForClass,
  summarizeTax,
  type TaxClass,
} from "@/lib/tax";

type Item = {
  product_name: string;
  producer: string | null;
  region: string | null;
  quantity: number;
  unit_price: number;
  tax_rate: number;
};

type Props = {
  invoiceId: string;
  initialItems: Item[];
  initialNote: string | null;
};

export function InvoiceEditor({ invoiceId, initialItems, initialNote }: Props) {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [note, setNote] = useState<string>(initialNote ?? "");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const summary = useMemo(() => summarizeTax(items), [items]);

  const updateItem = (index: number, patch: Partial<Item>) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        product_name: "",
        producer: null,
        region: null,
        quantity: 1,
        unit_price: 0,
        tax_rate: TAX_RATES.standard,
      },
    ]);
  };

  const handleSave = () => {
    for (const item of items) {
      if (!item.product_name.trim()) {
        setMessage("商品名が空の明細があります");
        return;
      }
      if (item.quantity <= 0) {
        setMessage("数量は1以上を指定してください");
        return;
      }
      if (item.unit_price < 0) {
        setMessage("単価は0以上を指定してください");
        return;
      }
    }

    startTransition(async () => {
      setMessage(null);
      const result = await updateInvoiceAction(invoiceId, {
        note: note.trim() ? note.trim() : null,
        items,
      });
      if (result.ok) {
        setMessage("保存しました");
      } else {
        setMessage(`エラー：${result.error ?? "unknown"}`);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-rule overflow-hidden">
        <div className="px-5 py-3 border-b border-rule flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-2">明細</h2>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1 text-xs text-plate hover:underline"
          >
            <Plus className="w-3.5 h-3.5" />
            行を追加
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-paper-2 border-b border-rule">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 w-[30%]">
                  商品名
                </th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 w-[22%]">
                  生産者 / 産地
                </th>
                <th className="text-right px-4 py-2 text-xs font-semibold text-ink-3 w-[12%]">
                  単価（税抜）
                </th>
                <th className="text-right px-4 py-2 text-xs font-semibold text-ink-3 w-[8%]">
                  数量
                </th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 w-[12%]">
                  税区分
                </th>
                <th className="text-right px-4 py-2 text-xs font-semibold text-ink-3 w-[12%]">
                  小計（税抜）
                </th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {items.map((item, index) => {
                const subtotal = item.quantity * item.unit_price;
                const currentClass = classForRate(item.tax_rate);
                return (
                  <tr key={index}>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={item.product_name}
                        onChange={(e) =>
                          updateItem(index, { product_name: e.target.value })
                        }
                        className="w-full text-sm border border-rule rounded px-2 py-1 focus:outline-none focus:border-plate"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        <input
                          type="text"
                          placeholder="生産者"
                          value={item.producer ?? ""}
                          onChange={(e) =>
                            updateItem(index, {
                              producer: e.target.value || null,
                            })
                          }
                          className="w-1/2 text-xs border border-rule rounded px-2 py-1 focus:outline-none focus:border-plate"
                        />
                        <input
                          type="text"
                          placeholder="産地"
                          value={item.region ?? ""}
                          onChange={(e) =>
                            updateItem(index, {
                              region: e.target.value || null,
                            })
                          }
                          className="w-1/2 text-xs border border-rule rounded px-2 py-1 focus:outline-none focus:border-plate"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={item.unit_price}
                        onChange={(e) =>
                          updateItem(index, {
                            unit_price: Number(e.target.value),
                          })
                        }
                        className="w-full text-sm text-right border border-rule rounded px-2 py-1 focus:outline-none focus:border-plate"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(index, {
                            quantity: Number(e.target.value),
                          })
                        }
                        className="w-full text-sm text-right border border-rule rounded px-2 py-1 focus:outline-none focus:border-plate"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={currentClass}
                        onChange={(e) =>
                          updateItem(index, {
                            tax_rate: rateForClass(e.target.value as TaxClass),
                          })
                        }
                        className="w-full text-xs border border-rule rounded px-2 py-1 focus:outline-none focus:border-plate"
                      >
                        {TAX_CLASSES.map((tc) => (
                          <option key={tc} value={tc}>
                            {TAX_LABEL[tc]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-ink">
                      ¥{subtotal.toLocaleString()}
                    </td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-ink-3 hover:text-crimson"
                        aria-label="この明細を削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-ink-3"
                  >
                    明細がありません。「行を追加」から追加してください。
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-paper-2 border-t border-rule">
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-2 text-right text-xs text-ink-3"
                >
                  税抜小計
                </td>
                <td className="px-4 py-2 text-right text-sm text-ink-2">
                  ¥{summary.subtotal.toLocaleString()}
                </td>
                <td />
              </tr>
              {summary.breakdown.map((b) => (
                <tr key={b.rate}>
                  <td
                    colSpan={5}
                    className="px-4 py-1 text-right text-xs text-ink-3"
                  >
                    消費税（{Math.round(b.rate * 100)}%対象 ¥{b.subtotal.toLocaleString()}）
                  </td>
                  <td className="px-4 py-1 text-right text-sm text-ink-2">
                    ¥{b.tax.toLocaleString()}
                  </td>
                  <td />
                </tr>
              ))}
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-3 text-right text-sm font-semibold text-ink-2"
                >
                  税込合計
                </td>
                <td className="px-4 py-3 text-right text-base font-bold text-ink">
                  ¥{summary.total.toLocaleString()}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-rule p-5">
        <label className="block text-sm font-semibold text-ink-2 mb-2">
          備考
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="請求書に記載する備考（任意）"
          className="w-full text-sm border border-rule rounded-lg px-3 py-2 focus:outline-none focus:border-plate"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className="bg-plate text-white px-6 py-2 rounded-lg text-sm hover:bg-plate-deep disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {pending ? "保存中..." : "変更を保存"}
        </button>
        {message && (
          <span
            className={`text-sm ${
              message.startsWith("エラー") ? "text-crimson" : "text-green-600"
            }`}
          >
            {message}
          </span>
        )}
      </div>
    </div>
  );
}
