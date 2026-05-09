# Mise: 商品登録ページ仕様詰め 実装指示書

**対象**: Claude Code
**前提**: AI ラベル読み取り機能（デモ版）は既に実装済み・動作確認済み
**作成日**: 2026-05-04

---

## 0. このフェーズの目的

商品登録ページに以下を追加する：

1. **画像保存機能**: AI ラベル読み取りに使った画像（最大 3 枚）を商品データとして保存
2. **公開／非公開機能**: 「下書き保存（非公開）」と「公開して登録」の 2 ボタン構成
3. **編集画面での画像差し替え**: 既存商品の画像を追加・差し替え・削除できる

---

## 1. 画像保存機能の仕様

### 1.1 保存先

**Supabase Storage** を使用する（Mise プロジェクトの Supabase インスタンス）。

- バケット名: `product-images`（新規作成、Public バケットとして作成）
- ストレージパス構造: `products/{product_id}/{image_role}_{timestamp}.jpg`
  - 例: `products/abc123/main_1735000000.jpg`
  - 例: `products/abc123/back_1735000000.jpg`
  - 例: `products/abc123/japanese_1735000000.jpg`

### 1.2 保存する画像

1 商品につき**最大 3 枚**保存可能：

| 役割 (image_role) | 内容 |
|---|---|
| `main` | メイン画像（表ラベル想定、サムネイル用）|
| `back` | 裏ラベル |
| `japanese` | 日本語輸入元シール |

ただし役割は強制ではなく、**しょーたさん・森田屋さまが任意に「メイン画像」を選べる**仕様にする（質問 3 で確定）。

### 1.3 メイン画像の指定方法

- 画像アップロード後、管理画面で**「メイン画像にする」ボタン**で切り替えできる
- メイン画像は商品サムネイル・発注画面の代表画像として表示される
- メイン画像が指定されていない場合は、最初にアップロードされた画像を自動的にメインにする

### 1.4 保存時の画像処理

クライアントサイド（ブラウザ内）で 2 段階のリサイズを行う：

#### 用途 1: AI ラベル読み取り用

- 既存実装通り：1024px・JPEG 85%
- API リクエストに base64 エンコードして送信
- Storage には保存しない（メモリ上で破棄）

#### 用途 2: Supabase Storage 保存用

- **2048px・JPEG 90%** にリサイズ
- 約 300KB/枚を目安
- アスペクト比は維持

`/lib/ai/image-utils.ts` に新たに `resizeImageForStorage(file: File): Promise<Blob>` を追加する。既存の `resizeImageToBase64()` と並列で実装。

### 1.5 アップロードタイミング

**「下書き保存」または「公開して登録」ボタンを押した瞬間**に Supabase Storage にアップロード。

#### フロー

```
1. ユーザーが画像を 1〜3 枚選択
   ↓
2. プレビュー表示（base64 のままメモリ内）
   ↓
3. 「AI で抽出する」ボタン → 画像を 1024px に縮小して API 送信
   （Storage には保存しない）
   ↓
4. AI 抽出結果がフォームに反映される
   ↓
5. 価格・在庫等を手入力
   ↓
6. 「下書き保存」または「公開して登録」をクリック
   ↓
7. 各画像を 2048px・JPEG 90% にリサイズ
   ↓
8. Supabase Storage の products/{product_id}/ にアップロード
   ↓
9. DB の products テーブル + product_images テーブルに INSERT
   ↓
10. 商品一覧へリダイレクト
```

### 1.6 既存商品の画像差し替え（編集画面）

商品編集画面（`/admin/products/[id]/edit` 想定、既存パスに合わせる）でも画像操作ができる：

- 既存画像の削除（Storage から物理削除 + DB レコード削除）
- 新規画像の追加（最大 3 枚まで）
- メイン画像の切り替え
- AI ラベル読み取りの再実行

### 1.7 商品削除時の画像処理

商品レコードを削除する時、紐づくすべての画像を Supabase Storage から**物理削除**する。

- DB レベルで `ON DELETE CASCADE` を product_images テーブルに設定
- アプリケーションコードで Storage の物理削除を実行（CASCADE では Storage は削除されないため）

---

## 2. 公開／非公開機能の仕様

### 2.1 商品の状態

`products` テーブルに以下のカラムを追加（既存になければ）：

```sql
status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published'))
```

または `is_published BOOLEAN` でも可。既存スキーマに合わせる。

| 状態 | 意味 |
|---|---|
| `draft`（下書き）| 管理者のみ閲覧可能。飲食店からは完全に見えない |
| `published`（公開中）| 管理者 + 割り当て対象の飲食店が閲覧可能 |

### 2.2 登録ボタン構成

商品登録ページの下部に **2 つのボタン**を配置：

