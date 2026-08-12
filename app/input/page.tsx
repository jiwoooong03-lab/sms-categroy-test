"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

type Transaction = {
  merchant: string;
  amount: number;
  category: string;
  date: string;
};

type CategorySummary = {
  count: number;
  total: number;
};

export default function InputPage() {
  const [smsText, setSmsText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 지금까지 분석된 전체 거래
  const [transactions, setTransactions] = useState<Transaction[]>([]);

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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          smsText,
          userId: user.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "분석 중 오류가 발생했어요.");
      }

      // 기존 거래 + 새로 분석한 거래
      setTransactions((prev) => [...prev, ...result.transactions]);

      // 입력창 비우기
      setSmsText("");
    } catch (err: any) {
      setError(err.message || "분석 중 오류가 발생했어요.");
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // 카테고리별 금액 계산
  // ========================================

  const categorySummary: Record<string, CategorySummary> = transactions.reduce(
    (acc, transaction) => {
      const category = transaction.category;

      if (!acc[category]) {
        acc[category] = {
          count: 0,
          total: 0,
        };
      }

      acc[category].count += 1;
      acc[category].total += transaction.amount;

      return acc;
    },
    {} as Record<string, CategorySummary>,
  );

  // 금액이 큰 순서대로 정렬
  const sortedCategories = Object.entries(categorySummary).sort(
    ([, a], [, b]) => b.total - a.total,
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* 헤더 */}
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
        {/* 제목 */}
        <div>
          <h2 className="text-2xl font-bold mb-1">SMS 문자 붙여넣기</h2>

          <p className="text-gray-400">
            카드/은행에서 온 SMS 내용을 붙여넣으세요.
          </p>
        </div>

        {/* 예시 */}
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <p className="text-xs text-gray-500 mb-2">예시</p>

          <p className="text-sm text-gray-300 leading-relaxed">
            [Web발신] 신한카드 승인 홍길동 4,500원 스타벅스 08/12 14:32
            <br />
            [KB국민카드] 23,000원 승인 CGV 강남
          </p>
        </div>

        {/* SMS 입력 */}
        <textarea
          value={smsText}
          onChange={(e) => setSmsText(e.target.value)}
          placeholder="카드나 은행에서 받은 SMS 내용을 붙여넣으세요..."
          rows={10}
          className="w-full px-4 py-3 bg-gray-900 text-white rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500 resize-none text-sm leading-relaxed"
        />

        {/* 에러 */}
        {error && <p className="text-sm text-red-400">{error}</p>}

        {/* 자동 분류 버튼 */}
        <button
          onClick={handleAnalyze}
          disabled={loading || !smsText.trim()}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition text-lg"
        >
          {loading ? "🔍 분석 중..." : "✨ 자동 분류하기"}
        </button>

        {/* ======================================== */}
        {/* 카테고리별 결과 */}
        {/* ======================================== */}

        {sortedCategories.length > 0 && (
          <div className="pt-6">
            <h3 className="text-xl font-bold mb-4">📊 지출 현황</h3>

            <div className="space-y-3">
              {sortedCategories.map(([category, summary]) => (
                <div
                  key={category}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-5"
                >
                  <div className="flex items-center justify-between">
                    {/* 카테고리 */}
                    <div>
                      <p className="text-lg font-semibold">{category}</p>

                      <p className="text-sm text-gray-500 mt-1">
                        {summary.count}건 결제
                      </p>
                    </div>

                    {/* 결제 금액 */}
                    <p className="text-xl font-bold">
                      {summary.total.toLocaleString()}원
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 초기화 */}
        {transactions.length > 0 && (
          <button
            onClick={() => {
              setTransactions([]);
              setSmsText("");
              setError("");
            }}
            className="w-full py-3 border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-900 rounded-xl transition"
          >
            새로 시작하기
          </button>
        )}
      </main>
    </div>
  );
}
