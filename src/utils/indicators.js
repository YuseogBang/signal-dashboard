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
 * ATR (Average True Range) — Wilder's smoothing. 변동성을 가격 단위로 표현.
 * highs/lows/closes는 동일 길이, 날짜 오름차순.
 */
export function atr(highs, lows, closes, period = 14) {
  const n = closes.length;
  const out = new Array(n).fill(null);
  if (n <= period) return out;

  const tr = new Array(n).fill(null);
  for (let i = 1; i < n; i++) {
    const hl = highs[i] - lows[i];
    const hc = Math.abs(highs[i] - closes[i - 1]);
    const lc = Math.abs(lows[i] - closes[i - 1]);
    tr[i] = Math.max(hl, hc, lc);
  }

  let sum = 0;
  for (let i = 1; i <= period; i++) sum += tr[i];
  let prev = sum / period;
  out[period] = prev;
  for (let i = period + 1; i < n; i++) {
    prev = (prev * (period - 1) + tr[i]) / period;
    out[i] = prev;
  }
  return out;
}

/**
 * ADX (Average Directional Index) — Wilder 방식. 추세 "방향"이 아니라 추세 "강도"를 0~100으로 나타냄.
 * 관례상 25 이상이면 뚜렷한 추세, 20 미만이면 횡보(레인지)로 본다.
 * +DI/-DI까지는 계산하지 않고 ADX 값만 반환한다 (강도 판단에는 이 값만으로 충분).
 */
export function adx(highs, lows, closes, period = 14) {
  const n = closes.length;
  const out = new Array(n).fill(null);
  if (n <= period * 2) return out;

  const plusDM = new Array(n).fill(0);
  const minusDM = new Array(n).fill(0);
  const tr = new Array(n).fill(0);

  for (let i = 1; i < n; i++) {
    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];
    plusDM[i] = upMove > downMove && upMove > 0 ? upMove : 0;
    minusDM[i] = downMove > upMove && downMove > 0 ? downMove : 0;
    const hl = highs[i] - lows[i];
    const hc = Math.abs(highs[i] - closes[i - 1]);
    const lc = Math.abs(lows[i] - closes[i - 1]);
    tr[i] = Math.max(hl, hc, lc);
  }

  let smTr = 0;
  let smPlus = 0;
  let smMinus = 0;
  for (let i = 1; i <= period; i++) {
    smTr += tr[i];
    smPlus += plusDM[i];
    smMinus += minusDM[i];
  }

  const dx = new Array(n).fill(null);
  const diAt = (pSum, mSum, trSum) => {
    const pDI = trSum > 0 ? (pSum / trSum) * 100 : 0;
    const mDI = trSum > 0 ? (mSum / trSum) * 100 : 0;
    const denom = pDI + mDI;
    return denom > 0 ? (Math.abs(pDI - mDI) / denom) * 100 : 0;
  };
  dx[period] = diAt(smPlus, smMinus, smTr);

  for (let i = period + 1; i < n; i++) {
    smTr = smTr - smTr / period + tr[i];
    smPlus = smPlus - smPlus / period + plusDM[i];
    smMinus = smMinus - smMinus / period + minusDM[i];
    dx[i] = diAt(smPlus, smMinus, smTr);
  }

  let dxSum = 0;
  for (let i = period; i < period * 2; i++) dxSum += dx[i];
  let adxPrev = dxSum / period;
  out[period * 2 - 1] = adxPrev;
  for (let i = period * 2; i < n; i++) {
    adxPrev = (adxPrev * (period - 1) + dx[i]) / period;
    out[i] = adxPrev;
  }
  return out;
}

/**
 * 추세 상태 분류 — 단기(fast)/중기(slow) 단순이동평균의 괴리율로 상승/하락/횡보 판정.
 * RSI/MACD와 독립적인 축으로, "지금이 추세장인지 레인지장인지"를 알려준다.
 */
export function trendState(closes, fastPeriod = 20, slowPeriod = 50) {
  const fast = sma(closes, fastPeriod);
  const slow = sma(closes, slowPeriod);
  return closes.map((_, i) => {
    if (fast[i] == null || slow[i] == null) return null;
    const diff = (fast[i] - slow[i]) / slow[i];
    if (diff > 0.005) return 'UP';
    if (diff < -0.005) return 'DOWN';
    return 'FLAT';
  });
}

