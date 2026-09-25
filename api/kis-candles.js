// 한국투자증권 국내주식 일봉 조회 프록시
// 앱 키와 시크릿은 서버 환경변수에서만 읽고 브라우저로 내려보내지 않습니다.

import { getKisAccessToken, KIS_BASE_URL } from './kis-auth.js';

async function readJson(response) {
  try { return await response.json(); } catch { return null; }
}

function dateString(date) {
  return date.toISOString().slice(0, 10).replaceAll('-', '');
}

async function fetchDailyChart(symbol, token) {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 370);
  const url = new URL(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice`);
  url.searchParams.set('FID_COND_MRKT_DIV_CODE', 'J');
  url.searchParams.set('FID_INPUT_ISCD', symbol);
  url.searchParams.set('FID_INPUT_DATE_1', dateString(start));
  url.searchParams.set('FID_INPUT_DATE_2', dateString(end));
  url.searchParams.set('FID_PERIOD_DIV_CODE', 'D');
  url.searchParams.set('FID_ORG_ADJ_PRC', '1');

  return fetch(url, {
    headers: {
      authorization: `Bearer ${token}`,
      appkey: process.env.KIS_APP_KEY,
      appsecret: process.env.KIS_APP_SECRET,
      tr_id: 'FHKST03010100',
      custtype: 'P',
    },
  });
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET 요청만 지원합니다.' });
  const symbol = String(req.query?.symbol ?? '').trim().toUpperCase();
  if (!/^\d{6}$/.test(symbol)) {
    return res.status(400).json({ error: '한국투자증권 국내주식 코드는 6자리 숫자로 입력하세요. 예: 005930' });
  }

  try {
    let token = await getKisAccessToken();
    let response = await fetchDailyChart(symbol, token);
    if (response.status === 401) {
      token = await getKisAccessToken(true);
      response = await fetchDailyChart(symbol, token);
    }
    const payload = await readJson(response);
    if (!response.ok || payload?.rt_cd !== '0') {
      const error = new Error(payload?.msg1 || `한국투자증권 시세 조회 실패 (HTTP ${response.status})`);
      error.status = response.status >= 400 ? response.status : 502;
      throw error;
    }

    const rows = (payload.output2 ?? []).map((row) => ({
      date: row.stck_bsop_date,
      open: Number(row.stck_oprc),
      high: Number(row.stck_hgpr),
      low: Number(row.stck_lwpr),
      close: Number(row.stck_clpr),
      volume: Number(row.acml_vol),
    })).filter((row) => row.date && Number.isFinite(row.close)).reverse();

    if (!rows.length) return res.status(404).json({ error: `${symbol}의 일봉 데이터가 없습니다.` });
    return res.status(200).json({ symbol, interval: '1d', currency: 'KRW', rows });
  } catch (error) {
    const status = error.status >= 400 && error.status < 600 ? error.status : 502;
    return res.status(status).json({ error: error.message || '한국투자증권 API 조회에 실패했습니다.' });
  }
}