```
┌────────────────────────────────────────┐
│  [キャンセル]  [下書き保存]  [公開して登録]   │
└────────────────────────────────────────┘
```

- **「下書き保存」**: 控えめなスタイル（アウトラインボタン等）。`status = 'draft'` で保存
- **「公開して登録」**: メインカラー（深緑系）の目立つボタン。`status = 'published'` で保存

デザインの詳細は Claude Code が既存スタイルガイドに合わせて判断。

### 2.3 編集画面での公開状態切り替え

商品編集画面で、現在の公開状態に応じてボタンが切り替わる：

| 現在の状態 | 表示されるボタン |
|---|---|
| `draft`（下書き）| 「下書きのまま保存」「公開する」 |
| `published`（公開中）| 「変更を保存」「非公開にする」 |

- 公開 → 非公開への戻しは**自由に可能**
- 非公開にしても、登録済みのデータ（画像・割り当て・在庫等）は保持される

### 2.4 商品一覧での表示

管理画面の商品一覧（`/admin/products`）で：

- **公開・非公開を混在表示**
- 各商品の状態を**バッジで区別**

例：
```
┌────────────────────────────────────────┐
│ シュール・ラ・コート   🟢 公開中  全店舗  │
│ ロッソ マシエリ        ⚪ 下書き   -      │
│ BLOOD ORANGE          🟢 公開中  3店舗   │
└────────────────────────────────────────┘
```

- 公開中: 緑バッジ「公開中」
- 下書き: グレーバッジ「下書き」

デザインは Claude Code が既存スタイルに合わせて判断。

### 2.5 飲食店（バイヤー）からの見え方

- `status = 'draft'` の商品は飲食店の発注画面に**完全に表示されない**
- 検索・絞り込み結果にも含まれない
- 既存の RLS（Row Level Security）ポリシーを更新して制御する

#### 想定される RLS ポリシー（参考）

```sql
-- 飲食店向け products SELECT ポリシー
CREATE POLICY "Buyers can only see published products with allocation"
  ON products FOR SELECT
  TO authenticated
  USING (
    status = 'published'
    AND EXISTS (
      SELECT 1 FROM product_allocations
      WHERE product_allocations.product_id = products.id
      AND product_allocations.buyer_id = auth.uid()
    )
  );
```

既存ポリシーがあれば、それを更新する形で対応。

### 2.6 割り当て機能との関係

非公開商品でも、**割り当て設定は可能**にする：

- 下書き状態で割り当てを設定 → 公開した瞬間にすべて反映される
- 公開→非公開に戻しても、割り当て情報は保持される

---

## 3. DB スキーマ変更

### 3.1 マイグレーション概要

新規マイグレーションファイルを作成（既存の連番に従う、例: `012_add_product_images_and_status.sql`）。

### 3.2 products テーブル

既存テーブルに以下を追加（既に存在しなければ）：

```sql
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published'));

CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
```

既に `published` 等のカラムがあれば、それを活用する形で OK。

### 3.3 product_images テーブル（新規作成）

```sql
CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  storage_url TEXT NOT NULL, -- Supabase Storage の Public URL（あるいはサイン付きURL生成元）
  image_role TEXT NOT NULL CHECK (image_role IN ('main', 'back', 'japanese', 'other')),
  is_main BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  file_size INTEGER, -- バイト数
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_images_product_id ON product_images(product_id);
CREATE INDEX idx_product_images_is_main ON product_images(product_id, is_main) WHERE is_main = true;

-- 同一商品でメイン画像は 1 つだけ（uniqueness 制約）
CREATE UNIQUE INDEX idx_product_images_one_main_per_product
  ON product_images(product_id) WHERE is_main = true;

-- RLS
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all product images"
  ON product_images FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Buyers can view images of published & allocated products"
  ON product_images FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_images.product_id
      AND products.status = 'published'
      AND EXISTS (
        SELECT 1 FROM product_allocations
        WHERE product_allocations.product_id = products.id
        AND product_allocations.buyer_id = auth.uid()
      )
    )
  );
```

### 3.4 Supabase Storage バケット設定

マイグレーション内で Storage バケットを作成（または手動作成手順を示す）：

```sql
-- Storage バケットを作成（既存パターンに合わせる、もしくは Supabase Dashboard で手動作成）
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- バケットポリシー（管理者のみアップロード可能）
CREATE POLICY "Admins can upload product images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Anyone can view product images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'product-images');

CREATE POLICY "Admins can delete product images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );
```

⚠️ Public バケットにする理由は、画像 URL を商品一覧・発注画面で直接使えるようにするため。プライバシー上問題なければ Public で OK。心配なら Private + サイン付き URL で対応。

---

