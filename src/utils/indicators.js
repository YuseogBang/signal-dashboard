// 기술적 지표 계산 유틸리티
// 입력: close 가격 배열 (오름차순, 날짜순)
// 출력: 각 인덱스에 대응하는 지표 값 배열 (계산 불가 구간은 null)

/** 단순이동평균 (Simple Moving Average) */
export function sma(values, period) {
  const out = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

/** 지수이동평균 (Exponential Moving Average). 첫 값은 초기 SMA로 시드 */
export function ema(values, period) {
  const out = new Array(values.length).fill(null);
  const k = 2 / (period + 1);
  let seed = null;
  let seedSum = 0;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) continue;
    if (i === period - 1) {
      for (let j = i - period + 1; j <= i; j++) seedSum += values[j];
      seed = seedSum / period;
      out[i] = seed;
      continue;
    }
    out[i] = values[i] * k + out[i - 1] * (1 - k);
  }
  return out;
}

/**
 * RSI (Relative Strength Index) — Wilder's smoothing 방식
 * period 기본값 14. 반환값은 0~100 스케일, 계산 불가 구간은 null.
 */
export function rsi(closes, period = 14) {
  const out = new Array(closes.length).fill(null);
  if (closes.length <= period) return out;

  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change >= 0) gainSum += change;
    else lossSum += -change;
  }
  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

/**
 * MACD (Moving Average Convergence Divergence)
 * fast=12, slow=26, signal=9 (기본값)
 * 반환: { macdLine, signalLine, histogram } — 모두 closes와 같은 길이의 배열
 */
export function macd(closes, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const emaFast = ema(closes, fastPeriod);
  const emaSlow = ema(closes, slowPeriod);

  const macdLine = closes.map((_, i) => {
    if (emaFast[i] == null || emaSlow[i] == null) return null;
    return emaFast[i] - emaSlow[i];
  });

  // signalLine은 macdLine 중 null이 아닌 구간에 대해서만 EMA 계산 후 원래 인덱스로 되돌림
  const validIdx = [];
  const validVals = [];
  macdLine.forEach((v, i) => {
    if (v != null) {
      validIdx.push(i);
      validVals.push(v);
    }
  });
  const signalOnValid = ema(validVals, signalPeriod);
  const signalLine = new Array(closes.length).fill(null);
  signalOnValid.forEach((v, j) => {
    if (v != null) signalLine[validIdx[j]] = v;
  });

  const histogram = closes.map((_, i) => {
    if (macdLine[i] == null || signalLine[i] == null) return null;
    return macdLine[i] - signalLine[i];
  });

  return { macdLine, signalLine, histogram };
}

function clip(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * 복합 시그널 스코어 계산
 * RSI와 MACD 히스토그램을 각각 -1~1 범위로 정규화한 뒤 가중 평균한다.
 *  - RSI: 30 이하 과매도(매수 우위) → +1에 가깝게, 70 이상 과매수(매도 우위) → -1에 가깝게
 *  - MACD 히스토그램: 최근 20일 평균 절대값 대비 상대적 크기로 정규화 (모멘텀 강도)
 * weights: { rsi, macd } 합이 1이 되지 않아도 내부적으로 정규화됨
 */
export function compositeSignal(closes, { rsiPeriod = 14, macdParams = [12, 26, 9], weights = { rsi: 0.5, macd: 0.5 }, histWindow = 20 } = {}) {
  const rsiArr = rsi(closes, rsiPeriod);
  const { macdLine, signalLine, histogram } = macd(closes, ...macdParams);

  const wSum = weights.rsi + weights.macd;
  const wRsi = weights.rsi / wSum;
  const wMacd = weights.macd / wSum;

  const scores = closes.map((_, i) => {
    const r = rsiArr[i];
    const h = histogram[i];
    if (r == null || h == null) return { score: null, label: null, rsi: r, histogram: h };

    const rsiScore = clip((50 - r) / 50, -1, 1);

    // 최근 histWindow 구간의 평균 절대 히스토그램 값으로 정규화
    const start = Math.max(0, i - histWindow + 1);
    let sum = 0;
    let count = 0;
    for (let j = start; j <= i; j++) {
      if (histogram[j] != null) {
        sum += Math.abs(histogram[j]);
        count++;
      }
    }
    const avgAbs = count > 0 ? sum / count : 0;
    const macdScore = avgAbs > 0 ? clip(h / (avgAbs * 1.5), -1, 1) : 0;

    const score = wRsi * rsiScore + wMacd * macdScore;

    let label = 'HOLD';
    if (score > 0.5) label = 'STRONG_BUY';
    else if (score > 0.15) label = 'BUY';
    else if (score < -0.5) label = 'STRONG_SELL';
    else if (score < -0.15) label = 'SELL';

    return { score, label, rsi: r, histogram: h };
  });

  return { rsi: rsiArr, macdLine, signalLine, histogram, composite: scores };
}

export const SIGNAL_META = {
  STRONG_BUY: { text: '강한 매수', short: 'BUY', tone: 'good' },
  BUY: { text: '매수', short: 'BUY', tone: 'good' },
  HOLD: { text: '관망', short: 'HOLD', tone: 'warning' },
  SELL: { text: '매도', short: 'SELL', tone: 'critical' },
  STRONG_SELL: { text: '강한 매도', short: 'SELL', tone: 'critical' },
};
