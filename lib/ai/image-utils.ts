// lib/ai/image-utils.ts
// 画像処理ユーティリティ（クライアントサイドで実行）

/**
 * 画像をリサイズして base64 化する
 * - 最大 1024px に縮小（トークン削減）
 * - JPEG 品質 85
 * - クライアントサイドで実行（API 呼び出し前に縮小してデータ転送を減らす）
 */
export async function resizeImageToBase64(
  file: File,
  maxSize: number = 1024
): Promise<{ base64: string; mediaType: "image/jpeg" }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        // アスペクト比を保ってリサイズ
        if (width > height && width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        } else if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context not available"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        const base64 = dataUrl.split(",")[1];

        resolve({ base64, mediaType: "image/jpeg" });
      };
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

/**
 * ファイルバリデーション（5MB 上限）
 */
export function validateImageFile(file: File): {
  valid: boolean;
  error?: string;
} {
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: "画像形式は JPEG / PNG / WebP のみ対応しています",
    };
  }
  if (file.size > MAX_SIZE) {
    return {
      valid: false,
      error: "ファイルサイズは 5MB 以下にしてください",
    };
  }
  return { valid: true };
}
