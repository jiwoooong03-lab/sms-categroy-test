import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 카테고리별 키워드
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  식비: [
    "스타벅스",
    "맥도날드",
    "버거킹",
    "롯데리아",
    "이디야",
    "투썸",
    "빽다방",
    "카페",
    "편의점",
    "GS25",
    "CU",
    "세븐일레븐",
    "미니스톱",
    "배달",
    "요기요",
    "배민",
    "쿠팡이츠",
    "식당",
    "치킨",
    "BBQ",
    "교촌",
    "bhc",
    "피자",
    "도미노",
    "파파존스",
    "한식",
    "중식",
    "일식",
    "분식",
    "김밥",
    "떡볶이",
    "국밥",
    "삼겹살",
    "초밥",
    "라멘",
    "파리바게뜨",
    "뚜레쥬르",
    "베이커리",
  ],

  교통: [
    "카카오택시",
    "우버",
    "택시",
    "T머니",
    "교통카드",
    "지하철",
    "버스",
    "KTX",
    "SRT",
    "기차",
    "항공",
    "대한항공",
    "아시아나",
    "제주항공",
    "진에어",
    "티웨이",
    "주유",
    "GS칼텍스",
    "SK에너지",
    "S-OIL",
    "현대오일",
    "고속도로",
    "하이패스",
    "주차",
  ],

  쇼핑: [
    "쿠팡",
    "네이버",
    "11번가",
    "G마켓",
    "옥션",
    "위메프",
    "티몬",
    "인터파크",
    "이마트",
    "홈플러스",
    "롯데마트",
    "코스트코",
    "올리브영",
    "다이소",
    "무신사",
    "지그재그",
    "에이블리",
    "유니클로",
    "자라",
    "H&M",
    "나이키",
    "아디다스",
  ],

  의료: [
    "병원",
    "의원",
    "클리닉",
    "약국",
    "약",
    "치과",
    "한의원",
    "한방",
    "피부과",
    "안과",
    "정형외과",
    "내과",
    "외과",
    "산부인과",
    "소아과",
    "응급",
  ],

  "문화/여가": [
    "CGV",
    "롯데시네마",
    "메가박스",
    "영화",
    "넷플릭스",
    "왓챠",
    "웨이브",
    "디즈니",
    "티빙",
    "멜론",
    "지니",
    "플로",
    "유튜브",
    "게임",
    "스팀",
    "피트니스",
    "헬스",
    "GX",
    "요가",
    "필라테스",
    "독서실",
    "도서관",
    "서점",
    "교보",
    "알라딘",
    "예스24",
  ],

  구독: [
    "구독",
    "정기결제",
    "월정액",
    "애플",
    "Apple",
    "구글",
    "Google",
    "Microsoft",
    "어도비",
    "Adobe",
    "ChatGPT",
    "Notion",
    "노션",
    "Slack",
    "슬랙",
    "AWS",
    "클라우드",
  ],

  이체: [
    "이체",
    "송금",
    "출금",
    "입금",
    "이체수수료",
    "계좌이체",
    "토스",
    "카카오페이",
    "네이버페이",
    "페이",
  ],
};

function classifyCategory(merchant: string): string {
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((keyword) => merchant.includes(keyword))) {
      return category;
    }
  }

  return "기타";
}

function parseSMS(smsText: string): Array<{
  merchant: string;
  amount: number;
  category: string;
  date: string;
}> {
  const results: Array<{
    merchant: string;
    amount: number;
    category: string;
    date: string;
  }> = [];

  const lines = smsText.split("\n").filter((line) => line.trim());

  const today = new Date().toISOString().split("T")[0];

  for (const line of lines) {
    // 금액 추출
    const amountMatch = line.match(/([0-9,]+)원/);

    if (!amountMatch) continue;

    const amount = parseInt(amountMatch[1].replace(/,/g, ""), 10);

    if (amount <= 0) continue;

    // 날짜 추출
    const dateMatch = line.match(/(\d{2})\/(\d{2})/);

    let date = today;

    if (dateMatch) {
      const year = new Date().getFullYear();

      date = `${year}-${dateMatch[1].padStart(
        2,
        "0",
      )}-${dateMatch[2].padStart(2, "0")}`;
    }

    // 가맹점명 추출
    let merchant = "알 수 없음";

    const merchantMatch =
      line.match(/승인\s+([^\s\d]+(?:\s+[^\s\d]+)*)\s+[\d,]+원/) ||
      line.match(/[\d,]+원\s+승인\s+(.+?)\s+잔액/) ||
      line.match(/승인\s+(.+?)\s+\d{2}\/\d{2}/);

    if (merchantMatch) {
      merchant = merchantMatch[1].trim();
    } else {
      // 카드사명 제거
      const cleaned = line
        .replace(/\[.*?\]/g, "")
        .replace(
          /신한카드|KB국민카드|하나카드|삼성카드|현대카드|롯데카드|우리카드/g,
          "",
        )
        .trim();

      const wordMatch = cleaned.match(/([가-힣a-zA-Z]+(?:\s[가-힣a-zA-Z]+)*)/);

      if (wordMatch) {
        merchant = wordMatch[1].trim();
      }
    }

    const category = classifyCategory(merchant + " " + line);

    results.push({
      merchant,
      amount,
      category,
      date,
    });
  }

  return results;
}

export async function POST(req: NextRequest) {
  try {
    const { smsText, userId } = await req.json();

    if (!smsText) {
      return NextResponse.json(
        {
          error: "SMS 문자를 입력해주세요.",
        },
        {
          status: 400,
        },
      );
    }

    const transactions = parseSMS(smsText);

    if (transactions.length === 0) {
      return NextResponse.json(
        {
          error: "지출 내역을 찾을 수 없어요. SMS 형식을 확인해주세요.",
        },
        {
          status: 400,
        },
      );
    }

    // Supabase 서버용 클라이언트
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const rows = transactions.map((transaction) => ({
      user_id: userId,
      amount: transaction.amount,
      merchant: transaction.merchant,
      category: transaction.category,
      transaction_date: transaction.date,
      raw_sms: smsText,
    }));

    // Supabase에 저장
    const { error } = await supabase.from("transactions").insert(rows);

    if (error) {
      throw new Error(error.message);
    }

    // 분석 결과를 프론트엔드로 반환
    return NextResponse.json({
      success: true,
      count: rows.length,
      transactions,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err.message || "분석 중 오류가 발생했습니다.",
      },
      {
        status: 500,
      },
    );
  }
}