## 4. 既存ファイルへの修正

### 4.1 `/lib/ai/image-utils.ts` に追加

```typescript
/**
 * Supabase Storage 保存用にリサイズ
 * - 最大 2048px に縮小
 * - JPEG 品質 90%
 * - File オブジェクトとして返す（Storage アップロード用）
 */
export async function resizeImageForStorage(
  file: File,
  maxSize: number = 2048
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > height && width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        } else if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Blob conversion failed'));
              return;
            }
            const resizedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(resizedFile);
          },
          'image/jpeg',
          0.90
        );
      };
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsDataURL(file);
  });
}
```

### 4.2 `/lib/storage/product-images.ts` 新規作成

```typescript
import { createClient } from '@/lib/supabase/server';

/**
 * 商品画像を Supabase Storage にアップロード
 */
export async function uploadProductImage(
  productId: string,
  file: File,
  imageRole: 'main' | 'back' | 'japanese' | 'other'
): Promise<{ path: string; url: string }> {
  const supabase = createClient();
  const timestamp = Date.now();
  const extension = file.name.split('.').pop() || 'jpg';
  const path = `products/${productId}/${imageRole}_${timestamp}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('product-images')
    .getPublicUrl(path);

  return { path, url: urlData.publicUrl };
}

/**
 * 商品画像を削除（Storage + DB 両方）
 */
export async function deleteProductImage(imageId: string): Promise<void> {
  const supabase = createClient();

  // 1. DB から画像情報を取得
  const { data: image, error: fetchError } = await supabase
    .from('product_images')
    .select('storage_path')
    .eq('id', imageId)
    .single();

  if (fetchError || !image) {
    throw new Error(`Image not found: ${imageId}`);
  }

  // 2. Storage から物理削除
  const { error: storageError } = await supabase.storage
    .from('product-images')
    .remove([image.storage_path]);

  if (storageError) {
    console.error('Storage deletion failed:', storageError);
    // DB 削除は続行
  }

  // 3. DB レコード削除
  const { error: deleteError } = await supabase
    .from('product_images')
    .delete()
    .eq('id', imageId);

  if (deleteError) {
    throw new Error(`DB deletion failed: ${deleteError.message}`);
  }
}

/**
 * 商品削除時に紐づく全画像を Storage から削除
 */
export async function deleteAllProductImages(productId: string): Promise<void> {
  const supabase = createClient();

  // 1. 全画像のパスを取得
  const { data: images, error } = await supabase
    .from('product_images')
    .select('storage_path')
    .eq('product_id', productId);

  if (error || !images || images.length === 0) return;

  // 2. Storage から一括削除
  const paths = images.map((img) => img.storage_path);
  const { error: storageError } = await supabase.storage
    .from('product-images')
    .remove(paths);

  if (storageError) {
    console.error('Bulk storage deletion failed:', storageError);
  }

  // DB レコードは ON DELETE CASCADE で自動削除される
}

/**
 * メイン画像を切り替え
 */
