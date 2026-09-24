import { SIGNAL_META } from '../utils/indicators';
import { formatPrice, formatPercentSigned } from '../utils/format';

const TIMING_META = { BUY_ZONE: ['매수 후보', 'good'], WATCH_BUY: ['매수 관찰', 'good'], SELL_ZONE: ['매도 후보', 'critical'], WATCH_SELL: ['매도 관찰', 'critical'], WAIT: ['대기', 'warning'] };

export default function DecisionSummary({ last, prev, currency }) {
  const signal = SIGNAL_META[last?.signalLabel] ?? { text: '데이터 확인', tone: 'warning' };
  const timing = TIMING_META[last?.timing?.timingLabel] ?? TIMING_META.WAIT;
  const change = last?.close != null && prev?.close ? last.close / prev.close - 1 : null;
  const risk = last?.atr && last?.close ? last.close - last.atr * 2 : null;
  return (
    <section aria-label="현재 판단 요약">
      <div style={styles.wrap}>
      <Card featured label="현재 가장 중요한 판단 · 종합 시그널" value={signal.text} detail={last?.signalScore == null ? '—' : `점수 ${last.signalScore >= 0 ? '+' : ''}${last.signalScore.toFixed(2)}`} tone={signal.tone} />
      <Card label="현재가" value={formatPrice(last?.close, currency)} detail={change == null ? '변동률 없음' : `전일 대비 ${formatPercentSigned(change)}`} tone={change != null && change >= 0 ? 'good' : 'critical'} />
      <Card label="타이밍" value={timing[0]} detail={`${last?.timing?.buyPoints ?? 0} 매수 / ${last?.timing?.sellPoints ?? 0} 매도 조건`} tone={timing[1]} />
      <Card label="리스크 기준" value={risk == null ? '—' : formatPrice(risk, currency)} detail={risk == null ? 'ATR 계산 대기' : 'ATR×2 손절 참고선'} tone="warning" />
      </div>
      <Rationale last={last} />
    </section>
  );
}

function Rationale({ last }) {
  const positive = [];
  const caution = [];
  if (last?.histogram >= 0) positive.push('MACD 상승 모멘텀'); else caution.push('MACD 하락 모멘텀');
  if (last?.timing?.emaFast > last?.timing?.emaSlow) positive.push('EMA20이 EMA50 위'); else if (last?.timing?.emaFast != null) caution.push('EMA20이 EMA50 아래');
  if (last?.volumeConfirmed) positive.push('상대거래량 확인'); else if (last?.relVolume != null) caution.push('거래량 뒷받침 약함');
  if (last?.rsi >= 70) caution.push('RSI 과매수 구간');
  if (last?.timing?.percentB >= 0.9) caution.push('볼린저 상단 접근');
  return <div className="signal-rationale" style={styles.rationale}><div><span style={styles.rationaleLabel}>판단 근거</span><strong style={styles.rationaleTitle}>신호를 이렇게 해석합니다</strong></div><div style={styles.rationaleGroup}><span style={styles.goodLabel}>긍정 요인</span><span>{positive.length ? positive.join(' · ') : '확인 중'}</span></div><div style={styles.rationaleGroup}><span style={styles.cautionLabel}>주의 요인</span><span>{caution.length ? caution.join(' · ') : '뚜렷한 주의 신호 없음'}</span></div></div>;
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
  rationale: { display: 'grid', gridTemplateColumns: 'minmax(150px, 0.8fr) 1fr 1fr', gap: 12, alignItems: 'center', marginTop: 9, padding: '11px 14px', border: '1px solid var(--border)', borderRadius: 12, background: 'var(--surface-card-alt)', fontSize: 11, color: 'var(--text-secondary)' },
  rationaleLabel: { display: 'block', color: 'var(--text-muted)', fontSize: 10, marginBottom: 3 },
  rationaleTitle: { fontSize: 12, color: 'var(--text-primary)' },
  rationaleGroup: { display: 'flex', flexDirection: 'column', gap: 4, lineHeight: 1.45 },
  goodLabel: { color: 'var(--status-good)', fontWeight: 700 },
  cautionLabel: { color: 'var(--status-warning)', fontWeight: 700 },
};
