import { getKisAccessToken, KIS_BASE_URL as BASE } from './kis-auth.js';
const responseCache = new Map();

async function json(response) { try { return await response.json(); } catch { return null; } }

async function kisGet(path, trId, params) {
  const accessToken = await getKisAccessToken();
  const url = new URL(`${BASE}${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${accessToken}`,
      appkey: process.env.KIS_APP_KEY,
      appsecret: process.env.KIS_APP_SECRET,
      tr_id: trId,
      custtype: 'P',
    },
  });
  const body = await json(response);
  if (!response.ok || body?.rt_cd !== '0') throw new Error(body?.msg1 || `API 오류 (HTTP ${response.status})`);
  return body;
}

function first(row, keys) {
  for (const key of keys) if (row?.[key] !== undefined && row[key] !== '') return row[key];
  return null;
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function etfComponents(etfCode, symbol) {
  const body = await kisGet('/uapi/etfetn/v1/quotations/inquire-component-stock-price', 'FHKST121600C0', {
    FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: etfCode, FID_COND_SCR_DIV_CODE: '11216',
  });
  const rows = Array.isArray(body.output2) ? body.output2 : [];
  const matches = rows.filter((row) => String(first(row, ['stck_shrn_iscd', 'component_code', 'isu_cd']) || '') === symbol);
  return { etfCode, etfName: first(body.output1, ['hts_kor_isnm', 'etf_cnfg_issu_nm', 'prdt_name']) || etfCode, availableFields: Object.keys(rows[0] || {}), matches: matches.map((row) => ({
    code: first(row, ['stck_shrn_iscd', 'component_code', 'isu_cd']),
    name: first(row, ['hts_kor_isnm', 'stck_name', 'component_name']),
    weight: first(row, ['etf_cnfg_issu_rlim', 'etf_cnfg_issu_amt', 'comp_stk_qty', 'weight']),
    price: first(row, ['stck_prpr', 'price']),
  })) };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET 요청만 지원합니다.' });
  const symbol = String(req.query?.symbol || '').trim();
  if (!/^\d{6}$/.test(symbol)) return res.status(400).json({ error: '국내 종목코드 6자리가 필요합니다.' });
  const cached = responseCache.get(symbol);
  if (cached && cached.expiresAt > Date.now()) return res.status(200).json(cached.value);
  const etfCodes = String(req.query?.etfs || '069500,102110,091160').split(',').filter((code) => /^\d{6}$/.test(code)).slice(0, 5);

  try {
    const etfs = [];
    for (const code of etfCodes) {
      etfs.push(await etfComponents(code, symbol).catch((error) => ({ etfCode: code, error: error.message, matches: [] })));
      await wait(1100);
    }
    const futures = await kisGet('/uapi/domestic-futureoption/v1/quotations/display-board-futures', 'FHPIF05030200', { FID_COND_MRKT_DIV_CODE: 'F', FID_COND_SCR_DIV_CODE: '20503', FID_COND_MRKT_CLS_CODE: 'MKI' }).catch((error) => ({ error: error.message }));
    await wait(1100);
    const options = await kisGet('/uapi/domestic-futureoption/v1/quotations/display-board-callput', 'FHPIF05030100', { FID_COND_MRKT_DIV_CODE: 'O', FID_COND_SCR_DIV_CODE: '20503', FID_MRKT_CLS_CODE: 'CO', FID_MTRT_CNT: new Date().toISOString().slice(0, 7).replace('-', ''), FID_MRKT_CLS_CODE1: 'PO', FID_COND_MRKT_CLS_CODE: '' }).catch((error) => ({ error: error.message }));
    const value = { symbol, updatedAt: new Date().toISOString(), etfs, futures: futures.output || futures.output1 || futures, options: options.output1 || options.output2 || options };
    responseCache.set(symbol, { value, expiresAt: Date.now() + 30_000 });
    return res.status(200).json(value);
  } catch (error) {
    return res.status(502).json({ error: error.message || '시장 포지셔닝 데이터를 조회하지 못했습니다.' });
  }
}
