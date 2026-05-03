"use client";

// components/admin/ProductPhotoExtractor.tsx
// ボトル写真をアップロード → AI で商品情報を抽出 → 親フォームに反映するパネル

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Camera, Sparkles, X } from "lucide-react";
import {
  extractProductFromImage,
  type ExtractedProduct,
} from "@/lib/ai/extract-product";

type Props = {
  onExtracted: (data: ExtractedProduct) => void;
};

const MAX_BYTES = 6 * 1024 * 1024; // 6MB
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export function ProductPhotoExtractor({ onExtracted }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewMime, setPreviewMime] = useState<string>("image/jpeg");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setError(null);
    setSuccess(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED.includes(file.type)) {
      setError("JPEG / PNG / WebP / HEIC のみ対応しています。");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(
        `ファイルサイズが大きすぎます（${(file.size / 1024 / 1024).toFixed(1)}MB / 上限 6MB）`
      );
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setPreviewMime(file.type);
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const base64 = await fileToBase64(file);
      const result = await extractProductFromImage(base64, file.type);
      if (result.error || !result.product) {
        setError(result.error ?? "抽出に失敗しました。");
        return;
      }
      onExtracted(result.product);
      setSuccess(true);
    });
  }

  return (
    <div className="bg-gradient-to-br from-[#FDF4F6] to-white border border-[#6B1A35]/20 rounded-xl p-5 mb-6">
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#6B1A35]/10 shrink-0">
          <Sparkles className="w-5 h-5 text-[#6B1A35]" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900">
            ラベル写真から自動入力
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            ボトルやラベルの写真を選ぶと、AI が商品名・生産者・産地などを推測してフォームに反映します。
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={pending}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#6B1A35] text-white text-xs font-medium rounded-lg hover:bg-[#9B2D50] disabled:opacity-50 transition-colors"
            >
              <Camera className="w-3.5 h-3.5" />
              {previewUrl ? "別の写真を選ぶ" : "写真を選択"}
            </button>
            {previewUrl && (
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
              >
                <X className="w-3 h-3" />
                クリア
              </button>
            )}
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED.join(",")}
              onChange={onFileChange}
              className="hidden"
            />
          </div>

          {previewUrl && (
            <div className="mt-3 flex items-start gap-3">
              <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 bg-white shrink-0">
                <Image
                  src={previewUrl}
                  alt="アップロード画像"
                  fill
                  sizes="80px"
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="text-xs">
                {pending && (
                  <p className="text-gray-500">AI が読み取り中...（10〜20秒）</p>
                )}
                {success && !pending && (
                  <p className="text-green-700">
                    抽出が完了しました。下のフォームを確認・修正してください。
                  </p>
                )}
                {error && (
                  <p className="text-red-600 leading-relaxed">{error}</p>
                )}
                <p className="text-[10px] text-gray-400 mt-1">
                  形式: {previewMime.replace("image/", "").toUpperCase()}
                </p>
              </div>
            </div>
          )}

          {!previewUrl && error && (
            <p className="text-xs text-red-600 mt-2">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("読み取り失敗"));
        return;
      }
      resolve(result.split(",")[1] ?? result);
    };
    reader.readAsDataURL(file);
  });
}
