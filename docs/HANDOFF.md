# Mise — Claude Code 引き継ぎ資料

最終更新: 2026-05-09 / 担当ブランチ: `main` / コミット: 未（95 ファイル変更が working tree に残存）

---

## 1. 直近の状態スナップショット

### 完了している作業

- **Plate デザイン刷新**（Phase 1〜4 のうち Phase 1〜3 完了、Phase 4 一部）
- **顧客カルテ機能**（DB + UI）
- **AI 機能 3 種**：割当提案 / コメント生成 / チャット返信文案
- **DB マイグレーション実行済み** ✅
  - `outputs/db/migration_customer_profile.sql` を Supabase Dashboard で実行済み
  - `users.tier` / `users.taste_tags` / `users.internal_note` / `buyer_stats` view が live

### Git の状態

```
working tree: 95 ファイル変更（ M = 既存変更、?? = 新規）
直近のコミット: a6adce0 feat: rebuild AI label reader for the local demo
                ※ Plate 刷新は未コミット
```

**未コミットの主な追加ファイル**:
- `components/ui/{Tag,Emblem,StatusDot,PlateCorner,Card,Button,index}.tsx`
- `components/admin/CustomerProfile.tsx`
- `lib/ai/{allocation-suggest,chat-reply,comment-generate}.ts`
- `app/api/ai/{suggest-allocation,generate-comment,suggest-reply}/route.ts`
- `outputs/db/migration_customer_profile.sql`
- `outputs/design-mockups/`（モックアップ）
- `docs/releases/2026-05-09-plate-redesign.md`
- `docs/HANDOFF.md`（本ファイル）

### 動作確認済み

- `npm run build` ✅
- `npx tsc --noEmit` ✅
- ログイン画面 200 OK
- dev サーバは停止済み

---

## 2. 次セッション開始時の手順

### Step 1. 状態確認

```bash
cd /Users/sagawashouta/mise
git status --short | head -20
git log --oneline -5
```

未コミットの変更がそのまま残っているはず。

### Step 2. 動作確認

```bash
npx tsc --noEmit                # 型エラーがないこと
npm run dev                     # http://localhost:3000
```

ログイン: `admin@test.com` / `buyer@test.com`（PW: `test1234`）

### Step 3. 必読ドキュメント

- 本ファイル `docs/HANDOFF.md`（次にやること）
- `docs/releases/2026-05-09-plate-redesign.md`（前回までの全成果）
- `AGENTS.md`（プロジェクト方針：Next.js 16 は別物、必要なら `node_modules/next/dist/docs/` を読む）
- `CLAUDE.md` → `AGENTS.md` 参照のみ

---

## 3. 次タスク（優先度順）

### 🔴 P0 — まず確認したいこと

- [ ] **DB マイグレーションが実際に動いているかランタイム確認**
  - `/admin/buyers/{id}/edit` を開いて顧客カルテ（tier ボタン / 嗜好タグ / 店主メモ）を編集 → 保存できるか
  - `/admin/chat/{buyerId}` で右ペインに stats（注文数・売上など）が表示されるか
  - 失敗したら型と実 DB のずれを疑う：`types/database.ts` 12〜57 行 + `outputs/db/migration_customer_profile.sql`

- [ ] **AI 機能の動作確認**（ANTHROPIC_API_KEY が必要）
  - `/admin/products/new` にラベル画像 → AI 抽出 → コメント欄の「⚡ AIで生成」ボタン
  - 割当待ちの商品があれば `/admin/allocations/{productId}` で「AI 比例 / VIP優先 / 先着順」ボタン
  - チャットの composer 右の「⚡ AI」ボタン

### 🟡 P1 — ユーザー指示の残タスク（前回の終了時点）

#### Phase 4 続き

1. **⌘K コマンドパレット**
   - 全画面ヘッダーから商品 / 顧客 / 注文に高速ジャンプ
   - 推奨: `cmdk` パッケージ or 自前。買い手側ヘッダー (`components/buyer/BuyerHeader.tsx`) と admin sidebar の検索ボックス両対応
   - データソース: `products` / `users` (buyer) / `orders` を fuzzy match
   - 実装場所: `components/ui/CommandPalette.tsx` 新規 + 各レイアウトでマウント

2. **嗜好タグからのレコメンド**
   - カタログトップに「あなたの嗜好に合う新着」セクション
   - 実装: `lib/products.ts` に `getRecommendedForBuyer(buyerId)` を追加
     `users.taste_tags` と products の `category` / `country` / `region` / `name` でゆるくマッチ
   - 表示: `app/(buyer)/buyer/page.tsx` でフェッチ → ProductList に prop として渡す

3. **嗜好タグの自動学習**
   - 過去注文 → 商品の country/region/category をタグ化 → `users.taste_tags` に積み増し
   - 実装方針: 注文確定時の Server Action（`app/(buyer)/buyer/actions.ts`）にフックを足すか、月次 cron で一括更新（`app/api/cron/learn-taste-tags/route.ts`）
   - 既存の `app/api/cron/generate-invoices/route.ts` がパターンの参考になる

