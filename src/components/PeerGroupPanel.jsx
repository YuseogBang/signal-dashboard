import { getSampleData, SAMPLE_TICKERS } from '../data/sampleData';
import { compositeSignal } from '../utils/indicators';
import { formatPercentSigned } from '../utils/format';

export const PEER_GROUPS = {
  '005930': { name: 'KOSPI 반도체·AI', peers: ['000660', '042700'] },
  '000660': { name: 'KOSPI 반도체·AI', peers: ['005930', '042700'] },
  '042700': { name: 'KOSPI 반도체·AI', peers: ['005930', '000660'] },
  NVDA: { name: 'NASDAQ AI·반도체', peers: ['AMD'] },
  AMD: { name: 'NASDAQ AI·반도체', peers: ['NVDA'] },
};

export default function PeerGroupPanel({ data, symbol, sourceType, peerData = {}, peerLoading = false }) {
  const group = PEER_GROUPS[symbol?.toUpperCase()];
  if (!group) return <section aria-labelledby="peer-heading"><h2 id="peer-heading" style={styles.title}>피어 그룹</h2><p style={styles.empty}>종목 코드가 확인되면 동종 그룹을 연결합니다. CSV 업로드 종목은 피어 코드를 직접 지정하는 기능을 다음 단계로 확장할 수 있습니다.</p></section>;

  const current = summarize(data);
  const peers = group.peers.map((peerId) => {
    const ticker = SAMPLE_TICKERS.find((item) => item.id === peerId);
    const liveRows = peerData[peerId];
    return { ...ticker, ...summarize(liveRows ?? getSampleData(peerId)), isCurrent: false, isLive: Boolean(liveRows) };
  });
  const rows = [{ id: symbol, label: symbol, ...current, isCurrent: true }, ...peers].sort((a, b) => b.return20 - a.return20);
  const peerAverage = peers.length ? peers.reduce((sum, row) => sum + row.return20, 0) / peers.length : null;
  const breadth = rows.filter((row) => row.return20 >= 0).length / rows.length;

  return (
    <section aria-labelledby="peer-heading">
      <div style={styles.header}><div><h2 id="peer-heading" style={styles.title}>피어 그룹 비교</h2><p style={styles.description}>{group.name} 안에서 현재 종목의 상대적인 강도와 흐름을 비교합니다.</p></div><span style={styles.badge}>{peerLoading ? '피어 조회 중…' : sourceType === 'live' && peers.every((row) => row.isLive) ? '현재·피어 실시간' : sourceType === 'live' ? '현재 실시간 · 일부 피어 샘플' : '샘플 비교 데이터'}</span></div>
      <div className="peer-summary" style={styles.summary}><Metric label="그룹 평균 20봉 수익률" value={formatPercentSigned(peerAverage)} /><Metric label="상승 종목 비중" value={`${(breadth * 100).toFixed(0)}%`} /><Metric label="현재 종목 상대강도" value={peerAverage == null ? '—' : formatPercentSigned(current.return20 - peerAverage)} tone={current.return20 >= peerAverage ? 'good' : 'critical'} /></div>
      <div style={styles.table}>
        <div style={styles.tableHead}><span>종목</span><span>20봉 수익률</span><span>변동성</span><span>현재 시그널</span></div>
        {rows.map((row, index) => <div key={row.id} style={{ ...styles.row, ...(row.isCurrent ? styles.current : {}) }}><span><b>{index + 1}</b> {row.label}{row.isCurrent && <em> 현재</em>}</span><strong style={{ color: row.return20 >= 0 ? 'var(--status-good)' : 'var(--status-critical)' }}>{formatPercentSigned(row.return20)}</strong><span>{formatPercentSigned(row.volatility)}</span><span style={{ color: tone(row.signal) }}>{row.signal}</span></div>)}
      </div>
      <p style={styles.note}>피어 데이터는 현재 연결된 종목 API의 범위에 따라 달라집니다. 현재는 비교 화면을 빠르게 열어볼 수 있도록 등록된 동종 샘플 종목을 사용하며, 실제 운용 시 피어도 실시간 조회 대상으로 확장할 수 있습니다.</p>
    </section>
  );
}

function summarize(rows) {
  const closes = rows.map((row) => row.close).filter(Number.isFinite);
  if (closes.length < 2) return { return20: 0, volatility: 0, signal: '데이터 부족', close: null };
  const start = closes[Math.max(0, closes.length - 21)];
  const recent = closes.slice(-21);
  const returns = recent.slice(1).map((close, i) => Math.abs(close / recent[i] - 1));
  const result = compositeSignal(closes, { highs: rows.map((row) => row.high ?? row.close), lows: rows.map((row) => row.low ?? row.close), volumes: null });
  const signal = result.composite.at(-1)?.label;
  return { return20: start ? closes.at(-1) / start - 1 : 0, volatility: returns.length ? returns.reduce((sum, value) => sum + value, 0) / returns.length : 0, signal: signal === 'STRONG_BUY' || signal === 'BUY' ? '매수' : signal === 'STRONG_SELL' || signal === 'SELL' ? '매도' : '관망', close: closes.at(-1) };
}

function Metric({ label, value, tone }) { return <div style={styles.metric}><span>{label}</span><strong style={tone ? { color: `var(--status-${tone})` } : {}} className="mono-num">{value}</strong></div>; }
function tone(signal) { return signal === '매수' ? 'var(--status-good)' : signal === '매도' ? 'var(--status-critical)' : 'var(--status-warning)'; }

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  title: { margin: 0, fontSize: 15, color: 'var(--text-primary)' },
  description: { margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' },
  badge: { color: 'var(--accent-strong)', background: 'var(--accent-soft)', borderRadius: 999, padding: '5px 9px', fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap' },
  summary: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginBottom: 12 },
  metric: { background: 'var(--surface-card-alt)', borderRadius: 5, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 },
  table: { border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' },
  tableHead: { display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 0.8fr', gap: 8, padding: '8px 12px', color: 'var(--text-muted)', fontSize: 10.5, background: 'var(--surface-card-alt)' },
  row: { display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 0.8fr', gap: 8, padding: '10px 12px', borderTop: '1px solid var(--gridline)', fontSize: 12, alignItems: 'center' },
  current: { background: 'var(--accent-soft)', boxShadow: 'inset 3px 0 0 var(--accent-strong)' },
  note: { color: 'var(--text-muted)', fontSize: 10.5, lineHeight: 1.5, margin: '11px 0 0' },
  empty: { color: 'var(--text-muted)', fontSize: 12 },
};