/** 상대 거래량 = 당일 거래량 / 최근 period일 평균 거래량. 1.2 이상이면 평소보다 뚜렷한 거래량으로 취급. */
export function relativeVolume(volumes, period = 20) {
  const avg = sma(volumes, period);
  return volumes.map((v, i) => (avg[i] ? v / avg[i] : null));
}

/** 볼린저 밴드 — 가격의 평균 회귀 위치와 변동성 압축을 함께 판단한다. */
export function bollingerBands(closes, period = 20, multiplier = 2) {
  const middle = sma(closes, period);
  const upper = new Array(closes.length).fill(null);
  const lower = new Array(closes.length).fill(null);
  const percentB = new Array(closes.length).fill(null);
  const bandwidth = new Array(closes.length).fill(null);

  for (let i = period - 1; i < closes.length; i++) {
    const mean = middle[i];
    let variance = 0;
    for (let j = i - period + 1; j <= i; j++) variance += (closes[j] - mean) ** 2;
    const deviation = Math.sqrt(variance / period);
    upper[i] = mean + multiplier * deviation;
    lower[i] = mean - multiplier * deviation;
    const width = upper[i] - lower[i];
    percentB[i] = width > 0 ? (closes[i] - lower[i]) / width : 0.5;
    bandwidth[i] = mean !== 0 ? width / mean : null;
  }

  return { middle, upper, lower, percentB, bandwidth };
}

/** 스토캐스틱 — 최근 고저 범위에서 현재 종가의 위치와 %K/%D 교차를 계산한다. */
export function stochastic(highs, lows, closes, period = 14, signalPeriod = 3) {
  const k = new Array(closes.length).fill(null);
  for (let i = period - 1; i < closes.length; i++) {
    const windowHigh = Math.max(...highs.slice(i - period + 1, i + 1));
    const windowLow = Math.min(...lows.slice(i - period + 1, i + 1));
    const range = windowHigh - windowLow;
    k[i] = range > 0 ? ((closes[i] - windowLow) / range) * 100 : 50;
  }

  const d = new Array(closes.length).fill(null);
  for (let i = period - 1 + signalPeriod - 1; i < closes.length; i++) {
    const values = k.slice(i - signalPeriod + 1, i + 1).filter((value) => value != null);
    if (values.length === signalPeriod) d[i] = values.reduce((sum, value) => sum + value, 0) / signalPeriod;
  }
  return { k, d };
}

