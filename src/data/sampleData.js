// 데모용 샘플 시세 데이터 생성기
// ⚠️ 실제 시세가 아닌 시뮬레이션 데이터입니다. 실제 분석에는 CSV 업로드 기능으로
// 직접 확보한 실데이터(KRX, 증권사 HTS, Yahoo Finance 등)를 사용하세요.

// 시드 기반 의사난수 생성기 (mulberry32) — 매번 동일한 데모 데이터 재현을 위함
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function genSeries({ seed, basePrice, days = 260, dailyVol, driftRegimes }) {
  const rand = mulberry32(seed);
  const out = [];
  let price = basePrice;
  const start = new Date();
  start.setDate(start.getDate() - days);

  for (let i = 0; i < days; i++) {
    // 요일 스킵(주말) 처리는 단순화를 위해 생략하고 거래일만 순차 생성
    const regime = driftRegimes.find((r) => i >= r.from && i < r.to) || { drift: 0 };
    const gaussianLike = (rand() + rand() + rand() - 1.5) / 1.5; // 대략적 정규분포 근사
    const change = regime.drift + gaussianLike * dailyVol;
    const open = price;
    price = Math.max(price * (1 + change), basePrice * 0.2);
    const high = Math.max(open, price) * (1 + rand() * 0.006);
    const low = Math.min(open, price) * (1 - rand() * 0.006);
    const volume = Math.round(1_000_000 * (0.6 + rand() * 0.8));

    const date = new Date(start);
    date.setDate(start.getDate() + i);

    out.push({
      date: date.toISOString().slice(0, 10),
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(price * 100) / 100,
      volume,
    });
  }
  return out;
}

export const SAMPLE_TICKERS = [
  {
    id: '005930',
    label: '삼성전자 (005930)',
    market: 'KOSPI',
    currency: 'KRW',
    gen: () =>
      genSeries({
        seed: 1,
        basePrice: 72000,
        dailyVol: 0.014,
        driftRegimes: [
          { from: 0, to: 60, drift: 0.001 },
          { from: 60, to: 120, drift: -0.0015 },
          { from: 120, to: 190, drift: 0.0022 },
          { from: 190, to: 260, drift: -0.0008 },
        ],
      }),
  },
  {
    id: '000660',
    label: 'SK하이닉스 (000660)',
    market: 'KOSPI',
    currency: 'KRW',
    gen: () =>
      genSeries({
        seed: 2,
        basePrice: 185000,
        dailyVol: 0.02,
        driftRegimes: [
          { from: 0, to: 80, drift: 0.0026 },
          { from: 80, to: 150, drift: -0.002 },
          { from: 150, to: 210, drift: 0.0018 },
          { from: 210, to: 260, drift: 0.0005 },
        ],
      }),
  },
  {
    id: '042700',
    label: '한미반도체 (042700)',
    market: 'KOSPI',
    currency: 'KRW',
    gen: () =>
      genSeries({
        seed: 3,
        basePrice: 128000,
        dailyVol: 0.024,
        driftRegimes: [
          { from: 0, to: 50, drift: -0.0012 },
          { from: 50, to: 130, drift: 0.0024 },
          { from: 130, to: 200, drift: -0.0022 },
          { from: 200, to: 260, drift: 0.0014 },
        ],
      }),
  },
  {
    id: 'NVDA',
    label: 'NVIDIA (NVDA)',
    market: 'NASDAQ',
    currency: 'USD',
    gen: () =>
      genSeries({
        seed: 4,
        basePrice: 178,
        dailyVol: 0.021,
        driftRegimes: [
          { from: 0, to: 70, drift: 0.0022 },
          { from: 70, to: 140, drift: 0.0009 },
          { from: 140, to: 200, drift: -0.0026 },
          { from: 200, to: 260, drift: 0.0017 },
        ],
      }),
  },
  {
    id: 'AMD',
    label: 'AMD (AMD)',
    market: 'NASDAQ',
    currency: 'USD',
    gen: () =>
      genSeries({
        seed: 5,
        basePrice: 165,
        dailyVol: 0.023,
        driftRegimes: [
          { from: 0, to: 55, drift: -0.0018 },
          { from: 55, to: 130, drift: 0.0025 },
          { from: 130, to: 190, drift: -0.001 },
          { from: 190, to: 260, drift: 0.0008 },
        ],
      }),
  },
];

export const TICKER_META = {
  '005930': { name: '삼성전자', market: 'KOSPI', currency: 'KRW' },
  '000660': { name: 'SK하이닉스', market: 'KOSPI', currency: 'KRW' },
  '042700': { name: '한미반도체', market: 'KOSPI', currency: 'KRW' },
  NVDA: { name: 'NVIDIA', market: 'NASDAQ', currency: 'USD' },
  AMD: { name: 'AMD', market: 'NASDAQ', currency: 'USD' },
  AAPL: { name: 'Apple', market: 'NASDAQ', currency: 'USD' },
  MSFT: { name: 'Microsoft', market: 'NASDAQ', currency: 'USD' },
  TSLA: { name: 'Tesla', market: 'NASDAQ', currency: 'USD' },
  AMZN: { name: 'Amazon', market: 'NASDAQ', currency: 'USD' },
  GOOGL: { name: 'Alphabet', market: 'NASDAQ', currency: 'USD' },
};

export function getTickerMeta(value) {
  const id = String(value ?? '').trim().toUpperCase();
  return TICKER_META[id] ?? { name: id || '알 수 없는 종목', market: id.length === 6 && /^\d+$/.test(id) ? 'KRX' : '해외시장', currency: 'KRW' };
}

export function getSampleData(id) {
  const t = SAMPLE_TICKERS.find((t) => t.id === id);
  return t ? t.gen() : [];
}
