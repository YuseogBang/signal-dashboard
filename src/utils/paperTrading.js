const STORAGE_KEY = 'signal-dashboard-paper-trading-v1';

export const DEFAULT_PAPER_STATE = {
  cash: 10_000_000,
  positions: {},
  trades: [],
  journal: [],
  startingCapital: 10_000_000,
};

export function loadPaperState() {
  if (typeof window === 'undefined') return DEFAULT_PAPER_STATE;
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    return saved ? { ...DEFAULT_PAPER_STATE, ...saved, positions: saved.positions ?? {}, trades: saved.trades ?? [], journal: saved.journal ?? [] } : DEFAULT_PAPER_STATE;
  } catch {
    return DEFAULT_PAPER_STATE;
  }
}

export function persistPaperState(state) {
  if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetPaperState() {
  if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY);
  return { ...DEFAULT_PAPER_STATE, positions: {}, trades: [], journal: [] };
}

export function getPortfolioSnapshot(state, currentSymbol, currentPrice) {
  const positions = Object.entries(state.positions ?? {}).map(([symbol, p]) => {
    const price = symbol === currentSymbol && currentPrice != null ? currentPrice : p.lastPrice ?? p.avgPrice;
    const marketValue = p.qty * price;
    return { symbol, ...p, lastPrice: price, marketValue, unrealizedPnl: (price - p.avgPrice) * p.qty, returnPct: p.avgPrice ? price / p.avgPrice - 1 : 0 };
  });
  const holdings = positions.reduce((sum, p) => sum + p.marketValue, 0);
  const equity = state.cash + holdings;
  const realizedPnl = (state.trades ?? []).reduce((sum, t) => sum + (t.realizedPnl ?? 0), 0);
  const today = new Date().toISOString().slice(0, 10);
  const dailyPnl = (state.trades ?? []).filter((t) => t.timestamp?.slice(0, 10) === today).reduce((sum, t) => sum + (t.realizedPnl ?? 0), 0) + positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
  return { positions, holdings, equity, realizedPnl, dailyPnl, totalReturn: state.startingCapital ? equity / state.startingCapital - 1 : 0 };
}

export function updatePositionPrice(state, symbol, price) {
  const position = state.positions?.[symbol];
  if (!position) return state;
  return { ...state, positions: { ...state.positions, [symbol]: { ...position, lastPrice: price } } };
}

export function executePaperOrder(state, { symbol, side, qty, price, stop, target, reason, maxPositionPct = 30, riskPct = 1, dailyLossPct = 3 }) {
  const quantity = Math.floor(Number(qty));
  const orderPrice = Number(price);
  if (!symbol || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(orderPrice) || orderPrice <= 0) return { error: '수량과 가격을 올바르게 입력하세요.' };

  const current = state.positions?.[symbol] ?? { qty: 0, avgPrice: 0, lastPrice: orderPrice, stop: null, target: null };
  const currentEquity = state.cash + Object.entries(state.positions ?? {}).reduce((sum, [key, p]) => sum + p.qty * (key === symbol ? orderPrice : p.lastPrice ?? p.avgPrice), 0);
  const value = quantity * orderPrice;
  const today = new Date().toISOString().slice(0, 10);
  const realizedToday = (state.trades ?? []).filter((t) => t.timestamp?.slice(0, 10) === today).reduce((sum, t) => sum + (t.realizedPnl ?? 0), 0);

  if (side === 'BUY' && realizedToday <= -(currentEquity * (dailyLossPct / 100))) return { error: `오늘 손실 한도(${dailyLossPct}%)에 도달해 신규 매수를 막았습니다.` };

  if (side === 'BUY') {
    if (value > state.cash) return { error: '현금 잔고가 부족합니다.' };
    const nextValue = (current.qty + quantity) * orderPrice;
    if (nextValue > currentEquity * (maxPositionPct / 100)) return { error: `종목 비중 제한(${maxPositionPct}%)을 초과합니다.` };
    if (stop && orderPrice > stop && ((orderPrice - stop) * quantity) > currentEquity * (riskPct / 100)) return { error: `예상 손실이 거래당 제한(${riskPct}%)을 초과합니다.` };
    const nextQty = current.qty + quantity;
    const nextAvg = ((current.avgPrice * current.qty) + value) / nextQty;
    const trade = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), symbol, side, qty: quantity, price: orderPrice, realizedPnl: 0, reason: reason || '매수 계획 실행' };
    return { state: { ...state, cash: state.cash - value, positions: { ...state.positions, [symbol]: { ...current, qty: nextQty, avgPrice: nextAvg, lastPrice: orderPrice, stop: stop || current.stop, target: target || current.target } }, trades: [trade, ...(state.trades ?? [])] }, trade };
  }

  if (side === 'SELL') {
    if (!state.positions?.[symbol] || current.qty < quantity) return { error: '보유 수량보다 많이 매도할 수 없습니다.' };
    const realizedPnl = (orderPrice - current.avgPrice) * quantity;
    const remaining = current.qty - quantity;
    const positions = { ...state.positions };
    if (remaining === 0) delete positions[symbol];
    else positions[symbol] = { ...current, qty: remaining, lastPrice: orderPrice };
    const trade = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), symbol, side, qty: quantity, price: orderPrice, realizedPnl, reason: reason || '매도 계획 실행' };
    return { state: { ...state, cash: state.cash + value, positions, trades: [trade, ...(state.trades ?? [])] }, trade };
  }

  return { error: '지원하지 않는 주문 유형입니다.' };
}
