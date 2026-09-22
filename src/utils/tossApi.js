// 프론트엔드에서 /api/toss-candles (Vercel 서버리스 프록시)를 호출하는 헬퍼.
// client_secret은 여기 어디에도 존재하지 않는다 — 서버리스 함수 안에서만 사용된다.

export async function fetchTossCandles(symbol, { interval = '1d', count = 200 } = {}) {
  const params = new URLSearchParams({ symbol: symbol.trim(), interval, count: String(count) });
  const res = await fetch(`/api/toss-candles?${params.toString()}`);

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    // 응답 본문이 JSON이 아닌 경우 (예: 배포 안 된 /api 라우트)
  }

  if (!res.ok) {
    const message = payload?.error || `실시간 데이터 조회에 실패했습니다 (HTTP ${res.status}).`;
    throw new Error(message);
  }

  if (!payload?.rows?.length) {
    throw new Error('조회된 데이터가 없습니다.');
  }

  return {
    rows: payload.rows,
    currency: payload.currency ?? 'KRW',
  };
}
