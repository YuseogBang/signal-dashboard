const BASE = 'https://openapi.koreainvestment.com:9443';
let cache;
let pending;

async function readJson(response) { try { return await response.json(); } catch { return null; } }

export async function getKisAccessToken(forceRefresh = false) {
  if (!forceRefresh && cache && cache.expiresAt > Date.now()) return cache.value;
  if (pending) return pending;
  pending = (async () => {
    const appkey = process.env.KIS_APP_KEY;
    const appsecret = process.env.KIS_APP_SECRET;
    if (!appkey || !appsecret) throw new Error('KIS_APP_KEY / KIS_APP_SECRET가 설정되지 않았습니다.');
    const response = await fetch(`${BASE}/oauth2/tokenP`, {
      method: 'POST', headers: { 'content-type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({ grant_type: 'client_credentials', appkey, appsecret }),
    });
    const body = await readJson(response);
    if (!response.ok || !body?.access_token) throw new Error(body?.msg1 || '한국투자증권 인증에 실패했습니다.');
    cache = { value: body.access_token, expiresAt: Date.now() + Math.max((body.expires_in || 86400) - 300, 300) * 1000 };
    return cache.value;
  })();
  try { return await pending; } finally { pending = null; }
}

export { BASE as KIS_BASE_URL };