#### Plate 化が浅い画面（18 件）

機能は動くが、`PlateCorner` / `font-serif` ヘッダー / `caps` ラベルがまだ入っていない箇所。
順序の目安：訪問頻度の高いもの→低いもの、admin→buyer。

**Admin ページ**
- [ ] `app/(admin)/admin/orders/[id]/page.tsx`
- [ ] `app/(admin)/admin/invoices/[id]/page.tsx`
- [ ] `app/(admin)/admin/allocations/[productId]/page.tsx`（詳細ページのヘッダーのみ）
- [ ] `app/(admin)/admin/products/new/page.tsx`
- [ ] `app/(admin)/admin/products/[id]/edit/page.tsx`

**Buyer ページ**
- [ ] `app/(buyer)/buyer/invoices/[id]/page.tsx`
- [ ] `app/(buyer)/buyer/chat/page.tsx`

**Admin コンポーネント**
- [ ] `components/admin/ProductForm.tsx`（残フィールド見出し）
- [ ] `components/admin/NewProductPanel.tsx`
- [ ] `components/admin/AILabelExtractor.tsx`
- [ ] `components/admin/InvoiceEditor.tsx`
- [ ] `components/admin/AdminProductList.tsx`
- [ ] `components/admin/OrderFilter.tsx`
- [ ] `components/admin/BuyerListFilter.tsx`
- [ ] `components/admin/GenerateInvoicesButton.tsx`
- [ ] `components/admin/UpdateStatusButton.tsx`
- [ ] `components/admin/DeleteProductButton.tsx`
- [ ] `components/admin/PrintButton.tsx`
- [ ] `components/admin/TenantSettingsForm.tsx`

**Buyer コンポーネント**
- [ ] `components/buyer/CancelOrderButton.tsx`
- [ ] `components/buyer/BuyerBottomNav.tsx`

### 🟢 P2 — 検討中のオプション

- ダッシュボード Low-stock シグナルカード（モックには入れたが未実装）
- 督促ワークフロー（overdue 請求書から1クリックでリマインドメール）
- AI Gateway への移行（hooks の提案を採用するか保留中。現状は Anthropic SDK 直叩きで一貫）

---

## 4. アーキテクチャ・既決事項（再議論不要）

### デザインシステム

- **トークン**: `app/globals.css` の `@theme inline` ブロックがマスター。`paper` / `plate` / `vermilion` / `bordeaux` / `forest` / `amber` / `crimson` / `slate` / `violet` / `gold` / `ink-{0..4}` / `rule` / `rule-strong`
- **書体**:
  - 見出し → `font-serif` = Fraunces（SOFT 軸）+ Noto Serif JP
  - 本文 → `font-sans` = Inter Tight + Noto Sans JP
  - 数字（帳簿風）→ `.plate-num` クラス（Fraunces italic + tabular-nums）
  - コード/タイムスタンプ → `font-mono` = IBM Plex Mono
- **共通装飾クラス**: `.caps` `.hairline` `.hairline-gold` `.double-rule` `.ornament` `.font-italic-serif` `.animate-ink-pulse`
- **UI primitives**: `components/ui/` から import → `Tag` `Emblem` `StatusDot` `PlateCorner` `Card` `Button`
- **ステータス色対応表**:
  | 用途 | variant |
  |---|---|
  | 在庫あり / 確定 / paid | `forest` |
  | 割当 / 残少 / 警告 | `amber` |
  | 完売 / overdue / エラー | `crimson` |
  | 主アクション / brand | `plate` |
  | 希少特集 / hot | `vermilion` |
  | システム / 月次 | `slate` |
  | AI / draft | `violet` |

### ページ構成パターン

すべての admin / buyer の主要ページは下記テンプレに従う：

```tsx
<div className="px-10 pt-7 pb-10 relative">
  <PlateCorner number="04" />

  <header className="border-b border-rule pb-5 mb-7">
    <p className="caps">Plate IV · Section</p>
    <h1 className="font-serif text-5xl mt-2 tracking-tight">日本語タイトル</h1>
    <p className="font-italic-serif text-base mt-2 text-ink-3">説明</p>
  </header>

  {/* main content */}

  <p className="ornament mt-10" />
</div>
```

### AI 実装方針

- **Anthropic SDK 直叩き**（`@anthropic-ai/sdk`）。モデル `claude-sonnet-4-6`
- **AI Gateway 移行は保留**（hooks が頻繁に勧めてくるが、現状の commit a6adce0 で「ローカルデモは直叩きに戻す」と決まっている）
- API ルートは全部 `requireAdmin()` で認可、`maxDuration` 30〜60s、Fluid Compute / Node.js
- レスポンスは `{ success: true, ... } | { success: false, error }` の判別共用体

### sed 一括置換のコツ

