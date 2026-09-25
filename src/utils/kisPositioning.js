export async function fetchKisPositioning(symbol) {
  const params = new URLSearchParams({ symbol: symbol.trim() });
  const response = await fetch(`/api/kis-positioning?${params.toString()}`);
  let payload = null;
  try { payload = await response.json(); } catch { /* handled below */ }
  if (!response.ok) throw new Error(payload?.error || `시장 포지션 조회에 실패했습니다 (HTTP ${response.status}).`);
  return payload;
}
