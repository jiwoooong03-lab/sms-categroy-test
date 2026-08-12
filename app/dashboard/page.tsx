"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
      } else {
        setUser(user);
      }
      setLoading(false);
    };
    getUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading)
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">로딩 중...</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* 헤더 */}
      <header className="border-b border-gray-800 px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">💸 지출 분류기</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-400 hover:text-white transition"
          >
            로그아웃
          </button>
        </div>
      </header>

      {/* 메인 */}
      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="bg-gray-900 rounded-2xl p-8 text-center">
          <p className="text-4xl mb-4">📱</p>
          <h2 className="text-xl font-semibold mb-2">
            SMS 문자를 붙여넣어 보세요
          </h2>
          <p className="text-gray-400 mb-6">
            카드/은행 문자를 붙여넣으면 AI가 자동으로 분류해드려요
          </p>
          <button
            onClick={() => router.push("/input")}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition"
          >
            SMS 입력하기 →
          </button>
        </div>
      </main>
    </div>
  );
}
