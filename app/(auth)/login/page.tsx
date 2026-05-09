"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { login } from "./actions";
import { PlateCorner } from "@/components/ui/PlateCorner";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await login(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      <PlateCorner number="00" />

      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <p className="caps">Maison du Vin · est. 2026</p>
          <h1 className="font-serif text-6xl mt-3 tracking-tight">
            <span className="font-italic-serif text-plate">Mise</span>
          </h1>
          <p className="font-italic-serif text-base mt-2 text-ink-2">
            ようこそ。お店の方はこちらから。
          </p>
          <div className="hairline-gold w-24 mx-auto mt-6" />
        </div>

        <div className="bg-paper border border-rule p-10">
          <form action={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-crimson-bg border border-crimson text-crimson text-sm px-4 py-3">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="caps block mb-1.5">
                メールアドレス
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="example@restaurant.jp"
                className="w-full border border-rule-strong bg-paper-2 px-4 py-3 text-sm placeholder:text-ink-3 focus:outline-none focus:border-plate"
              />
            </div>

            <div>
              <label htmlFor="password" className="caps block mb-1.5">
                パスワード
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  className="w-full border border-rule-strong bg-paper-2 px-4 py-3 pr-12 text-sm focus:outline-none focus:border-plate"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-plate"
                  aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              variant="primary"
              size="lg"
              className="w-full justify-center"
            >
              {loading ? "ログイン中..." : "ログイン ⏎"}
            </Button>
          </form>
        </div>

        <p className="caps text-center mt-6 text-ink-3">
          Plate № 00 · 2026
        </p>
      </div>
    </div>
  );
}
