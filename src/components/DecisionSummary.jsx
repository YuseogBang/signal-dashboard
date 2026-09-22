import { SIGNAL_META } from '../utils/indicators';
import { formatPrice, formatPercentSigned } from '../utils/format';

const TIMING_META = { BUY_ZONE: ['매수 후보', 'good'], WATCH_BUY: ['매수 관찰', 'good'], SELL_ZONE: ['매도 후보', 'critical'], WATCH_SELL: ['매도 관찰', 'critical'], WAIT: ['대기', 'warning'] };

export default function DecisionSummary({ last, prev, currency, paperSnapshot }) {
  const signal = SIGNAL_META[last?.signalLabel] ?? { text: '데이터 확인', tone: 'warning' };
  const timing = TIMING_META[last?.timing?.timingLabel] ?? TIMING_META.WAIT;
  const change = last?.close != null && prev?.close ? last.close / prev.close - 1 : null;
  const risk = last?.atr && last?.close ? last.close - last.atr * 2 : null;
  return (
    <section aria-label="현재 판단 요약" style={styles.wrap}>
      <Card featured label="현재 가장 중요한 판단 · 종합 시그널" value={signal.text} detail={last?.signalScore == null ? '—' : `점수 ${last.signalScore >= 0 ? '+' : ''}${last.signalScore.toFixed(2)}`} tone={signal.tone} />
      <Card label="현재가" value={formatPrice(last?.close, currency)} detail={change == null ? '변동률 없음' : `전일 대비 ${formatPercentSigned(change)}`} tone={change != null && change >= 0 ? 'good' : 'critical'} />
      <Card label="타이밍" value={timing[0]} detail={`${last?.timing?.buyPoints ?? 0} 매수 / ${last?.timing?.sellPoints ?? 0} 매도 조건`} tone={timing[1]} />
      <Card label="리스크 기준" value={risk == null ? '—' : formatPrice(risk, currency)} detail={risk == null ? 'ATR 계산 대기' : 'ATR×2 손절 참고선'} tone="warning" />
      <div style={styles.account}><span style={styles.label}>모의계좌</span><strong className="mono-num">{formatPrice(paperSnapshot.equity, currency)}</strong><small>수익률 {formatPercentSigned(paperSnapshot.totalReturn)}</small></div>
    </section>
  );
}

function Card({ label, value, detail, tone, featured = false }) {
  return <div style={{ ...styles.card, ...(featured ? styles.featured : {}), ...toneCard(tone), borderTopColor: `var(--status-${tone})` }}><span style={styles.label}>{label}</span><strong style={{ color: tone === 'critical' ? '#dbeafe' : `var(--status-${tone})` }}>{value}</strong><small>{detail}</small></div>;
}

function toneCard(tone) {
  if (tone === 'good') return { background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.30), rgba(10, 44, 47, 0.94) 72%)', boxShadow: 'inset 0 1px 0 rgba(167, 243, 208, 0.16)' };
  if (tone === 'critical') return { background: 'linear-gradient(145deg, rgba(37, 99, 235, 0.40), rgba(22, 35, 64, 0.96) 72%)', boxShadow: 'inset 0 1px 0 rgba(191, 219, 254, 0.16)' };
  return { background: 'linear-gradient(145deg, rgba(245, 158, 11, 0.22), rgba(50, 43, 27, 0.94) 72%)' };
}

const styles = {
  wrap: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 8 },
  card: { background: 'var(--surface-card-alt)', border: '1px solid var(--border)', borderTop: '3px solid', borderRadius: 'var(--radius-card)', padding: '14px 15px', display: 'flex', flexDirection: 'column', gap: 5, minHeight: 92, boxShadow: 'var(--shadow-soft)' },
  featured: { gridColumn: 'span 2', minHeight: 118, padding: '18px 20px' },
  account: { background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-card)', padding: '14px 15px', display: 'flex', flexDirection: 'column', gap: 5, minHeight: 92, boxShadow: 'var(--shadow-soft)' },
  label: { color: 'var(--text-muted)', fontSize: 10.5, fontWeight: 700 },
};
