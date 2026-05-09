# Plate Redesign + 顧客カルテ + AI 機能 3 種

- 日付: 2026-05-09
- ブランチ: `main`（直接編集）
- 種類: デザイン刷新 + 機能追加

---

## 変更概要

### Plate 化（全面デザイン刷新）

ボルドー＋ゴールドの旧トーンを廃し、「**古本のような紙肌のうえに藍墨インク**」をメインとした
Editorial × Plate（銅版画的）方向に全画面を書き直した。

- 背景：`#e8e2d4` の paper トーン + 紙質ノイズ（body 全体に grain）
- 主役の差し色：**藍墨 `#1c3a5c`（plate）** — 旧 bordeaux `#6B1A35` を全置換
- 副次色：`#5a1428`（bordeaux）、`#b13a2a`（vermilion 朱）、`#8a6a1a`（gold 罫線）
- ステータス：forest / amber / crimson / slate / violet の 5 色を「インクスタンプ」として明確化
- タイポグラフィ：見出し `Fraunces`（SOFT 軸）、本文 `Inter Tight + Noto Sans JP`、数字は `Fraunces italic` で帳簿風（`.plate-num`）、コード/コンマ `IBM Plex Mono`
- 装飾：`Plate № 04` 角印 / `✦   ✦   ✦` フルロン / 二重罫線 `══`

### Phase 別進捗

| Phase | 内容 | 状態 |
|---|---|---|
| 1 | デザイントークン基盤 + UI primitives + 全画面スイープ | ✅ 完了 |
| 2 | 顧客カルテ（DB + UI） | ✅ 完了 |
| 3 | AI 拡張（割当提案 / コメント生成 / チャット返信） | ✅ 完了 |
| 4 | 演出（Featured 表示 / レコメンド / ⌘K）| 🟡 一部（Featured のみ） |

---

## 追加された画面・コンポーネント

### UI primitives（新規）

`components/ui/`

- `Tag.tsx` — outline 主体、6 variant（forest / amber / crimson / plate / vermilion / violet / slate / default）
- `Emblem.tsx` — 漢字一文字を入れる円形シール、二重リング付き、6 variant
- `StatusDot.tsx` — インクドット 8 variant、`pulse` 対応
- `PlateCorner.tsx` — 各ページ右上の `Plate № NN` 角印
- `Card.tsx` — 紙ベースのカードコンテナ
- `Button.tsx` — primary（藍墨）/ vermilion / default / ghost
- `index.ts` — barrel export

### 新規コンポーネント

- `components/admin/CustomerProfile.tsx`
  チャット右ペイン用の顧客カルテ。tier / 嗜好タグ / 30日売上 / 累計売上 / 累計注文数 / 最終注文日 / 店主メモを表示。

### 既存画面の Plate 化（書き直し）

**Buyer 側**
- `app/(buyer)/buyer/page.tsx` + `components/buyer/ProductList.tsx` — Editorial ヒーロー + 店主推薦カード + Fig.(a) 線画キャプション + モーダル
- `app/(buyer)/buyer/cart/page.tsx`
- `app/(buyer)/buyer/cart/confirm/page.tsx`
- `app/(buyer)/buyer/orders/complete/page.tsx`
- `app/(buyer)/buyer/orders/page.tsx`
- `app/(buyer)/buyer/orders/[id]/page.tsx` — **4ステップタイムライン**（ordered → deadline → allocated → shipped）
- `app/(buyer)/buyer/invoices/page.tsx`
- `components/buyer/BuyerHeader.tsx`

**Admin 側**
- `app/(admin)/admin/page.tsx` — **メッセージボックス**として全面書き換え（KPI ストリップ + Inbox テーブル）
- `app/(admin)/admin/allocations/page.tsx`
- `app/(admin)/admin/products/page.tsx`
- `app/(admin)/admin/invoices/page.tsx`
- `app/(admin)/admin/buyers/page.tsx`
- `app/(admin)/admin/buyers/[id]/edit/page.tsx`
- `app/(admin)/admin/settings/page.tsx`
- `app/(admin)/admin/chat/[buyerId]/page.tsx` — 顧客カルテを 3 カラム目に追加
- `components/admin/AdminSideNav.tsx`
- `components/admin/StatusBadge.tsx`（Tag 経由で再実装）
- `components/admin/AllocationForm.tsx` — AI 提案ボタン3つ追加
- `components/admin/BuyerForm.tsx` — 顧客カルテ編集セクション追加
- `components/admin/ProductForm.tsx` — コメントを controlled に + AI 生成ボタン
- `components/chat/AdminThreadList.tsx`
- `components/chat/AdminThreadView.tsx` — `enableAISuggestions` で AI ボタンを有効化
- `components/chat/MessageComposer.tsx` — AI 返信文案 UI（紫アクセント）
- `components/chat/ThreadView.tsx` — `enableAISuggestions` propagate
- `components/LogoutButton.tsx`

**Auth**
- `app/(auth)/login/page.tsx`

**Layout**
- `app/layout.tsx` — Fraunces / Inter Tight / IBM Plex Mono / Noto Serif JP を `next/font/google` で導入
- `app/globals.css` — Tailwind v4 `@theme inline` で Plate トークン全公開
- `app/(admin)/layout.tsx` — 背景を paper に

### 全体スイープ

- `bg-[#6B1A35]` ほか旧 bordeaux hex 138 箇所 → 藍墨 hex に一括置換
- `bg-gray-*` / `text-gray-*` / `border-gray-*` ~250 箇所 → `paper-*` / `ink-*` / `rule` に一括置換
- `bg-red-*` / `bg-amber-*` / `bg-blue-*` / `bg-yellow-*` の汎用ステータス色 → 各種 ink-stamp トークンに置換

