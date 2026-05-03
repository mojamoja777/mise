-- ============================================================
-- Mise 請求書仕上げマイグレーション
-- 作成日: 2026-05-04
-- 目的:
--   - tenants.stamp_url を追加（PDF に埋める印影画像）
--   - 「自分の請求書を閲覧する」buyer 用 RLS を追加
-- 前提: migration_tenants.sql / migration_invoices.sql 適用済み
-- ============================================================


-- ============================================================
-- 1. tenants.stamp_url
-- ============================================================

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS stamp_url text;

COMMENT ON COLUMN public.tenants.stamp_url IS
  '請求書 PDF に埋め込む印影画像 URL（Supabase Storage の公開 URL を想定）';


-- ============================================================
-- 2. invoices / invoice_items の buyer 閲覧 RLS
-- ============================================================
-- 現状は admin_invoices_all / admin_invoice_items_all のみ。buyer 側で
-- 自分の請求書を閲覧できるよう SELECT を解放する（編集権限は付与しない）。
-- ============================================================

DROP POLICY IF EXISTS "buyer_invoices_select_own" ON public.invoices;
CREATE POLICY "buyer_invoices_select_own" ON public.invoices
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'buyer'
    AND buyer_id = auth.uid()
  );

DROP POLICY IF EXISTS "buyer_invoice_items_select_own" ON public.invoice_items;
CREATE POLICY "buyer_invoice_items_select_own" ON public.invoice_items
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'buyer'
    AND invoice_id IN (
      SELECT id FROM public.invoices WHERE buyer_id = auth.uid()
    )
  );


-- ============================================================
-- 完了確認
--   SELECT id, stamp_url FROM public.tenants;
--   -- buyer ロールでログインして
--   SELECT * FROM public.invoices;
-- ============================================================
