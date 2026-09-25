export async function fetchKisCandles(symbol, { count = 200 } = {}) {
  const params = new URLSearchParams({ symbol: symbol.trim(), count: String(count) });
  const response = await fetch(`/api/kis-candles?${params.toString()}`);
  let payload = null;
  try { payload = await response.json(); } catch { /* handled below */ }
  if (!response.ok) throw new Error(payload?.error || `실시간 데이터 조회에 실패했습니다 (HTTP ${response.status}).`);
  if (!payload?.rows?.length) throw new Error('조회된 데이터가 없습니다.');
  return { rows: payload.rows.slice(-count), currency: payload.currency ?? 'KRW' };
}
