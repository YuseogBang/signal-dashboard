import { useEffect, useMemo, useState } from 'react';
import { formatPrice, formatPercentSigned } from '../utils/format';

export default function PaperTradingPanel({ symbol, currency, last, paper, snapshot, onOrder, onJournal, onReset }) {
  const [side, setSide] = useState('BUY');
  const [qty, setQty] = useState('1');
  const [stop, setStop] = useState(last?.atr && last.close ? String(Math.round(last.close - last.atr * 2)) : '');
  const [target, setTarget] = useState(last?.atr && last.close ? String(Math.round(last.close + last.atr * 3)) : '');
  const [reason, setReason] = useState('');
  const [journalText, setJournalText] = useState('');
  const [maxPositionPct, setMaxPositionPct] = useState('30');
  const [riskPct, setRiskPct] = useState('1');
  const [dailyLossPct, setDailyLossPct] = useState('3');
  const position = snapshot.positions.find((p) => p.symbol === symbol);
  const alert = useMemo(() => {
    if (!position) return null;
    if (position.stop && position.lastPrice <= position.stop) return { text: '손절가 도달 — 포지션을 재확인하세요.', tone: 'critical' };
    if (position.target && position.lastPrice >= position.target) return { text: '목표가 도달 — 분할 청산 여부를 검토하세요.', tone: 'good' };
    return null;
  }, [position]);

  useEffect(() => {
    if (last?.atr && last.close) {
      setStop(String(Math.round(last.close - last.atr * 2)));
      setTarget(String(Math.round(last.close + last.atr * 3)));
    }
  }, [last?.close, last?.atr]);

  function submitOrder(e) {
    e.preventDefault();
    onOrder({ symbol, side, qty, price: last?.close, stop: Number(stop) || null, target: Number(target) || null, reason, maxPositionPct: Number(maxPositionPct), riskPct: Number(riskPct), dailyLossPct: Number(dailyLossPct) });
    setReason('');
  }

  return (
    <section aria-labelledby="paper-heading">
      <div style={styles.titleRow}><h2 id="paper-heading" style={styles.h2}>모의투자 워크스페이스</h2><span style={styles.badge}>브라우저 저장</span></div>
      <p style={styles.note}>실제 주문 없이 현재 가격으로 가상 체결합니다. 계좌·거래·일지는 이 브라우저의 로컬 저장소에만 보관됩니다.</p>
      {alert && <div role="alert" style={{ ...styles.alert, color: `var(--status-${alert.tone})`, background: `var(--status-${alert.tone}-bg)` }}>{alert.text}</div>}

      <div style={styles.stats}>
        <Metric label="총 평가금액" value={formatPrice(snapshot.equity, currency)} />
        <Metric label="현금" value={formatPrice(paper.cash, currency)} />
        <Metric label="총 수익률" value={formatPercentSigned(snapshot.totalReturn)} tone={snapshot.totalReturn >= 0 ? 'good' : 'critical'} />
        <Metric label="오늘 손익" value={formatPrice(snapshot.dailyPnl, currency)} tone={snapshot.dailyPnl >= 0 ? 'good' : 'critical'} />
      </div>

      <div style={styles.columns}>
        <form onSubmit={submitOrder} style={styles.form}>
          <div style={styles.formTitle}>가상 주문 · {symbol}</div>
          <div style={styles.toggle}><button type="button" className="ctrl" style={side === 'BUY' ? styles.activeBuy : {}} onClick={() => setSide('BUY')}>매수</button><button type="button" className="ctrl" style={side === 'SELL' ? styles.activeSell : {}} onClick={() => setSide('SELL')}>매도</button></div>
          <div style={styles.fieldRow}><Field label="수량" value={qty} onChange={setQty} type="number" min="1" step="1" /><Field label={`현재가 (${currency})`} value={last?.close ?? ''} readOnly /></div>
          <div style={styles.fieldRow}><Field label="손절가" value={stop} onChange={setStop} type="number" /><Field label="목표가" value={target} onChange={setTarget} type="number" /></div>
          <div style={styles.fieldRow}><Field label="최대 종목 비중 (%)" value={maxPositionPct} onChange={setMaxPositionPct} type="number" min="1" max="100" /><Field label="거래당 위험 (%)" value={riskPct} onChange={setRiskPct} type="number" min="0.1" max="10" step="0.1" /></div>
          <Field label="일일 최대 손실 한도 (%)" value={dailyLossPct} onChange={setDailyLossPct} type="number" min="0.5" max="20" step="0.5" />
          <label style={styles.label}>매매 이유<textarea className="ctrl" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="예: 지지선 반등 + 거래량 확인" rows={2} /></label>
          <button className="ctrl" type="submit" style={styles.submit}>{side === 'BUY' ? '가상 매수 기록' : '가상 매도 기록'}</button>
        </form>

        <div style={styles.sideBox}>
          <div style={styles.formTitle}>현재 포지션</div>
          {position ? <><div style={styles.positionLine}><b>{position.qty.toLocaleString('ko-KR')}주</b><span className="mono-num">평가 {formatPrice(position.marketValue, currency)}</span></div><div style={styles.meta}>평균 {formatPrice(position.avgPrice, currency)} · 손익 {formatPrice(position.unrealizedPnl, currency)} ({formatPercentSigned(position.returnPct)})</div><div style={styles.meta}>손절 {formatPrice(position.stop, currency)} · 목표 {formatPrice(position.target, currency)}</div></> : <div style={styles.empty}>현재 종목의 보유 포지션이 없습니다.</div>}
          {snapshot.positions.length > 0 && <div style={styles.holdings}>{snapshot.positions.map((item) => <div key={item.symbol} style={styles.positionLine}><span>{item.symbol} · {item.qty}주</span><span className="mono-num">{formatPrice(item.marketValue, currency)}</span></div>)}</div>}
          <div style={{ ...styles.formTitle, marginTop: 18 }}>매매일지 추가</div>
          <textarea className="ctrl" value={journalText} onChange={(e) => setJournalText(e.target.value)} placeholder="오늘의 판단, 감정, 계획 준수 여부를 기록하세요." rows={3} />
          <button className="ctrl" style={{ marginTop: 8 }} onClick={() => { if (journalText.trim()) { onJournal({ symbol, text: journalText.trim() }); setJournalText(''); } }}>일지 저장</button>
        </div>
      </div>

      <div style={styles.history}><div style={styles.formTitle}>최근 체결·일지</div>{paper.trades.slice(0, 5).map((trade) => <div key={trade.id} style={styles.historyRow}><span style={{ color: trade.side === 'BUY' ? 'var(--status-good)' : 'var(--status-critical)', fontWeight: 700 }}>{trade.side === 'BUY' ? '매수' : '매도'} {trade.qty}주</span><span>{formatPrice(trade.price, currency)}</span><span>{trade.reason}</span></div>)}{paper.journal.slice(0, 3).map((entry) => <div key={entry.id} style={styles.historyRow}><span style={styles.badge}>일지</span><span>{entry.symbol}</span><span>{entry.text}</span></div>)}{paper.trades.length === 0 && paper.journal.length === 0 && <div style={styles.empty}>아직 기록이 없습니다.</div>}</div>
      <button className="ctrl" style={styles.reset} onClick={onReset}>모의계좌 초기화</button>
    </section>
  );
}

