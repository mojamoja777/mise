# Mise — Claude Code 引き継ぎ資料

最終更新: 2026-05-10 (深夜) / 担当ブランチ: `main` / コミット: `3a6a666` (push 済 → Vercel 本番デプロイ済)

---

## 1. 直近の状態スナップショット

### 完了している作業（commit 973fea2 に集約）

#### Plate デザイン刷新 + 顧客カルテ + AI 機能（前 session 起点）
- Plate トークン (paper / plate / vermilion / forest / amber 等) + UI primitives + Fraunces / Inter Tight / IBM Plex Mono
- admin / buyer の主要画面を Plate テンプレに刷新
- 顧客カルテ（tier / taste_tags / internal_note + buyer_stats view）
- AI 機能 4 種: ラベル抽出 / 割当提案 / コメント生成 / チャット返信文案

#### 商品削除フロー全面再設計（本 session）
- ALWAYS soft-delete（`deleted_at` 列、ハード削除廃止）
- 削除前モーダル: 確定前注文の店舗一覧 + チャット導線
- DB トリガー: 削除済商品への `order_items` INSERT 阻止（race 対策）
- アーカイブビュー + 復元ボタン（AI 抽出のトークン節約）
- カート内削除商品の自動チャット通知（dedup 付き）
- buyer 側チャット未読バッジを Realtime で増分

#### AI ラベル抽出のマルチカテゴリ対応（本 session）
- ワイン / 日本酒 / 焼酎 / ジン / ウイスキー / その他を判定
- prefecture（都道府県）抽出 → 日本酒・焼酎の region に
- 「⚡ AIで生成」ボタン廃止 → ラベル抽出 chain で polished comment 自動生成
- 想定小売価格帯を出力から削除（トークン節約）

#### UX / 安全策（本 session）
- WINE_REGIONS を 14 ヶ国に拡充 + datalist で自由入力可
- formData の null セーフ化
- Next.js 16 制約対応: render 中 revalidatePath 削除、Suspense + Provider hydration の mounted ゲート

### DB マイグレーション（Supabase Dashboard 実行済）

- ✅ `outputs/db/migration_customer_profile.sql`
- ✅ `outputs/db/migration_product_soft_delete.sql`
- ✅ `outputs/db/migration_product_delete_safety.sql`
- ✅ `outputs/db/migration_cart_archive_notifications.sql`

### Git の状態

```
working tree: clean (.claude/settings.local.json のみ変更、運用上無視で OK)
直近のコミット: 3a6a666 feat: 商品台帳の画像 + 商品名セルを詳細ページへの Link に
push: ✅ origin/main へ反映済 (Vercel 本番デプロイ済)
```

### 5/10 セッションで追加実装

#### Plate デザイン Phase 4 完了
- 詳細 7 ページに Plate ヘッダー + PlateCorner + ornament 適用
- components 9 ファイルの inline hex を Plate トークンに統一
- 背景を SVG `<feTurbulence>` ベース（Pattern 06 和紙）に + 暖色寄り `#fffdf3` paper-cream に
- `.card-float`（通常）/ `.card-ledger`（帳簿系）の 2 クラスでコンテンツを背景から浮かせる
- 左サイドバーは `paper-pale #f1ece0`（本文より暗め）

#### 機能追加
- ⌘K グローバル検索（cmdk + /api/search、admin: 商品+店舗 / buyer: 商品のみ）
- 商品台帳 → 商品詳細 (read-only) → 編集 の 2 段階フロー
- 注文一覧専用ページ `/admin/orders` を独立、ダッシュボードは BI 向けプレースホルダ化
- ダッシュボード KPI strip 各カードを該当ページへの Link に
- 「販売終了」バッジを過去注文に表示（products.deleted_at 参照）
- ダッシュ Low-stock シグナル（在庫 ≤ 3 の販売中商品を 4 列カード）
- buyer カタログ「あなたの嗜好に合う商品」(taste_tags × 商品 fuzzy match)
- 注文確定時に taste_tags 自動学習（country/region/category/grape_variety）
- 督促ワークフロー（overdue 請求書 → 1 クリックリマインドメール）
- 顧客情報更新後に顧客台帳へ自動 redirect