/** 매수·매도 타이밍을 위한 EMA 정렬과 최근 지지/저항 구간. */
export function timingContext(highs, lows, closes, volumes, { fastPeriod = 20, slowPeriod = 50, rangePeriod = 20 } = {}) {
  const emaFast = ema(closes, fastPeriod);
  const emaSlow = ema(closes, slowPeriod);
  const bands = bollingerBands(closes, rangePeriod);
  const stochasticValues = stochastic(highs, lows, closes);
  const rsiValues = rsi(closes);
  const relVolume = relativeVolume(volumes, rangePeriod);
  const support = new Array(closes.length).fill(null);
  const resistance = new Array(closes.length).fill(null);

  for (let i = rangePeriod - 1; i < closes.length; i++) {
    support[i] = Math.min(...lows.slice(i - rangePeriod + 1, i + 1));
    resistance[i] = Math.max(...highs.slice(i - rangePeriod + 1, i + 1));
  }

  const timing = closes.map((close, i) => {
    if (emaFast[i] == null || emaSlow[i] == null || bands.percentB[i] == null || stochasticValues.d[i] == null) {
      return {
        emaFast: emaFast[i], emaSlow: emaSlow[i], percentB: bands.percentB[i], bandwidth: bands.bandwidth[i],
        stochK: stochasticValues.k[i], stochD: stochasticValues.d[i], support: support[i], resistance: resistance[i],
        timingScore: null, timingLabel: 'WAIT', buyPoints: 0, sellPoints: 0, confirmations: [], warnings: [],
      };
    }

    const prevK = stochasticValues.k[i - 1];
    const prevD = stochasticValues.d[i - 1];
    const goldenCross = prevK != null && prevD != null && prevK <= prevD && stochasticValues.k[i] > stochasticValues.d[i];
    const deadCross = prevK != null && prevD != null && prevK >= prevD && stochasticValues.k[i] < stochasticValues.d[i];
    const trendUp = emaFast[i] > emaSlow[i] && close > emaFast[i];
    const trendDown = emaFast[i] < emaSlow[i] && close < emaFast[i];
    const nearSupport = support[i] > 0 && (close - support[i]) / close <= 0.025;
    const nearResistance = resistance[i] > 0 && (resistance[i] - close) / close <= 0.025;
    const buyPoints = [
      trendUp,
      rsiValues[i] != null && rsiValues[i] <= 35,
      goldenCross && stochasticValues.k[i] < 45,
      bands.percentB[i] <= 0.2,
      nearSupport,
      relVolume[i] != null && relVolume[i] >= 1.2,
    ].filter(Boolean).length;
    const sellPoints = [
      trendDown,
      deadCross && stochasticValues.k[i] > 55,
      bands.percentB[i] >= 0.8,
      nearResistance,
      relVolume[i] != null && relVolume[i] >= 1.2,
    ].filter(Boolean).length;
    const confirmations = [];
    if (trendUp) confirmations.push('EMA 상승 정렬');
    if (trendDown) confirmations.push('EMA 하락 정렬');
    if (goldenCross && stochasticValues.k[i] < 45) confirmations.push('스토캐스틱 골든크로스');
    if (deadCross && stochasticValues.k[i] > 55) confirmations.push('스토캐스틱 데드크로스');
    if (bands.percentB[i] <= 0.2) confirmations.push('볼린저 하단 근접');
    if (bands.percentB[i] >= 0.8) confirmations.push('볼린저 상단 근접');
    if (nearSupport) confirmations.push('지지선 근접');
    if (nearResistance) confirmations.push('저항선 근접');
    if (relVolume[i] != null && relVolume[i] >= 1.2) confirmations.push('거래량 확인');

    let timingLabel = 'WAIT';
    if (buyPoints >= 4 && buyPoints > sellPoints) timingLabel = 'BUY_ZONE';
    else if (sellPoints >= 3 && sellPoints > buyPoints) timingLabel = 'SELL_ZONE';
    else if (buyPoints >= 2 && buyPoints > sellPoints) timingLabel = 'WATCH_BUY';
    else if (sellPoints >= 2 && sellPoints > buyPoints) timingLabel = 'WATCH_SELL';

    return {
      emaFast: emaFast[i], emaSlow: emaSlow[i], percentB: bands.percentB[i], bandwidth: bands.bandwidth[i],
      stochK: stochasticValues.k[i], stochD: stochasticValues.d[i], support: support[i], resistance: resistance[i],
      timingScore: (buyPoints - sellPoints) / 6, timingLabel, buyPoints, sellPoints, confirmations, warnings: [],
    };
  });

  return { ...bands, ...stochasticValues, emaFast, emaSlow, support, resistance, timing };
}

/**
 * 복합 시그널 스코어 계산
 * RSI와 MACD 히스토그램을 각각 -1~1 범위로 정규화한 뒤 가중 평균한다.
 *  - RSI: 30 이하 과매도(매수 우위) → +1에 가깝게, 70 이상 과매수(매도 우위) → -1에 가깝게
 *  - MACD 히스토그램: 최근 20일 평균 절대값 대비 상대적 크기로 정규화 (모멘텀 강도)
 *
 * weights를 명시하면 고정 가중치를 쓰고, 생략하면(기본값) ADX 기반 동적 가중치를 사용한다:
 * ADX>=25(뚜렷한 추세)면 추세추종 지표인 MACD 비중을 높이고, ADX<20(횡보)이면 평균회귀
 * 지표인 RSI 비중을 높인다. high/low/volume이 주어지면 ADX/ATR/추세/거래량 확인도 함께 계산한다.
 */
