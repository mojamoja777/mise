-- ============================================================
-- Mise 消費税対応マイグレーション
-- 作成日: 2026-05-04
-- 目的:
--   - products に税区分を追加（標準10% / 軽減8% / 非課税）
--   - invoice_items に税率スナップショットを追加
--   - invoices に税抜小計・消費税額を分離
-- 安全性:
--   - 既存データは tax_rate=0.10 / subtotal=既存total / tax=0 で整合
--   - 新規発行から税抜＋税額の構造で集計される
-- ============================================================


-- ============================================================
-- 1. products.tax_class
-- ============================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS tax_class text NOT NULL DEFAULT 'standard'
  CHECK (tax_class IN ('standard', 'reduced', 'exempt'));

COMMENT ON COLUMN public.products.tax_class IS
  '消費税区分: standard=10% / reduced=8% (軽減税率) / exempt=非課税';


-- ============================================================
-- 2. invoice_items.tax_rate（発行時点のスナップショット）
-- ============================================================

ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS tax_rate numeric(5,4) NOT NULL DEFAULT 0.10
  CHECK (tax_rate >= 0 AND tax_rate <= 1);

COMMENT ON COLUMN public.invoice_items.tax_rate IS
  '消費税率スナップショット。発行時点の products.tax_class から決定 (0.10/0.08/0.00)';


-- ============================================================
-- 3. invoices に税抜小計・消費税額・税込総額を分離
-- ============================================================
-- total_amount は「税込総額」として運用継続
-- subtotal_amount = 税抜小計
-- tax_amount      = 消費税合計
-- 不変条件: total_amount = subtotal_amount + tax_amount
-- ============================================================

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS subtotal_amount numeric NOT NULL DEFAULT 0 CHECK (subtotal_amount >= 0),
  ADD COLUMN IF NOT EXISTS tax_amount      numeric NOT NULL DEFAULT 0 CHECK (tax_amount >= 0);

COMMENT ON COLUMN public.invoices.subtotal_amount IS '税抜小計（明細の unit_price * quantity の合計）';
COMMENT ON COLUMN public.invoices.tax_amount      IS '消費税合計（税率別に切り捨てした合算）';
COMMENT ON COLUMN public.invoices.total_amount    IS '税込総額（subtotal_amount + tax_amount）';

-- 既存データの後方互換移行：tax_amount=0 / subtotal=total として揃える
UPDATE public.invoices
SET subtotal_amount = total_amount,
    tax_amount      = 0
WHERE subtotal_amount = 0;


-- ============================================================
-- 完了確認
--   SELECT id, subtotal_amount, tax_amount, total_amount FROM public.invoices LIMIT 5;
--   SELECT id, name, tax_class FROM public.products LIMIT 5;
--   SELECT invoice_id, tax_rate FROM public.invoice_items LIMIT 5;
-- ============================================================