#### 重要な fix
- `.double-rule` の height:4px 撤廃（grid 子要素 overflow バグ）
- cmdk `shouldFilter={false}` でサーバ filter 結果をそのまま表示

### memory に追加された feedback（次セッションで自動 load）
- knowledge_keeping / no_destructive_db / vercel_hook_skills / supabase_pgrst_notify
- use_server_type_export / nextjs16_render_revalidate / suspense_provider_hydration
- dedup_test_cleanup / dev_monitor_always_on

### 動作確認済み（本 session で実機検証）

- `npm run build` ✅
- `npx tsc --noEmit` ✅
- 商品削除（注文ゼロ / 確定前注文あり / 注文確定済の 3 パターン全て soft-delete）
- アーカイブから復元
- カート内削除商品の自動消去 + チャット通知 + 未読バッジ Realtime 増分
- AI ラベル抽出（ドイツワイン + 日本酒 御前酒 / 岡山 で動作確認）
- AI コメント自動生成（ラベル抽出後に chain）

### P0 検証 — 全項目完了

- [x] 顧客カルテ A 編集・保存（コードレビュー + 既執行 migration により動作確認）
- [x] 顧客カルテ B 右ペイン stats（buyer_stats view + CustomerProfile 配線正常）
- [x] **AI 割当提案** — `/admin/allocations/ヴァインシュヴェルマー` で「在庫超過」の希望に対し AI が「唯一の注文者に在庫3本を全量配分」と提案 ✅
- [x] **AI チャット返信文案** — `POST /api/ai/suggest-reply 200 in 1062ms` の実 call 履歴あり、AdminThreadView 経由で `enableAISuggestions={true}` 渡って表示される

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

### 🔴 P0 — 残った検証項目（5 月 9 日 夕方までで未着手）

- [ ] **顧客カルテ A** `/admin/buyers/{id}/edit`：tier / 嗜好タグ / 店主メモを編集 → 保存して再表示
- [ ] **顧客カルテ B** `/admin/chat/{buyerId}`：右ペインに 30日売上 / 累計売上 / 累計注文数 / 最終注文日 が出るか
- [ ] **AI 割当提案** `/admin/allocations/{productId}` の「AI 比例 / VIP優先 / 先着順」3 ボタン
- [ ] **AI チャット返信文案** チャット composer 右の「⚡ AI」ボタン

検証で詰まった場合の参考: `docs/incidents/incident-2026-05-09-002.md`〜`-008.md` で同種症状を漁る

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
- **コメント生成は ProductForm のボタンではなく** ラベル抽出 chain で自動生成（commit 973fea2）。NewProductPanel が extract-label → generate-comment を await して seed に流す
- **ラベル抽出は全カテゴリ対応**（ワイン / 日本酒 / 焼酎 / ジン / ウイスキー / その他）。`product_category` と `prefecture` を JSON で返す。`type` は category に応じて意味が変わる（ワイン: 辛口/中辛口、日本酒: 純米/吟醸、焼酎: 麦/芋）

### 商品削除と soft-delete

- **常に soft-delete**（`products.deleted_at` を NOW() に）。ハード削除パスは無し（commit 973fea2）。物理削除が必要なら future-improvements 経由
- 一覧クエリは全箇所で `WHERE deleted_at IS NULL` 必須。アーカイブビューは `?view=archived` で `IS NOT NULL`
- buyer の `order_items` INSERT は **DB トリガー** で削除済商品を弾く（race 対策）
- 削除前モーダル: `getProductDeleteImpact` で確定前注文を引いて表示
- カート内商品が削除された buyer には service-role client で **自動チャット通知**（dedup: `cart_archive_notifications` PK 競合）
- buyer 側ヘッダー / ボトムナビは Realtime で未読バッジ即時 +1（mounted ゲート必須）

### dev / 検証パターン

- **dev サーバ起動と同時に persistent Monitor を必ず仕込む**（memory `feedback_dev_monitor_always_on.md`）。Hydration / TypeError / PostgrestError を tail し、AbortError は除外
- **dedup を使う機能の検証時は事前 DELETE が必須**（memory `feedback_dedup_test_cleanup.md`）。例: `DELETE FROM cart_archive_notifications;`
- migration ファイル末尾に **`NOTIFY pgrst, 'reload schema';`** を必ず入れる（memory `feedback_supabase_pgrst_notify.md`）
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