export function compositeSignal(
  closes,
  {
    rsiPeriod = 14,
    macdParams = [12, 26, 9],
    weights = null,
    histWindow = 20,
    highs = null,
    lows = null,
    volumes = null,
    adxPeriod = 14,
    trendFast = 20,
    trendSlow = 50,
    volWindow = 20,
  } = {}
) {
  const rsiArr = rsi(closes, rsiPeriod);
  const { macdLine, signalLine, histogram } = macd(closes, ...macdParams);

  const hasOHLC = Array.isArray(highs) && Array.isArray(lows) && highs.length === closes.length && lows.length === closes.length;
  const adxArr = hasOHLC ? adx(highs, lows, closes, adxPeriod) : new Array(closes.length).fill(null);
  const atrArr = hasOHLC ? atr(highs, lows, closes, adxPeriod) : new Array(closes.length).fill(null);
  const trendArr = trendState(closes, trendFast, trendSlow);
  const relVolArr =
    Array.isArray(volumes) && volumes.length === closes.length ? relativeVolume(volumes, volWindow) : new Array(closes.length).fill(null);
  const timingArr = hasOHLC && Array.isArray(volumes) && volumes.length === closes.length
    ? timingContext(highs, lows, closes, volumes).timing
    : new Array(closes.length).fill(null).map(() => ({ timingScore: null, timingLabel: 'WAIT', buyPoints: 0, sellPoints: 0, confirmations: [], warnings: [] }));

  let fixedWRsi = null;
  let fixedWMacd = null;
  if (weights) {
    const wSum = weights.rsi + weights.macd;
    fixedWRsi = weights.rsi / wSum;
    fixedWMacd = weights.macd / wSum;
  }

  const scores = closes.map((_, i) => {
    const r = rsiArr[i];
    const h = histogram[i];
    const base = {
      adx: adxArr[i],
      atr: atrArr[i],
      trend: trendArr[i],
      relVolume: relVolArr[i],
      timing: timingArr[i],
    };
    if (r == null || h == null) return { score: null, label: null, rsi: r, histogram: h, ...base };

    const rsiScore = clip((50 - r) / 50, -1, 1);

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

    let wRsi = 0.5;
    let wMacd = 0.5;
    if (fixedWRsi != null) {
      wRsi = fixedWRsi;
      wMacd = fixedWMacd;
    } else if (adxArr[i] != null) {
      if (adxArr[i] >= 25) {
        wRsi = 0.35;
        wMacd = 0.65;
      } else if (adxArr[i] < 20) {
        wRsi = 0.65;
        wMacd = 0.35;
      }
    }

    const score = wRsi * rsiScore + wMacd * macdScore;

    let label = 'HOLD';
    if (score > 0.5) label = 'STRONG_BUY';
    else if (score > 0.15) label = 'BUY';
    else if (score < -0.5) label = 'STRONG_SELL';
    else if (score < -0.15) label = 'SELL';

    const relVol = relVolArr[i];
    const isDirectional = label === 'BUY' || label === 'STRONG_BUY' || label === 'SELL' || label === 'STRONG_SELL';
    const volumeConfirmed = relVol != null && isDirectional ? relVol >= 1.2 : null;

    return {
      score,
      label,
      rsi: r,
      histogram: h,
      ...base,
      volumeConfirmed,
      weightRsi: wRsi,
      weightMacd: wMacd,
      timing: timingArr[i],
    };
  });

  return {
    rsi: rsiArr,
    macdLine,
    signalLine,
    histogram,
    adx: adxArr,
    atr: atrArr,
    trend: trendArr,
    relVolume: relVolArr,
    composite: scores,
  };
}

export const TREND_META = {
  UP: { text: '상승 추세', tone: 'good' },
  DOWN: { text: '하락 추세', tone: 'critical' },
  FLAT: { text: '횡보', tone: 'warning' },
};

/**
 * 시그널 기반의 단순 롱-온리 백테스트.
 * BUY/STRONG_BUY에서 매수(전량), SELL/STRONG_SELL에서 청산(현금 보유), HOLD는 직전 포지션 유지.
 * 거래비용과 슬리피지는 호출 시 선택적으로 반영하며, 이 앱이 산출한 시그널을 그대로 따랐을 때의
 * 참고용 결과다 (과최적화·생존 편향 등 실사용 전 반드시 별도 검증 필요).
 */
export function runBacktest(rows, { transactionCost = 0, slippage = 0 } = {}) {
  let position = 0; // 0 = 현금, 1 = 매수 보유
  let equity = 1;
  let buyHoldEquity = 1;
  const firstClose = rows[0]?.close ?? null;
  const curve = [];
  let peak = 1;
  let maxDrawdown = 0;
  const trades = [];
  let currentTrade = null;
  const friction = Math.max(0, Number(transactionCost) || 0) + Math.max(0, Number(slippage) || 0);

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const prevClose = i > 0 ? rows[i - 1].close : r.close;
    const dailyReturn = prevClose ? r.close / prevClose - 1 : 0;

    if (position === 1) equity *= 1 + dailyReturn;
    if (firstClose) buyHoldEquity = r.close / firstClose;

    peak = Math.max(peak, equity);
    maxDrawdown = Math.min(maxDrawdown, equity / peak - 1);
    curve.push({ date: r.date, strategy: equity, buyHold: buyHoldEquity });

    const label = r.signalLabel;
    if (position === 0 && (label === 'BUY' || label === 'STRONG_BUY')) {
      equity *= Math.max(0, 1 - friction);
      position = 1;
      currentTrade = { entryDate: r.date, entryPrice: r.close };
    } else if (position === 1 && (label === 'SELL' || label === 'STRONG_SELL')) {
      equity *= Math.max(0, 1 - friction);
      position = 0;
      if (currentTrade) {
        trades.push({ ...currentTrade, exitDate: r.date, exitPrice: r.close, return: (r.close / currentTrade.entryPrice) * Math.max(0, 1 - friction) ** 2 - 1 });
        currentTrade = null;
      }
    }
  }

  if (currentTrade) {
    const last = rows[rows.length - 1];
    trades.push({
      ...currentTrade,
      exitDate: last.date,
      exitPrice: last.close,
      return: last.close / currentTrade.entryPrice - 1,
      open: true,
    });
  }

  const wins = trades.filter((t) => t.return > 0).length;
  const winRate = trades.length > 0 ? wins / trades.length : null;

  return {
    curve,
    stats: {
      totalReturn: equity - 1,
      buyHoldReturn: buyHoldEquity - 1,
      maxDrawdown,
      winRate,
      tradeCount: trades.length,
    },
    trades,
  };
}

