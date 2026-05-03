// lib/tax.ts
// 消費税のラベルと計算ヘルパ。インボイス制度の「税率ごと区分」前提で集計する。

export const TAX_CLASSES = ["standard", "reduced", "exempt"] as const;
export type TaxClass = (typeof TAX_CLASSES)[number];

export const TAX_RATES: Record<TaxClass, number> = {
  standard: 0.1,
  reduced: 0.08,
  exempt: 0,
};

export const TAX_LABEL: Record<TaxClass, string> = {
  standard: "標準10%",
  reduced: "軽減8%",
  exempt: "非課税",
};

export function rateForClass(taxClass: TaxClass): number {
  return TAX_RATES[taxClass];
}

export function classForRate(rate: number): TaxClass {
  if (Math.abs(rate - 0.1) < 1e-6) return "standard";
  if (Math.abs(rate - 0.08) < 1e-6) return "reduced";
  return "exempt";
}

export type TaxBreakdown = {
  /** 税率（0.10 / 0.08 / 0） */
  rate: number;
  /** その税率で集計した税抜小計 */
  subtotal: number;
  /** その税率で算出した消費税（端数切り捨て） */
  tax: number;
};

export type TaxSummary = {
  subtotal: number;
  tax: number;
  total: number;
  /** 税率ごとの内訳（降順） */
  breakdown: TaxBreakdown[];
};

/**
 * 明細から税抜小計・税率ごとの消費税・税込総額を算出する。
 * 端数処理：税率ごとの小計に対して `Math.floor` で切り捨て（実務上もっとも一般的）。
 */
export function summarizeTax(
  items: Array<{ quantity: number; unit_price: number; tax_rate: number }>
): TaxSummary {
  // 税率別に税抜小計を集約
  const grouped = new Map<number, number>();
  for (const it of items) {
    const sub = it.unit_price * it.quantity;
    grouped.set(it.tax_rate, (grouped.get(it.tax_rate) ?? 0) + sub);
  }

  let subtotal = 0;
  let tax = 0;
  const breakdown: TaxBreakdown[] = [];
  for (const [rate, sub] of grouped.entries()) {
    const t = Math.floor(sub * rate);
    subtotal += sub;
    tax += t;
    breakdown.push({ rate, subtotal: sub, tax: t });
  }
  breakdown.sort((a, b) => b.rate - a.rate);

  return { subtotal, tax, total: subtotal + tax, breakdown };
}
