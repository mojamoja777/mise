-- ============================================================
-- Mise products.status / product_images / Storage マイグレーション
-- 作成日: 2026-05-06
-- 目的:
--   1. products に「下書き / 公開中」を表す status カラムを追加
--   2. product_images テーブルを新規作成（最大 3 枚 / 商品 1 枚メイン）
--   3. Supabase Storage `product-images` バケットを作成
--   4. RLS を更新（buyer は status='published' のみ閲覧可）
-- 前提: migration.sql / migration_products_extend.sql
-- 安全性: 全 IF NOT EXISTS。既存商品は published 扱いで初期化し、
--         以降の新規行は draft がデフォルトになる。
-- ============================================================

-- ------------------------------------------------------------
-- 1. products.status カラムを追加
-- ------------------------------------------------------------

-- 既存行を published 扱いにするため、ADD のデフォルトは published
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published';

-- 以降の INSERT は draft が初期値
ALTER TABLE public.products
  ALTER COLUMN status SET DEFAULT 'draft';

-- CHECK 制約
ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_status_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_status_check
  CHECK (status IN ('draft', 'published'));

COMMENT ON COLUMN public.products.status IS
  'draft=下書き（管理者のみ閲覧）/ published=公開中（buyer も閲覧可）';

CREATE INDEX IF NOT EXISTS idx_products_status ON public.products (status);


-- ------------------------------------------------------------
-- 2. buyer 向け products RLS を status='published' で絞り込む
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "buyer_products_select_active" ON public.products;

CREATE POLICY "buyer_products_select_published" ON public.products
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'buyer'
    AND is_active = true
    AND status = 'published'
  );


-- ------------------------------------------------------------
-- 3. product_images テーブルを新規作成
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_images (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    uuid        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  storage_path  text        NOT NULL,
  storage_url   text        NOT NULL,
  image_role    text        NOT NULL DEFAULT 'other'
                            CHECK (image_role IN ('main', 'back', 'japanese', 'other')),
  is_main       boolean     NOT NULL DEFAULT false,
  display_order integer     NOT NULL DEFAULT 0,
  file_size     integer,
  width         integer,
  height        integer,
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.product_images IS '商品画像（1 商品あたり最大 3 枚）';
COMMENT ON COLUMN public.product_images.image_role
  IS 'main=表ラベル / back=裏ラベル / japanese=日本語シール / other=その他';

CREATE INDEX IF NOT EXISTS idx_product_images_product_id
  ON public.product_images (product_id);

-- 同一商品に is_main=true を 1 枚しか持てないようにする
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_images_one_main_per_product
  ON public.product_images (product_id)
  WHERE is_main = true;


-- ------------------------------------------------------------
-- 4. product_images の RLS
-- ------------------------------------------------------------
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_product_images_all" ON public.product_images;
CREATE POLICY "admin_product_images_all" ON public.product_images
  FOR ALL
  TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- buyer は公開中の商品の画像だけ見える
DROP POLICY IF EXISTS "buyer_product_images_select_published" ON public.product_images;
CREATE POLICY "buyer_product_images_select_published" ON public.product_images
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'buyer'
    AND EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = public.product_images.product_id
        AND p.is_active = true
        AND p.status = 'published'
    )
  );


-- ------------------------------------------------------------
-- 5. Supabase Storage バケット
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- 誰でも閲覧可能（Public バケット）
DROP POLICY IF EXISTS "product_images_public_read" ON storage.objects;
CREATE POLICY "product_images_public_read" ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'product-images');

-- 管理者のみアップロード可能
DROP POLICY IF EXISTS "product_images_admin_insert" ON storage.objects;
CREATE POLICY "product_images_admin_insert" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND public.current_user_role() = 'admin'
  );

-- 管理者のみ更新可能
DROP POLICY IF EXISTS "product_images_admin_update" ON storage.objects;
CREATE POLICY "product_images_admin_update" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND public.current_user_role() = 'admin'
  );

-- 管理者のみ削除可能
DROP POLICY IF EXISTS "product_images_admin_delete" ON storage.objects;
CREATE POLICY "product_images_admin_delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND public.current_user_role() = 'admin'
  );


-- ============================================================
-- 完了確認
--   SELECT id, name, status FROM products LIMIT 5;
--   SELECT * FROM product_images LIMIT 5;
--   SELECT id, public FROM storage.buckets WHERE id = 'product-images';
-- ============================================================