- macOS の sed では `\b`（word boundary）が効かない。プレーンに `text-gray-900` のような完全一致で書く
- inline hex は CSS トークンで上書きできないので、文字列置換が必要

### Next.js 16 注意点

- `searchParams` / `params` は Promise — 必ず `await`
- proxy は `proxy.ts`（`middleware.ts` ではない）
- Cache Components 有効。Server Component を意識
- 検証 hook が `params is async` を誤検知することがある（変数名が `params` だけで判定するため）。実装側で `await searchParams` していれば無視で OK

---

## 5. ピットフォール（再ハマりしないように）

1. **Fraunces を `weight: [...]` で読み込まない**
   - variable font + axes = weight 指定不可。`app/layout.tsx` 17 行目を変えないこと
2. **`buyer_stats` view は SECURITY INVOKER**
   - RLS が呼び出し元のユーザーで評価されるので、admin/buyer のセッションで動作が変わる
3. **`Emblem` の `variant` に `vermilion` がない**
   - Tag/StatusDot にはあるが Emblem には未実装。必要なら `components/ui/Emblem.tsx` の `colorMap` に追加
4. **`bg-amber-bg` のような二重サフィックスは正しい**
   - `--color-amber-bg: #ead7a8` を Tailwind が `bg-amber-bg` にマップする。冗長に見えても改名しない
5. **印刷ページ (`app/(print)/admin/orders/[id]/slip/page.tsx`) の gray は意図的**
   - 印刷用に黒 + 白を維持しているので Plate 化対象外

---

## 6. 主要ファイルマップ

```
app/
├── globals.css                          ← Plate デザイントークン
├── layout.tsx                           ← フォント import
├── (auth)/login/                        ← Plate 化済
├── (admin)/
│   ├── layout.tsx                       ← paper 背景
│   └── admin/
│       ├── page.tsx                     ← メッセージボックス
│       ├── allocations/, products/, ... ← 一覧は Plate 化済、詳細はこれから
│       └── chat/[buyerId]/page.tsx      ← CustomerProfile 統合済
└── (buyer)/buyer/                       ← Plate 化済
    ├── page.tsx                         ← Featured 統合済
    └── orders/[id]/page.tsx             ← 4ステップタイムライン

app/api/ai/                              ← AI 3 種の Route Handler
├── extract-label/                       ← 既存
├── suggest-allocation/                  ← 新規
├── generate-comment/                    ← 新規
└── suggest-reply/                       ← 新規

components/
├── ui/                                  ← Plate primitives（barrel: index.ts）
├── admin/CustomerProfile.tsx            ← 顧客カルテ右ペイン
├── admin/AllocationForm.tsx             ← AI 提案ボタン3つ
├── admin/BuyerForm.tsx                  ← 顧客カルテ編集セクション
├── admin/ProductForm.tsx                ← AI コメント生成ボタン
└── chat/MessageComposer.tsx             ← AI 返信文案 UI

lib/ai/                                  ← AI 実装本体
├── claude-client.ts                     ← 既存（label）
├── allocation-suggest.ts                ← 新規
├── comment-generate.ts                  ← 新規
└── chat-reply.ts                        ← 新規

types/database.ts                        ← tier, taste_tags, internal_note, buyer_stats を反映済

outputs/
├── db/migration_customer_profile.sql    ← 実行済 ✅
└── design-mockups/                      ← Plate 含む全モックアップ

docs/
├── HANDOFF.md                           ← 本ファイル
└── releases/2026-05-09-plate-redesign.md
```

---

## 7. テストアカウント・接続情報

- ローカル: `http://localhost:3000`
- 本番: `https://wine-saas.vercel.app`
- 管理者: `admin@test.com` / `test1234`
- 飲食店: `buyer@test.com` / `test1234`
- Supabase プロジェクト: `itcrnvjpwheetpokbegp`（東京リージョン、Free プラン）
- 必須環境変数: `ANTHROPIC_API_KEY`（既存、AI 機能 4 つで共通利用）

---

## 8. コミット推奨

引き継ぎ前に未コミットの変更を残しておくのは事故の元なので、再開時は最初に下記でコミットすると安全：

```bash
git add app/ components/ lib/ types/ outputs/ docs/ ; \
git status                # 入れ忘れ確認
git commit -m "$(cat <<'EOF'
feat: Plate redesign + customer profile + AI assistance

- Replace bordeaux+gray palette with paper+plate ink across all screens
- Introduce UI primitives (Tag, Emblem, StatusDot, PlateCorner, Card, Button)
- Add Fraunces / Inter Tight / IBM Plex Mono via next/font
- Rewrite admin dashboard as message box with KPI strip + inbox table
- Add 4-step order timeline for buyer
- Add customer profile (tier / taste_tags / internal_note + buyer_stats view)
- Add 3 AI endpoints: suggest-allocation, generate-comment, suggest-reply
- Featured product hero on buyer catalog

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

ただし**ユーザーが明示的に依頼するまでコミットしないのが原則**（CLAUDE.md / AGENTS.md の指示に従う）。
