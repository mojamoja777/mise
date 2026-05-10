-- migration_buyer_enrichment.sql
-- 飲食店プロファイルの自動取込（Phase 1: HP のみ。Phase 2 で gmaps、Phase 3 で IG vision）
--
-- 背景:
--   AI ソムリエ仕入提案の精度を上げるため、buyer の公開情報（公式 HP）を
--   AI で抽出して保存しておく。後段の AI 提案で seed として使う。
-- ============================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS hp_url              text,
  ADD COLUMN IF NOT EXISTS instagram_url       text,
  ADD COLUMN IF NOT EXISTS gmaps_url           text,
  ADD COLUMN IF NOT EXISTS profile_enriched    jsonb,
  ADD COLUMN IF NOT EXISTS profile_enriched_at timestamptz;

COMMENT ON COLUMN public.users.hp_url
  IS '公式 HP URL（admin が手入力）。enrich 時に fetch 対象になる';
COMMENT ON COLUMN public.users.instagram_url
  IS 'Instagram URL（Phase 2 以降で活用）。bio 取得 + Vision 解析の起点';
COMMENT ON COLUMN public.users.gmaps_url
  IS 'Google Maps URL（Phase 2 で活用）。Place Details API 経由で口コミ等を取得';
COMMENT ON COLUMN public.users.profile_enriched
  IS 'AI 抽出した店舗プロファイル jsonb。{ cuisine_type, signature_dishes[], main_ingredients[], seasonal_focus, drink_focus, price_range_estimate, atmosphere, notes_for_wine_buyer, source } を格納';
COMMENT ON COLUMN public.users.profile_enriched_at
  IS '最後に enrich 実行した日時。月次 cron で再取込判定に使う';

NOTIFY pgrst, 'reload schema';
