-- ============================================================
-- Mise products テーブル拡張マイグレーション
-- 作成日: 2026-05-04
-- 目的:
--   - products に category / type / country / comment を正式に追加
--   - 過去のローカル開発で型側だけ更新され DDL が未記述だったため整合化
-- 安全性:
--   IF NOT EXISTS なので、本番 DB に既に手動 ALTER で同名カラムが存在していても
--   無害に通る（同名・同型でない場合のみエラー）
-- ============================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS type     text,
  ADD COLUMN IF NOT EXISTS country  text,
  ADD COLUMN IF NOT EXISTS comment  text;

COMMENT ON COLUMN public.products.category IS '商品カテゴリ（ワイン / 日本酒 / 焼酎 / ジン / ウイスキー / その他）';
COMMENT ON COLUMN public.products.type     IS 'ワインの場合のタイプ（赤・白・スパークリング 等）';
COMMENT ON COLUMN public.products.country  IS 'ワインの場合の生産国';
COMMENT ON COLUMN public.products.comment  IS '酒屋側のメモ・販売時のコメント';

-- カテゴリでの絞り込みに使うインデックス
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category);

-- ============================================================
-- 完了確認
--   SELECT column_name, data_type
--   FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'products'
--   ORDER BY ordinal_position;
-- ============================================================