export async function setMainImage(
  productId: string,
  imageId: string
): Promise<void> {
  const supabase = createClient();

  // 1. 既存のメインを解除
  await supabase
    .from('product_images')
    .update({ is_main: false })
    .eq('product_id', productId)
    .eq('is_main', true);

  // 2. 新しいメインを設定
  const { error } = await supabase
    .from('product_images')
    .update({ is_main: true })
    .eq('id', imageId)
    .eq('product_id', productId);

  if (error) {
    throw new Error(`Failed to set main image: ${error.message}`);
  }
}
```

### 4.3 商品登録ページの修正

`/app/admin/products/new/page.tsx` および関連コンポーネント：

#### 修正点

1. **AILabelExtractor の onExtracted ハンドラを修正**
   - AI 抽出結果をフォームに反映する際、**画像ファイル（File オブジェクト）も一緒に保持**する
   - 画像は親コンポーネントの state として保持しておく

2. **登録ボタンの実装**
   - 「下書き保存」: `status='draft'` で保存
   - 「公開して登録」: `status='published'` で保存
   - 両ボタンとも同じ `createProduct` Server Action を呼ぶが、`status` を引数で渡す

3. **保存処理の流れ**
   ```typescript
   async function handleSave(status: 'draft' | 'published') {
     // 1. products テーブルに INSERT して product_id を取得
     const product = await createProduct({ ...formData, status });

     // 2. 各画像を 2048px にリサイズ
     const resizedFiles = await Promise.all(
       imageFiles.map(file => resizeImageForStorage(file, 2048))
     );

     // 3. Supabase Storage にアップロード
     const uploadedImages = await Promise.all(
       resizedFiles.map((file, index) =>
         uploadProductImage(product.id, file, getRoleByIndex(index))
       )
     );

     // 4. product_images テーブルに INSERT
     await insertProductImages(product.id, uploadedImages);

     // 5. リダイレクト
     redirect(status === 'published' ? '/admin/products' : '/admin/products?status=draft');
   }
   ```

### 4.4 商品編集ページの修正

`/app/admin/products/[id]/edit/page.tsx`（既存パスに合わせる）：

1. **既存画像の表示 + 削除ボタン**
2. **新規画像の追加 UI**（最大 3 枚まで）
3. **メイン画像の切り替えボタン**
4. **公開状態の切り替えボタン**
   - 現在 `draft` なら「公開する」「下書きのまま保存」
   - 現在 `published` なら「非公開にする」「変更を保存」
5. **AI ラベル読み取りの再実行**（既存画像を置き換えたい場合）

### 4.5 商品一覧ページの修正

`/app/admin/products/page.tsx`：

1. **status カラムを表示**（バッジ形式）
2. **メイン画像をサムネとして表示**
3. **フィルター不要**（混在表示で OK）

### 4.6 飲食店（バイヤー）向けページの修正

既存の発注画面（パスは Claude Code が既存実装を確認）：

1. **`status='published'` の商品のみ表示**するように WHERE 句を追加
2. RLS で制御されているなら不要だが、明示的にクエリにも入れておくと安全

---

## 5. 完了確認チェックリスト

### マイグレーション

- [ ] `012_add_product_images_and_status.sql` 作成済み
- [ ] `products.status` カラム追加（既存になければ）
- [ ] `product_images` テーブル作成
- [ ] Supabase Storage `product-images` バケット作成
- [ ] RLS ポリシー設定済み

### 共通ライブラリ

- [ ] `/lib/ai/image-utils.ts` に `resizeImageForStorage()` 追加
- [ ] `/lib/storage/product-images.ts` 新規作成
- [ ] 各関数のエラーハンドリング実装

### 商品登録ページ

- [ ] 「下書き保存」「公開して登録」の 2 ボタン構成
- [ ] AI 抽出後も画像 File オブジェクトを保持
- [ ] 保存時に画像を 2048px にリサイズして Storage アップ
- [ ] product_images テーブルに INSERT
- [ ] 1 枚目を自動的にメイン画像に設定
- [ ] 保存後、適切な画面にリダイレクト

### 商品編集ページ

- [ ] 既存画像の表示
- [ ] 画像の追加・削除・差し替え
- [ ] メイン画像の切り替え
- [ ] 公開状態の切り替えボタン
- [ ] AI ラベル読み取りの再実行

### 商品一覧ページ（管理画面）

- [ ] 公開・非公開を混在表示
- [ ] 状態バッジの表示
- [ ] メイン画像のサムネイル表示

### 飲食店向け発注画面

- [ ] 非公開商品が表示されないことを確認
- [ ] RLS が正しく動作することを確認

### 動作確認

- [ ] 新規登録 → 画像 3 枚 → 下書き保存 → 一覧で「下書き」バッジ表示
- [ ] 編集画面で「公開する」 → 一覧で「公開中」バッジ
- [ ] 飲食店アカウントでログイン → 公開商品のみ表示
- [ ] メイン画像の切り替え → サムネが変わる
- [ ] 商品削除 → Storage からも画像が消える（Supabase Dashboard で確認）

---

## 6. デザインの方針

しょーたさんの指示：**デザインの詳細は Claude Code が既存スタイルガイドに合わせて判断**してOK。

ただし、以下の優先度を意識：

1. **「公開して登録」ボタンを最も目立たせる**（メインアクション）
2. **「下書き保存」は控えめだが、明確に存在を主張する**（サブアクション）
3. **公開状態のバッジは一目で区別できる色分け**
4. **画像プレビュー UI は AI ラベル読取パネルと統一感を持たせる**

既存の Mise デザインシステム（カラー・タイポグラフィ・コンポーネント）に従うこと。

---

## 7. 後回しにする項目（このフェーズでは実装しない）

- Cropping（画像トリミング）機能
- ドラッグ&ドロップによる画像並び替え
- 画像の OCR 後のテキスト編集 UI
- 画像のフィルター・色補正
- 動画の対応
- 在庫切れ時の自動非公開

これらは将来の拡張機能として保留。

---

## 8. 不明点があった場合

以下のような場合は、しょーたさんに確認してから進めること：

- 既存の `products` テーブルのカラム名（status か published か）
- 既存の RLS ポリシーの命名規則
- 既存の商品一覧ページのレイアウト構造
- バイヤー側の発注画面のパス
- 編集画面のパス（`/admin/products/[id]/edit` で合っているか）

---

以上。実装完了後、しょーたさんに動作確認を依頼すること。