---

## 新規 API

3 本いずれも `requireAdmin()` で認可、Anthropic SDK 直叩き（`claude-sonnet-4-6`）、Fluid Compute / Node.js ランタイム。

| エンドポイント | 入力 | 出力 |
|---|---|---|
| `POST /api/ai/suggest-allocation` | `{ productId, strategy: "balanced" \| "tier" \| "fcfs" }` | `{ suggestions: [{ requestId, allocated, reason }], summary }` |
| `POST /api/ai/generate-comment` | `{ name, category, type, producer, vintage, country, region, grapeVariety }` | `{ comment }` |
| `POST /api/ai/suggest-reply` | `{ buyerId }`（直近20件＋直近3注文をサーバ側で組み立て）| `{ drafts: [{ label, body }] }` |

実装：

- `lib/ai/allocation-suggest.ts` — 在庫超過と希望本数のクランプを返却前に強制
- `lib/ai/comment-generate.ts` — 80〜140字、価格・在庫・希少性に言及しないプロンプト
- `lib/ai/chat-reply.ts` — 3 案生成（実務的 / 確認質問 / 提案踏み込み）

`maxDuration` は allocation = 60s、他は 30s。

---

## DB マイグレーション

**ファイル**: `outputs/db/migration_customer_profile.sql`

**実行済み: NO**（ユーザーが Supabase Dashboard の SQL Editor で実行する必要あり）

内容：

```sql
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'bronze'
    CHECK (tier IN ('gold', 'silver', 'bronze'));

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS taste_tags text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS internal_note text;

CREATE OR REPLACE VIEW public.buyer_stats AS
  -- buyer_id / tenant_id / amount_30d / amount_total / orders_total / last_ordered_at
  ...
ALTER VIEW public.buyer_stats SET (security_invoker = on);
```

**未実行のままだと壊れる箇所**：

- BuyerForm の「顧客カルテ」セクション保存 → 列が無くて 500
- Admin Chat の右ペイン顧客カルテ → stats が常に null
- AI 割当提案 → tier が読めず提案精度が落ちる（落ちるが 500 にはならない）

`types/database.ts` には新カラムと `buyer_stats` ビュー型を先行投入済み。型と実 DB の差はマイグレーション実行で解消される。

---

## 環境変数

**追加なし**。

既存の `ANTHROPIC_API_KEY`（AI ラベル読み取りで利用中のもの）を 3 つの新 API でも流用する。
新 API 用の追加キーは不要。

---

## ビルド・型チェック

- `npm run build` ✅
- `npx tsc --noEmit` ✅
- dev サーバ動作確認済み（`http://localhost:3000`）

---

## 残タスク

### Phase 4 続き

- **⌘K コマンドパレット** — 全画面ヘッダーから商品 / 顧客 / 注文に高速ジャンプ
- **嗜好タグからのレコメンド** — `taste_tags` を使って「あなたの嗜好に合う新着」をカタログトップに
- **嗜好タグの自動学習** — 過去注文 → タグ抽出 → `users.taste_tags` 自動更新（cron か Server Action）

### Plate 化が浅い画面・コンポーネント

機能優先で骨格のみ残置している箇所。順次仕上げる：

- `app/(admin)/admin/allocations/[productId]/page.tsx` — 詳細ページのヘッダー
- `app/(admin)/admin/products/new/page.tsx` / `[id]/edit/page.tsx` — 編集ページ全体
- `app/(admin)/admin/orders/[id]/page.tsx`
- `app/(admin)/admin/invoices/[id]/page.tsx`
- `app/(buyer)/buyer/invoices/[id]/page.tsx` — 詳細ページ
- `app/(buyer)/buyer/chat/page.tsx`
- `components/admin/ProductForm.tsx` — 残りのフィールド見出し
- `components/admin/NewProductPanel.tsx`
- `components/admin/AILabelExtractor.tsx`
- `components/admin/InvoiceEditor.tsx`
- `components/admin/AdminProductList.tsx`
- `components/admin/OrderFilter.tsx`
- `components/admin/BuyerListFilter.tsx`
- `components/admin/GenerateInvoicesButton.tsx`
- `components/admin/UpdateStatusButton.tsx`
- `components/admin/DeleteProductButton.tsx`
- `components/admin/PrintButton.tsx`
- `components/admin/TenantSettingsForm.tsx`
- `components/buyer/CancelOrderButton.tsx`
- `components/buyer/BuyerBottomNav.tsx`

### その他の改善余地

- 印刷スリップ（`app/(print)/admin/orders/[id]/slip/page.tsx`）は紙印刷前提のままなので gray を残置 — 必要なら別途検討
- ProductForm のトグル背景 `bg-gray-300` は意図的な OFF 表現として残置
- AI Gateway への移行（hooks 提案あり）は将来の選択肢として保留 — 現状はデモフェーズの方針通り Anthropic SDK 直叩き

### Phase 4 で検討中のオプション

- 月次バッチで `taste_tags` を自動学習する Vercel Cron
- ダッシュボードの Low-stock シグナルカード（モックには入れたが実装は未）
- 督促ワークフロー（overdue 請求書から1クリックでリマインドメール）

---

## デザインドキュメント / 参考

- モックアップ: `outputs/design-mockups/`
  - `01-editorial.html` / `02-operator.html` / `03-wamodern.html`（初稿3案）
  - `04-09` 系：Operator ダーク版の全画面
  - `E04-E09` 系：Editorial 版の全画面
  - `P01` / `P04`：Plate 採用案の代表 2 ページ
  - `index.html` で全案を比較可能
- デザイントークンの起点: `outputs/design-mockups/_plate.css` → `app/globals.css` に統合済み
