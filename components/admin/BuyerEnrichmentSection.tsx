"use client";

// components/admin/BuyerEnrichmentSection.tsx
// 顧客カルテに埋め込む「店舗情報の自動取込」セクション。
// Phase 1: HP URL 入力 + AI 取込（fetch + Anthropic 抽出 + jsonb 保存）。

import { useState, useTransition } from "react";
import { Sparkles, ExternalLink } from "lucide-react";
import {
  enrichBuyerProfileAction,
  updateBuyerUrlsAction,
} from "@/app/(admin)/admin/buyers/actions";
import type { BuyerProfileEnriched } from "@/types/buyer-enrichment";

type Props = {
  buyerId: string;
  initialHpUrl: string | null;
  initialInstagramUrl: string | null;
  initialGmapsUrl: string | null;
  initialEnriched: BuyerProfileEnriched | null;
  initialEnrichedAt: string | null;
};

export function BuyerEnrichmentSection({
  buyerId,
  initialHpUrl,
  initialInstagramUrl,
  initialGmapsUrl,
  initialEnriched,
  initialEnrichedAt,
}: Props) {
  const [hpUrl, setHpUrl] = useState(initialHpUrl ?? "");
  const [instagramUrl, setInstagramUrl] = useState(initialInstagramUrl ?? "");
  const [gmapsUrl, setGmapsUrl] = useState(initialGmapsUrl ?? "");
  const [enriched, setEnriched] = useState<BuyerProfileEnriched | null>(
    initialEnriched
  );
  const [enrichedAt, setEnrichedAt] = useState<string | null>(
    initialEnrichedAt
  );

  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function saveAndEnrich() {
    setMessage(null);
    setErrorMsg(null);

    if (!hpUrl.trim()) {
      setErrorMsg("HP URL を入力してください");
      return;
    }

    startTransition(async () => {
      // 1) URLs 保存
      const saveResult = await updateBuyerUrlsAction(buyerId, {
        hp_url: hpUrl.trim() || null,
        instagram_url: instagramUrl.trim() || null,
        gmaps_url: gmapsUrl.trim() || null,
      });
      if (!saveResult.ok) {
        setErrorMsg(saveResult.error ?? "URL 保存に失敗");
        return;
      }

      // 2) HP enrich
      const enrichResult = await enrichBuyerProfileAction(buyerId);
      if (!enrichResult.ok) {
        setErrorMsg(enrichResult.error ?? "取込に失敗");
        return;
      }

      // 3) 反映
      setEnrichedAt(new Date().toISOString());
      setMessage("✓ AI 取込が完了しました");
      // ページ再フェッチで enriched を取り直す動線が綺麗だが、
      // ここでは action 後に router.refresh しても良い。
      // とりあえず enriched 自体は更新しないので「最新は再読込してください」表示
    });
  }

  function saveUrlsOnly() {
    setMessage(null);
    setErrorMsg(null);
    startTransition(async () => {
      const result = await updateBuyerUrlsAction(buyerId, {
        hp_url: hpUrl.trim() || null,
        instagram_url: instagramUrl.trim() || null,
        gmaps_url: gmapsUrl.trim() || null,
      });
      if (!result.ok) {
        setErrorMsg(result.error ?? "URL 保存に失敗");
      } else {
        setMessage("✓ URL を保存しました");
      }
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="caps mb-2">店舗情報の自動取込</p>
        <p className="font-italic-serif text-sm text-ink-3 leading-relaxed">
          公式 HP の URL を登録して「AI で取込」を押すと、業態・看板料理・季節傾向などを自動抽出します。
          Instagram / Google Maps は今後対応予定。
        </p>
      </div>

      {/* URL inputs */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs caps text-ink-3 mb-1">公式 HP</label>
          <input
            type="url"
            value={hpUrl}
            onChange={(e) => setHpUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full border border-rule rounded-lg px-3 py-2 text-sm bg-paper-cream"
          />
        </div>

        <div>
          <label className="block text-xs caps text-ink-3 mb-1">
            Instagram <span className="ml-2 text-[10px] text-ink-4 normal-case">— Phase 2 対応予定</span>
          </label>
          <input
            type="url"
            value={instagramUrl}
            onChange={(e) => setInstagramUrl(e.target.value)}
            placeholder="https://instagram.com/..."
            className="w-full border border-rule rounded-lg px-3 py-2 text-sm bg-paper-cream"
          />
        </div>

        <div>
          <label className="block text-xs caps text-ink-3 mb-1">
            Google Maps <span className="ml-2 text-[10px] text-ink-4 normal-case">— Phase 2 対応予定</span>
          </label>
          <input
            type="url"
            value={gmapsUrl}
            onChange={(e) => setGmapsUrl(e.target.value)}
            placeholder="https://maps.app.goo.gl/..."
            className="w-full border border-rule rounded-lg px-3 py-2 text-sm bg-paper-cream"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={saveAndEnrich}
          disabled={pending || !hpUrl.trim()}
          className="inline-flex items-center gap-1.5 bg-violet text-paper px-4 py-2 rounded-lg text-sm hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {pending ? "取込中…(10〜20秒)" : "AI で店舗情報を取込"}
        </button>
        <button
          type="button"
          onClick={saveUrlsOnly}
          disabled={pending}
          className="text-sm px-3 py-2 border border-rule rounded-lg text-ink-2 hover:bg-paper-2 disabled:opacity-40 transition-colors"
        >
          URL のみ保存
        </button>
      </div>

      {message && <p className="text-xs text-forest">{message}</p>}
      {errorMsg && <p className="text-xs text-crimson">{errorMsg}</p>}

      {/* 取込結果プレビュー */}
      {enriched ? (
        <div className="card-float p-5 space-y-3 mt-3">
          <div className="flex items-baseline justify-between border-b border-rule pb-2">
            <p className="caps text-violet">⚡ AI 取込結果</p>
            {enrichedAt && (
              <p className="text-[11px] text-ink-3 font-italic-serif">
                {new Date(enrichedAt).toLocaleString("ja-JP")} 取込
              </p>
            )}
          </div>

          <Row label="業態" value={enriched.cuisine_type} />
          <RowList label="看板料理" values={enriched.signature_dishes} />
          <RowList label="主要食材" values={enriched.main_ingredients} />
          <Row label="季節フォーカス" value={enriched.seasonal_focus} />
          <Row label="ドリンク方針" value={enriched.drink_focus} accent="violet" />
          <Row label="価格帯（推定）" value={enriched.price_range_estimate} />
          <Row label="雰囲気" value={enriched.atmosphere} long />

          {enriched.notes_for_wine_buyer && (
            <div className="bg-violet-bg border-l-2 border-violet rounded-r p-3 mt-2">
              <p className="caps text-violet text-[10px] mb-1">⚡ AI のメモ</p>
              <p className="text-xs text-ink-2 font-italic-serif leading-relaxed">
                {enriched.notes_for_wine_buyer}
              </p>
            </div>
          )}

          {enriched.source_url && (
            <a
              href={enriched.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-ink-3 hover:text-plate transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              元 URL を開く
            </a>
          )}
        </div>
      ) : (
        <p className="text-xs text-ink-3 font-italic-serif">
          まだ取込結果はありません。HP URL を入れて「AI で取込」を押してください。
        </p>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  accent,
  long,
}: {
  label: string;
  value: string | null;
  accent?: "violet";
  long?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex items-baseline gap-3 text-sm">
      <span className="caps text-ink-3 w-28 shrink-0">{label}</span>
      <span
        className={`flex-1 ${long ? "font-italic-serif text-ink-2 leading-relaxed" : "font-serif text-ink"} ${
          accent === "violet" ? "text-violet" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function RowList({ label, values }: { label: string; values: string[] }) {
  if (values.length === 0) return null;
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="caps text-ink-3 w-28 shrink-0 mt-1">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v, i) => (
          <span
            key={i}
            className="inline-flex items-center px-2 py-0.5 text-[11px] border border-rule-strong text-ink-2 font-italic-serif rounded"
          >
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}
