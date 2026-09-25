// Decision support for daily bars. Rules are descriptive, not calibrated probabilities.
export const positive = (v) => Number.isFinite(Number(v)) && Number(v) > 0;
export const percent = (v) => Number.isFinite(v) ? `${(v * 100).toFixed(1)}%` : '자료 부족';
export const REGIMES = {
  UP: { name: '상승 추세', strategy: '눌림 지지 또는 돌파 확인', note: '높은 RSI만으로 청산하지 않고 추세와 가격 위치를 함께 확인합니다.' },
  DOWN: { name: '하락 추세', strategy: '반등 관찰 · 신규 진입 대기', note: '낮은 RSI만으로 매수하지 않습니다. 추세 회복을 먼저 확인합니다.' },
  RANGE: { name: '횡보', strategy: '하단 지지·상단 저항 확인', note: '추세 돌파가 발생하면 기존 범위 가정을 재검토합니다.' },
  TRANSITION: { name: '전환·혼조', strategy: '방향 확인 대기', note: '추세 강도와 방향이 아직 일치하지 않습니다.' },
  UNKNOWN: { name: '자료 부족', strategy: '추가 데이터 필요', note: '최소 50개 이상의 유효한 OHLC 일봉이 필요합니다.' },
};
export function regimeOf(row) {
  if (!Number.isFinite(row?.adx) || !row?.trend) return 'UNKNOWN';
  if (row.adx < 20) return 'RANGE';
  if (row.trend === 'UP') return 'UP';
  if (row.trend === 'DOWN') return 'DOWN';
  return 'TRANSITION';
}
export function sizePosition({ entry, stop, account, cash, riskPct = 1, maxWeight = 20, costBps = 0 }) {
  if (![entry, stop, account].every(positive) || !Number.isFinite(Number(cash)) || Number(cash) < 0 || stop >= entry || !positive(riskPct) || riskPct > 100 || !positive(maxWeight) || maxWeight > 100 || !Number.isFinite(Number(costBps)) || costBps < 0 || costBps > 1000) return null;
  const fee = costBps / 10000;
  const riskPerShare = entry - stop + (entry + stop) * fee;
  const budget = account * riskPct / 100;
  const unitCost = entry * (1 + fee);
  const units = Math.max(0, Math.floor(Math.min(budget / riskPerShare, cash / unitCost, account * maxWeight / 100 / unitCost)));
  return { units, value: units * entry, plannedLoss: units * riskPerShare, budget };
}
export function rewardRisk(entry, stop, target, costBps = 0) {
  if (![entry, stop, target].every(positive) || stop >= entry || target <= entry || costBps < 0 || !Number.isFinite(costBps)) return null;
  const fee = costBps / 10000;
  return (target - entry - (entry + target) * fee) / (entry - stop + (entry + stop) * fee);
}
export function scenarios(rows) {
  const last = rows.at(-1);
  if (!positive(last?.atr) || rows.length < 21 || !last.timing?.emaFast) return [];
  // Exclude today's bar: today's high must not retrospectively define its own breakout.
  const past = rows.slice(-21, -1);
  const support = Math.min(...past.map(r => r.low));
  const resistance = Math.max(...past.map(r => r.high));
  const a = last.atr;
  const targetHighs = rows.slice(0, -1).map(r => r.high).filter(Number.isFinite);
  const targetFor = entry => {
    const levels = targetHighs.filter(p => p > entry + a * 0.5);
    return levels.length ? Math.min(...levels) : null;
  };
  const pullback = Math.min(last.close * 0.995, Math.max(support, last.timing.emaFast));
  return [
    { id: 'now', name: '현재 가격 가정', entry: last.close, stop: support - a * 0.3, target: targetFor(last.close), condition: '다음 체결 가격 확인 후 계획 재계산' },
    { id: 'pullback', name: '눌림 지지 확인', entry: pullback, stop: Math.min(support, pullback) - a * 0.3, target: targetFor(pullback), condition: '해당 구간 도달 후 지지 회복 확인 · 미도달 가능' },
    { id: 'breakout', name: '저항 돌파 확인', entry: resistance + a * 0.1, stop: resistance - a, target: targetFor(resistance + a * 0.1), condition: '이전 20봉 고가 위 종가 확인 후 다음 체결 · 갭 확인' },
  ].map(s => ({ ...s, stop: s.stop > 0 && s.stop < s.entry ? s.stop : null, targetSource: s.target ? '과거 고가 구간 (검토용)' : '상단 가격 근거 부족 · 직접 입력' }));
}
export function anchoredVwap(rows, anchor) {
  let pv = 0; let volume = 0; let incomplete = false;
  return rows.map(r => {
    if (r.date < anchor) return { ...r, avwap: null };
    if (![r.high, r.low, r.close].every(positive) || !Number.isFinite(r.volume) || r.volume < 0) incomplete = true;
    if (!incomplete && r.volume > 0) { pv += ((r.high + r.low + r.close) / 3) * r.volume; volume += r.volume; }
    return { ...r, avwap: !incomplete && volume > 0 ? pv / volume : null };
  });
}
export function comparison(stock, benchmark, sector, lookback = 20) {
  const b = new Map(benchmark.map(r => [r.date, r.close]));
  const s = new Map(sector.map(r => [r.date, r.close]));
  const aligned = stock.filter(r => positive(r.close) && positive(b.get(r.date)) && (!sector.length || positive(s.get(r.date))));
  if (aligned.length < lookback + 6 || aligned.at(-1)?.date !== stock.at(-1)?.date) return null;
  const base = aligned[Math.max(0, aligned.length - lookback - 6)];
  const curve = aligned.slice(-lookback - 6).map(r => ({ date: r.date, stock: r.close / base.close * 100, benchmark: b.get(r.date) / b.get(base.date) * 100, sector: sector.length ? s.get(r.date) / s.get(base.date) * 100 : null }));
  const rsAt = (index, map) => {
    const end = aligned[index], start = aligned[index - lookback];
    return end.close / start.close - map.get(end.date) / map.get(start.date);
  };
  const n = aligned.length - 1;
  const strength = rsAt(n, b);
  const sectorStrength = sector.length ? rsAt(n, s) : null;
  const momentum = strength - rsAt(n - 5, b);
  return { curve, strength, momentum, sectorStrength, from: aligned[n - lookback].date, to: aligned[n].date, label: strength >= 0 ? (momentum >= 0 ? '강세 확대' : '강세 둔화') : (momentum >= 0 ? '약세 개선' : '약세 확대') };
}
export function evaluateTheses(plan, rows, relative = null) {
  const last = rows.at(-1);
  const anchored = plan.anchor && rows[0]?.date <= plan.anchor ? anchoredVwap(rows, plan.anchor).at(-1)?.avwap : null;
  const values = {
    trend: last?.timing?.emaFast != null ? last.close > last.timing.emaFast && last.timing.emaFast > last.timing.emaSlow : null,
    support: positive(plan.support) ? last?.close >= plan.support : null,
    relative: relative == null ? null : relative > 0,
    anchor: anchored == null ? null : last?.close >= anchored,
  };
  const names = { trend: 'EMA 상승 정렬 유지', support: '저장한 지지 가격 유지', relative: '시장 대비 상대강세 유지', anchor: '이벤트 평균 가격 유지' };
  return (plan.theses || []).map(key => ({ key, name: names[key], status: values[key] == null ? '자료 부족' : values[key] ? '유지' : '약화' }));
}
export function exitState(plan, rows) {
  const since = rows.filter(r => r.date >= plan.date);
  if (!since.length || !positive(plan.entry) || !positive(plan.stop)) return null;
  const last = since.at(-1);
  const rangeCovered = rows[0]?.date <= plan.date;
  // Ratchet across all available bars. Never loosen the stored long stop.
  let trail = Math.max(Number(plan.stop), Number(plan.trail || 0));
  let peak = Number(plan.entry);
  for (const r of since) {
    peak = Math.max(peak, r.close);
    if (positive(r.atr)) trail = Math.max(trail, peak - r.atr * Number(plan.multiplier || 2));
  }
  return { trail, priceExit: last.close <= trail, targetHit: positive(plan.target) && last.close >= plan.target, elapsed: Math.max(0, since.length - 1), timeExit: since.length - 1 >= Number(plan.horizon || 20), pnl: last.close / plan.entry - 1, rangeCovered };
}
export function conditionSnapshot(last, plan, rows, relative = null, events = []) {
  const state = plan ? exitState(plan, rows) : null;
  const theses = plan ? evaluateTheses(plan, rows, relative) : [];
  const upcoming = events.filter(e => e.date >= last.date && (Date.parse(e.date) - Date.parse(last.date)) / 86400000 <= 7);
  return { relative: relative == null ? '자료 부족' : relative > 0 ? '시장 대비 강세' : '시장 대비 약세', thesis: theses.map(t => `${t.name}: ${t.status}`).join(' · ') || '계획 없음', event: upcoming.map(e => `${e.date} ${e.name}`).join(' · ') || '7일 내 등록 일정 없음', time: state?.timeExit ? '보유기간 경과' : '기간 내·미설정', regime: REGIMES[regimeOf(last)].name, signal: last?.signalLabel || '자료 부족', timing: last?.timing?.timingLabel || 'WAIT', stop: state ? (state.priceExit ? '청산선 이하' : '청산선 위') : '계획 없음', target: state ? (state.targetHit ? '목표 도달' : '미도달') : '계획 없음' };
}
export function snapshotChanges(before, after) {
  const names = { relative: '상대강도', thesis: '매수 근거', event: '등록 일정', time: '보유기간', regime: '시장 상태', signal: '종합 시그널', timing: '진입 조건', stop: '청산선', target: '목표가' };
  return before ? Object.keys(names).filter(k => before[k] !== after[k]).map(k => ({ name: names[k], before: before[k], after: after[k] })) : [];
}
export function historicalCases(rows, { horizon = 10, costBps = 10, stopAtr = 2, targetAtr = 3 } = {}) {
  const current = rows.at(-1); const regime = regimeOf(current);
  if (!current || regime === 'UNKNOWN' || ![5, 10, 20].includes(horizon) || !Number.isFinite(costBps) || costBps < 0 || costBps > 1000) return { cases: [], insufficient: true };
  // Fixed rules, only matured, non-overlapping observations; most recent third is a time holdout.
  const split = Math.floor(rows.length * 2 / 3); const cases = [];
  for (let i = Math.max(50, split); i + horizon < rows.length - 1; i++) {
    const r = rows[i];
    if (regimeOf(r) !== regime || r.signalLabel !== current.signalLabel || !positive(r.atr)) continue;
    const future = rows.slice(i + 1, i + horizon + 1);
    const entry = future[0].open;
    if (!positive(entry) || future.some(b => b.ohlcMissing || b.openMissing || ![b.low,b.high,b.open,b.close].every(positive))) continue;
    const stop = entry - stopAtr * r.atr, target = entry + targetAtr * r.atr;
    if (stop <= 0) continue;
    let outcome = '미도달'; let worst = 0;
    for (const bar of future) {
      worst = Math.min(worst, bar.low / entry - 1);
      if (outcome !== '미도달') continue;
      if (bar.open <= stop) outcome = '손절 먼저';
      else if (bar.open >= target) outcome = '목표 먼저';
      else if (bar.low <= stop && bar.high >= target) outcome = '순서 불명';
      else if (bar.low <= stop) outcome = '손절 먼저';
      else if (bar.high >= target) outcome = '목표 먼저';
    }
    const fee = costBps / 10000;
    const ret = future.at(-1).close * (1 - fee) / (entry * (1 + fee)) - 1;
    cases.push({ date: r.date, ret, worst, outcome });
    i += horizon; // no shared entry/exit bars across observations
  }
  const sorted = cases.map(c => c.ret).sort((a, b) => a - b);
  const q = p => sorted.length ? sorted[Math.floor((sorted.length - 1) * p)] : null;
  return { cases, insufficient: cases.length < 30, median: q(.5), low: q(.1), high: q(.9), worst: cases.length ? Math.min(...cases.map(c => c.worst)) : null, from: rows[split]?.date };
}
export function correlation(a, b) {
  const bm = new Map(b.map(r => [r.date, r.close]));
  const aligned = a.filter(r => positive(r.close) && positive(bm.get(r.date))).slice(-61);
  if (aligned.length < 21) return null;
  const x = aligned.slice(1).map((r, i) => r.close / aligned[i].close - 1);
  const y = aligned.slice(1).map((r, i) => bm.get(r.date) / bm.get(aligned[i].date) - 1);
  const mx = x.reduce((s, v) => s + v, 0) / x.length, my = y.reduce((s, v) => s + v, 0) / y.length;
  let xy = 0, xx = 0, yy = 0;
  x.forEach((v, i) => { xy += (v - mx) * (y[i] - my); xx += (v - mx) ** 2; yy += (y[i] - my) ** 2; });
  return xx > 0 && yy > 0 ? xy / Math.sqrt(xx * yy) : null;
}
export function portfolioRisk(holdings, { baseCurrency = 'KRW', usdKrw = 0 } = {}) {
  const groups = {}; let total = 0, loss = 0; const missing = [];
  for (const h of holdings) {
    const fx = h.currency === baseCurrency ? 1 : positive(usdKrw) ? (baseCurrency === 'KRW' ? Number(usdKrw) : 1 / Number(usdKrw)) : null;
    if (!fx || ![h.price, h.units].every(positive)) { missing.push(h.symbol); continue; }
    const value = h.price * h.units * fx;
    const plannedLoss = positive(h.stop) ? Math.max(0, h.price - h.stop) * h.units * fx : null;
    total += value; loss += plannedLoss || 0;
    groups[h.sector || '미분류'] = (groups[h.sector || '미분류'] || 0) + value;
  }
  return { total, loss, groups, missing, missingStops: holdings.filter(h => !positive(h.stop)).length };
}
