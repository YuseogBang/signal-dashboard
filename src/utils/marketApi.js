// Provider-neutral client. Credentials belong only to the existing server API.
// Set VITE_MARKET_DATA_ENDPOINT to the user's KIS proxy route when its location is known.
const env = import.meta.env || {};
export const MARKET_ENDPOINT = env.VITE_MARKET_DATA_ENDPOINT || '/api/kis-candles';
export const MARKET_PROVIDER = env.VITE_MARKET_DATA_PROVIDER || (MARKET_ENDPOINT.includes('kis') ? '한국투자증권 API' : '시세 API');
const num = v => v == null || v === '' ? null : Number(String(v).replaceAll(',', ''));
export function normalizeMarketData(payload, symbol, provider = MARKET_PROVIDER) {
  if (payload?.rt_cd && payload.rt_cd !== '0') throw new Error(payload.msg1 || '시세 API가 요청을 처리하지 못했습니다.');
  const raw = payload?.rows ?? payload?.output2;
  if (!Array.isArray(raw)) throw new Error('API 응답에서 일봉 데이터를 찾지 못했습니다.');
  const mapped = raw.map(r => {
    let date = String(r.date ?? r.stck_bsop_date ?? r.xymd ?? '');
    if (/^\d{8}$/.test(date)) date = `${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}`;
    return { date:date.slice(0,10), open:num(r.open ?? r.stck_oprc), high:num(r.high ?? r.stck_hgpr), low:num(r.low ?? r.stck_lwpr), close:num(r.close ?? r.stck_clpr ?? r.clos), volume:num(r.volume ?? r.acml_vol ?? r.tvol) };
  }).filter(r => /^\d{4}-\d{2}-\d{2}$/.test(r.date) && [r.open,r.high,r.low,r.close].every(v => Number.isFinite(v) && v > 0) && r.high >= Math.max(r.open,r.close,r.low) && r.low <= Math.min(r.open,r.close));
  const rows = [...new Map(mapped.map(r => [r.date,r])).values()].sort((a,b)=>a.date.localeCompare(b.date));
  if (!rows.length) throw new Error('유효한 OHLC 데이터가 없습니다.');
  return { rows, currency:payload.currency || (/^\d{6}$/.test(symbol) ? 'KRW' : 'USD'), provider:payload.provider || (payload.output2 ? '한국투자증권 API' : provider) };
}
export async function fetchMarketCandles(symbol, { interval = '1d', count = 200, signal } = {}) {
  if (!MARKET_ENDPOINT.startsWith('/') || MARKET_ENDPOINT.startsWith('//')) throw new Error('시세 프록시는 같은 사이트의 /api 경로로 설정하세요.');
  const params = new URLSearchParams({symbol:symbol.trim(),interval,count:String(count)});
  const response = await fetch(`${MARKET_ENDPOINT}?${params}`, {signal: signal || AbortSignal.timeout(20000)});
  let payload;
  try { payload = await response.json(); } catch { throw new Error('시세 프록시 응답을 확인하지 못했습니다.'); }
  if (!response.ok) throw new Error(payload?.error || `시세 조회 실패 (HTTP ${response.status})`);
  return normalizeMarketData(payload,symbol);
}
