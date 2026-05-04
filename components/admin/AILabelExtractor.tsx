"use client";

// components/admin/AILabelExtractor.tsx
// 1〜3 枚のラベル画像をアップロードして AI で抽出する UI

import { useState } from "react";
import {
  resizeImageToBase64,
  validateImageFile,
} from "@/lib/ai/image-utils";
import type { WineExtractionResult } from "@/types/wine-extraction";

interface Props {
  onExtracted: (data: WineExtractionResult) => void;
}

export default function AILabelExtractor({ onExtracted }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUsage, setLastUsage] = useState<{
    cost: number;
    tokens: number;
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;

    if (files.length + selected.length > 3) {
      setError("画像は最大 3 枚まで");
      return;
    }

    for (const file of selected) {
      const result = validateImageFile(file);
      if (!result.valid) {
        setError(result.error || "ファイルが不正です");
        return;
      }
    }

    setError(null);
    setFiles((prev) => [...prev, ...selected]);

    selected.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviews((prev) => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemove = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleExtract = async () => {
    if (files.length === 0) {
      setError("画像を 1 枚以上選択してください");
      return;
    }

    setLoading(true);
    setError(null);
    setLastUsage(null);

    try {
      const images = await Promise.all(
        files.map((file) => resizeImageToBase64(file, 1024))
      );

      const res = await fetch("/api/ai/extract-label", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images }),
      });

      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || "抽出に失敗しました");
      }

      onExtracted(json.data);

      if (json.usage) {
        setLastUsage({
          cost: json.usage.estimated_cost_usd,
          tokens: json.usage.input_tokens + json.usage.output_tokens,
        });
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "予期せぬエラーが発生しました"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-[#6B1A35]/20 rounded-xl p-6 mb-6 bg-gradient-to-br from-[#FDF4F6] to-amber-50">
      <h3 className="text-base font-semibold text-gray-900 mb-1">
        📷 ラベル写真から自動入力
      </h3>
      <p className="text-xs text-gray-600 mb-4 leading-relaxed">
        ワインのラベル写真をアップロードすると、AI
        が商品情報を自動で読み取ります。
        <br />
        <span className="text-gray-500">
          推奨: 表ラベル + 裏ラベルの 2 枚（最大 3
          枚・日本語シールがあれば 3 枚目に追加）
        </span>
      </p>

      <div className="mb-4">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleFileChange}
          disabled={loading || files.length >= 3}
          className="block w-full text-sm text-gray-700
                     file:mr-4 file:py-2 file:px-4
                     file:rounded-md file:border-0
                     file:text-sm file:font-semibold
                     file:bg-[#6B1A35] file:text-white
                     hover:file:bg-[#9B2D50]
                     disabled:opacity-50"
        />
        <p className="text-xs text-gray-500 mt-1">
          {files.length} / 3 枚選択中
        </p>
      </div>

      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {previews.map((src, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`preview ${i + 1}`}
                className="w-full h-32 object-cover rounded border border-gray-200 bg-white"
              />
              <button
                type="button"
                onClick={() => handleRemove(i)}
                disabled={loading}
                aria-label="削除"
                className="absolute top-1 right-1 bg-white/90 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold text-gray-700 hover:bg-white disabled:opacity-50"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="text-xs text-red-600 mb-3 leading-relaxed">{error}</div>
      )}

      <button
        type="button"
        onClick={handleExtract}
        disabled={loading || files.length === 0}
        className="px-5 py-2 bg-[#6B1A35] text-white text-sm font-medium rounded-md hover:bg-[#9B2D50] disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {loading ? "解析中… (10〜20秒)" : "AI で抽出する"}
      </button>

      {lastUsage && (
        <p className="text-xs text-gray-500 mt-3">
          ✓ 抽出完了 / トークン: {lastUsage.tokens.toLocaleString()} / コスト: $
          {lastUsage.cost.toFixed(4)}
        </p>
      )}
    </div>
  );
}