function runRuleBacktest(rows, rule) {
  let position = 0;
  let equity = 1;
  let peak = 1;
  let maxDrawdown = 0;
  let entry = null;
  const trades = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const prev = rows[i - 1]?.close ?? row.close;
    if (position) equity *= prev ? row.close / prev : 1;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.min(maxDrawdown, equity / peak - 1);
    const action = rule(row, i, rows);
    if (!position && action === 'BUY') { position = 1; entry = { entryDate: row.date, entryPrice: row.close }; }
    else if (position && action === 'SELL') { position = 0; trades.push({ ...entry, exitDate: row.date, exitPrice: row.close, return: row.close / entry.entryPrice - 1 }); entry = null; }
  }
  if (entry) { const last = rows.at(-1); trades.push({ ...entry, exitDate: last.date, exitPrice: last.close, return: last.close / entry.entryPrice - 1, open: true }); }
  return { totalReturn: equity - 1, maxDrawdown, winRate: trades.length ? trades.filter((t) => t.return > 0).length / trades.length : null, tradeCount: trades.length };
}

export function compareStrategies(rows) {
  const buyHold = rows.length > 1 && rows[0].close ? rows.at(-1).close / rows[0].close - 1 : 0;
  const buyHoldPeak = rows.reduce((state, row) => {
    const value = rows[0]?.close ? row.close / rows[0].close : 1;
    const peak = Math.max(state.peak, value);
    return { peak, mdd: Math.min(state.mdd, value / peak - 1) };
  }, { peak: 1, mdd: 0 });
  const timing = runRuleBacktest(rows, (row) => {
    if (row.timing?.timingLabel === 'BUY_ZONE' || row.timing?.timingLabel === 'WATCH_BUY') return 'BUY';
    if (row.timing?.timingLabel === 'SELL_ZONE' || row.timing?.timingLabel === 'WATCH_SELL') return 'SELL';
    return 'HOLD';
  });
  const trend = runRuleBacktest(rows, (row) => {
    if (row.timing?.emaFast == null || row.timing?.emaSlow == null) return 'HOLD';
    if (row.timing.emaFast > row.timing.emaSlow && (row.trend === 'UP' || row.signalLabel === 'BUY' || row.signalLabel === 'STRONG_BUY')) return 'BUY';
    if (row.timing.emaFast < row.timing.emaSlow && (row.trend === 'DOWN' || row.signalLabel === 'SELL' || row.signalLabel === 'STRONG_SELL')) return 'SELL';
    return 'HOLD';
  });
  const signal = runBacktest(rows).stats;
  return [
    { name: '종합 시그널', ...signal },
    { name: '타이밍 확인', ...timing },
    { name: '추세추종(EMA)', ...trend },
    { name: '단순 보유', totalReturn: buyHold, maxDrawdown: buyHoldPeak.mdd, winRate: null, tradeCount: 1 },
  ];
}

export const SIGNAL_META = {
  STRONG_BUY: { text: '강한 매수', short: 'BUY', tone: 'good' },
  BUY: { text: '매수', short: 'BUY', tone: 'good' },
  HOLD: { text: '관망', short: 'HOLD', tone: 'warning' },
  SELL: { text: '매도', short: 'SELL', tone: 'critical' },
  STRONG_SELL: { text: '강한 매도', short: 'SELL', tone: 'critical' },
};