function Field({ label, value, onChange, ...props }) { return <label style={styles.label}>{label}<input className="ctrl" value={value} onChange={onChange ? (e) => onChange(e.target.value) : undefined} {...props} /></label>; }
function Metric({ label, value, tone }) { return <div style={styles.metric}><div style={styles.meta}>{label}</div><strong className="mono-num" style={{ color: tone ? `var(--status-${tone})` : 'var(--text-primary)' }}>{value}</strong></div>; }

const styles = {
  titleRow: { display: 'flex', alignItems: 'center', gap: 8 }, h2: { fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', margin: '0 0 6px' }, badge: { fontSize: 10, color: 'var(--accent-strong)', border: '1px solid var(--border)', borderRadius: 999, padding: '2px 7px' }, note: { fontSize: 11.5, color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: 1.5 }, alert: { borderRadius: 6, padding: '9px 12px', fontSize: 12, fontWeight: 700, marginBottom: 12 }, stats: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 1, background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', marginBottom: 14 }, metric: { background: 'var(--surface-card)', padding: '10px 12px' }, meta: { fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }, metricValue: { fontSize: 16 }, columns: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: 14 }, form: { border: '1px solid var(--border)', borderRadius: 6, padding: 14, display: 'flex', flexDirection: 'column', gap: 9 }, sideBox: { border: '1px solid var(--border)', borderRadius: 6, padding: 14 }, formTitle: { fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700, marginBottom: 8 }, toggle: { display: 'flex', gap: 6 }, activeBuy: { color: 'var(--status-good)', borderColor: 'var(--status-good)' }, activeSell: { color: 'var(--status-critical)', borderColor: 'var(--status-critical)' }, fieldRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }, label: { display: 'flex', flexDirection: 'column', gap: 5, fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }, submit: { marginTop: 2, color: 'var(--seafoam)', borderColor: 'var(--accent)' }, positionLine: { display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 14 }, holdings: { display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid var(--gridline)', marginTop: 12, paddingTop: 10 }, empty: { color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.5 }, history: { borderTop: '1px solid var(--gridline)', marginTop: 16, paddingTop: 14 }, historyRow: { display: 'grid', gridTemplateColumns: '90px 120px minmax(0, 1fr)', gap: 8, fontSize: 11.5, padding: '7px 0', borderBottom: '1px solid var(--gridline)', color: 'var(--text-secondary)' }, reset: { marginTop: 12, fontSize: 11, color: 'var(--text-muted)' },
};
