// Vercel Serverless Function: 토스증권 Open API 프록시
//
// 프론트엔드는 이 엔드포인트만 호출합니다 (/api/toss-candles?symbol=...).
// client_secret은 절대 프론트엔드로 내려가지 않고, 이 서버리스 함수 안에서만
// 환경 변수(TOSS_CLIENT_ID / TOSS_CLIENT_SECRET)로 읽어 OAuth2 토큰 교환에 사용합니다.
//
// 토스증권 Open API 제약 (중요):
// - client당 유효한 access token은 1개뿐이며, 재발급 시 이전 토큰은 즉시 무효화됩니다.
//   그래서 콜드 스타트가 여러 번 겹치면 서로의 토큰을 무효화시킬 수 있어, 401을 한 번
//   토큰 재발급 후 재시도하는 방식으로 방어합니다.
// - 클라이언트에 등록된 "허용 IP" 목록에 없는 IP에서 호출하면 403이 발생합니다.
//   Vercel의 기본(Hobby/Pro) 서버리스 함수는 고정 출력 IP를 제공하지 않으므로,
//   토스증권 WTS 설정에 IP를 등록해도 이후 호출이 다른 IP로 나가면 다시 막힐 수 있습니다.
//   이 경우 Vercel의 고정 IP 기능(Secure Compute 등) 또는 고정 IP를 가진 별도 서버에서
//   이 프록시를 실행하는 방식을 고려해야 합니다. 자세한 내용은 README 참고.

const TOSS_BASE_URL = 'https://openapi.tossinvest.com';

// 서버리스 인스턴스가 살아있는 동안(warm) 토큰을 재사용하기 위한 모듈 스코프 캐시.
// 인스턴스가 재시작되면(cold start) 초기화되며, 그 경우 새로 토큰을 발급받습니다.
let cachedToken = null; // { accessToken, expiresAt }

async function fetchNewToken() {
  const clientId = process.env.TOSS_CLIENT_ID;
  const clientSecret = process.env.TOSS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    const err = new Error('서버에 TOSS_CLIENT_ID / TOSS_CLIENT_SECRET 환경 변수가 설정되어 있지 않습니다.');
    err.status = 500;
    throw err;
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(`${TOSS_BASE_URL}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const detail = await safeJson(res);
    const err = new Error(mapTokenError(res.status, detail));
    err.status = res.status === 429 ? 429 : 502;
    throw err;
  }

  const json = await res.json();
  // 안전 마진(60초)을 두어, 만료 직전에 쓰다가 실패하는 것을 방지.
  const expiresAt = Date.now() + (json.expires_in - 60) * 1000;
  cachedToken = { accessToken: json.access_token, expiresAt };
  return cachedToken.accessToken;
}

function mapTokenError(status, detail) {
  if (status === 401) return '토스증권 API 인증에 실패했습니다 (client_id/client_secret 확인 필요).';
  if (status === 403) return '허용되지 않은 IP에서의 요청입니다. 토스증권 WTS > Open API 설정에서 허용 IP를 등록하세요.';
  if (status === 429) return '토스증권 API 요청 한도를 초과했습니다. 잠시 후 다시 시도하세요.';
  return detail?.error_description || detail?.error?.message || `토큰 발급 실패 (HTTP ${status})`;
}

async function getAccessToken(forceRefresh = false) {
  if (!forceRefresh && cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.accessToken;
  }
  return fetchNewToken();
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchCandles(symbol, interval, count) {
  let token = await getAccessToken();

  const doFetch = async (bearerToken) => {
    const url = new URL(`${TOSS_BASE_URL}/api/v1/candles`);
    url.searchParams.set('symbol', symbol);
    url.searchParams.set('interval', interval);
    url.searchParams.set('count', String(count));
    url.searchParams.set('adjusted', 'true');
    return fetch(url, {
      headers: { Authorization: `Bearer ${bearerToken}` },
    });
  };

  let res = await doFetch(token);

  // 토큰이 다른 인스턴스의 재발급으로 무효화된 경우(401) 한 번만 강제 재발급 후 재시도.
  if (res.status === 401) {
    token = await getAccessToken(true);
    res = await doFetch(token);
  }

  if (!res.ok) {
    const detail = await safeJson(res);
    const err = new Error(mapCandlesError(res.status, detail, symbol));
    err.status = res.status;
    err.retryAfter = res.headers.get('Retry-After');
    throw err;
  }

  const json = await res.json();
  return json.result;
}

function mapCandlesError(status, detail, symbol) {
  const msg = detail?.error?.message;
  if (status === 403) return '허용되지 않은 IP에서의 요청입니다. 토스증권 WTS > Open API 설정에서 허용 IP를 등록하세요.';
  if (status === 404) return `종목 "${symbol}"을(를) 찾을 수 없습니다. 종목 코드/티커를 확인하세요.`;
  if (status === 429) return '토스증권 API 요청 한도를 초과했습니다. 잠시 후 다시 시도하세요.';
  if (status === 400) return msg || '요청 파라미터가 올바르지 않습니다.';
  return msg || `캔들 조회 실패 (HTTP ${status})`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'GET 요청만 지원합니다.' });
    return;
  }

  const { symbol, interval = '1d', count = '200' } = req.query;

  if (!symbol || !/^[A-Za-z0-9.-]+$/.test(symbol)) {
    res.status(400).json({ error: '유효한 symbol 쿼리 파라미터가 필요합니다 (예: 005930, AAPL).' });
    return;
  }
  if (interval !== '1m' && interval !== '1d') {
    res.status(400).json({ error: 'interval은 "1m" 또는 "1d"만 지원합니다.' });
    return;
  }
  const parsedCount = Math.min(Math.max(parseInt(count, 10) || 200, 1), 200);

  try {
    const result = await fetchCandles(symbol, interval, parsedCount);
    const candles = result?.candles ?? [];

    // 토스 응답은 최신순(내림차순) → 차트/지표 계산은 과거→현재 순서가 필요하므로 뒤집는다.
    const rows = [...candles].reverse().map((c) => ({
      date: interval === '1d' ? c.timestamp.slice(0, 10) : c.timestamp,
      open: Number(c.openPrice),
      high: Number(c.highPrice),
      low: Number(c.lowPrice),
      close: Number(c.closePrice),
      volume: Number(c.volume),
    }));

    const currency = candles[0]?.currency ?? (/^[0-9]/.test(symbol) ? 'KRW' : 'USD');

    res.status(200).json({ symbol, interval, currency, rows });
  } catch (err) {
    const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 502;
    res.status(status).json({ error: err.message || '알 수 없는 오류가 발생했습니다.' });
  }
}
