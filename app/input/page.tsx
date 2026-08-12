"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function InputPage() {
  const [smsText, setSmsText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleAnalyze = async () => {
    if (!smsText.trim()) {
      setError("SMS 문자를 입력해주세요.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ smsText, userId: user.id }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "분석 중 오류가 발생했어요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">💸 지출 분류기</h1>
        <button
          onClick={() => router.push("/dashboard")}
          className="text-sm text-gray-400 hover:text-white transition"
        >
          ← 뒤로
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-1">SMS 문자 붙여넣기</h2>
          <p className="text-gray-400">
            카드/은행에서 온 문자를 아래에 붙여넣으세요. 여러 개도 한 번에
            가능해요.
          </p>
        </div>

        {/* 예시 */}
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <p className="text-xs text-gray-500 mb-2">예시</p>
          <p className="text-sm text-gray-300 leading-relaxed">
            [Web발신] 신한카드 승인 홍길동 4,500원 스타벅스 08/12 14:32 누적
            45,000원
            <br />
            [KB국민카드] 23,000원 승인 CGV 강남 잔액 230,000원
          </p>
        </div>

        <textarea
          value={smsText}
          onChange={(e) => setSmsText(e.target.value)}
          placeholder="여기에 SMS 문자를 붙여넣으세요..."
          rows={10}
          className="w-full px-4 py-3 bg-gray-900 text-white rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500 resize-none text-sm leading-relaxed"
        />

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          onClick={handleAnalyze}
          disabled={loading || !smsText.trim()}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition text-lg"
        >
          {loading ? "🤖 AI가 분류 중..." : "✨ 자동 분류하기"}
        </button>
      </main>
    </div>
  );
}
