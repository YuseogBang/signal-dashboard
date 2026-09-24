const LABELS = {
  BUY_ZONE: { text: '매수 후보 구간', tone: 'good' },
  WATCH_BUY: { text: '매수 관찰', tone: 'good' },
  SELL_ZONE: { text: '매도 후보 구간', tone: 'critical' },
  WATCH_SELL: { text: '매도 관찰', tone: 'critical' },
  WAIT: { text: '대기', tone: 'warning' },
};

function formatPrice(value, currency) {
  if (value == null) return '-';
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
}

function formatPercent(value) {
  return value == null ? '-' : `${(value * 100).toFixed(1)}%`;
}

export default function TimingPanel({ last, currency }) {
  const timing = last?.timing;
  const meta = LABELS[timing?.timingLabel] ?? LABELS.WAIT;
  const confirmations = timing?.confirmations ?? [];
  const isBuy = timing?.timingLabel === 'BUY_ZONE' || timing?.timingLabel === 'WATCH_BUY';
  const isSell = timing?.timingLabel === 'SELL_ZONE' || timing?.timingLabel === 'WATCH_SELL';

  return (
    <section aria-labelledby="timing-heading">
      <div style={styles.header}>
        <div>
          <h2 id="timing-heading" style={styles.title}>매수·매도 타이밍 체크</h2>
          <p style={styles.description}>가격 위치, 모멘텀, 추세, 거래량이 같은 방향인지 확인합니다.</p>
        </div>
        <span style={{ ...styles.badge, ...toneStyles[meta.tone] }}>{meta.text}</span>
      </div>

      <div style={styles.grid}>
        <Metric label={<TermTooltip term="스토캐스틱">스토캐스틱 %K / %D</TermTooltip>} value={timing?.stochK == null ? '-' : `${timing.stochK.toFixed(1)} / ${timing.stochD.toFixed(1)}`} hint="과매도 20 · 과매수 80" />
        <Metric label={<TermTooltip term="볼린저">볼린저 %B</TermTooltip>} value={formatPercent(timing?.percentB)} hint="0% 하단 · 100% 상단" />
        <Metric label={<TermTooltip term="EMA">EMA 20 / 50</TermTooltip>} value={timing?.emaFast == null ? '-' : `${formatPrice(timing.emaFast, currency)} / ${formatPrice(timing.emaSlow, currency)}`} hint="단기·중기 추세 정렬" />
        <Metric label="최근 지지 / 저항" value={timing?.support == null ? '-' : `${formatPrice(timing.support, currency)} / ${formatPrice(timing.resistance, currency)}`} hint="최근 20봉 고저 범위" />
      </div>

      <div style={styles.summary}>
        <div>
          <span style={styles.summaryLabel}>조건 일치도</span>
          <strong style={styles.score}>{timing?.buyPoints ?? 0} 매수 / {timing?.sellPoints ?? 0} 매도</strong>
        </div>
        <p style={styles.reason}>
          {confirmations.length > 0 ? confirmations.join(' · ') : '아직 한 방향으로 모인 조건이 부족합니다.'}
        </p>
      </div>

      <div style={{ ...styles.note, ...(isBuy ? styles.buyNote : {}), ...(isSell ? styles.sellNote : {}) }}>
        {isBuy && '매수 후보: 한 번에 진입하기보다 지지선·거래량 재확인 후 분할 진입을 검토하세요.'}
        {isSell && '매도 후보: 저항선 반응과 추세 약화를 확인하고 보유 비중 조정을 검토하세요.'}
        {!isBuy && !isSell && '대기: 신호가 충분히 겹치지 않아 다음 봉의 돌파·이탈과 거래량을 기다립니다.'}
      </div>
    </section>
  );
}

function Metric({ label, value, hint }) {
  return (
    <div style={styles.metric}>
      <span style={styles.metricLabel}>{label}</span>
      <strong style={styles.metricValue}>{value}</strong>
      <span style={styles.metricHint}>{hint}</span>
    </div>
  );
}

const toneStyles = {
  good: { color: 'var(--status-good)', background: 'var(--status-good-bg)' },
  critical: { color: 'var(--status-critical)', background: 'var(--status-critical-bg)' },
  warning: { color: 'var(--status-warning)', background: 'var(--status-warning-bg)' },
};

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  title: { margin: 0, fontSize: 15, color: 'var(--text-primary)' },
  description: { margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' },
  badge: { padding: '5px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 },
  metric: { display: 'flex', flexDirection: 'column', gap: 4, padding: '11px 12px', background: 'var(--surface-card-alt)', borderRadius: 5 },
  metricLabel: { fontSize: 11, color: 'var(--text-muted)' },
  metricValue: { fontSize: 14, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' },
  metricHint: { fontSize: 10, color: 'var(--text-muted)' },
  summary: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--gridline)' },
  summaryLabel: { display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 },
  score: { fontSize: 13, color: 'var(--text-primary)' },
  reason: { margin: 0, textAlign: 'right', fontSize: 11, lineHeight: 1.5, color: 'var(--text-secondary)' },
  note: { marginTop: 12, padding: '9px 11px', borderRadius: 5, fontSize: 11, lineHeight: 1.5, color: 'var(--text-secondary)', background: 'var(--surface-card-alt)' },
  buyNote: { color: 'var(--status-good)', background: 'var(--status-good-bg)' },
  sellNote: { color: 'var(--status-critical)', background: 'var(--status-critical-bg)' },
};
import TermTooltip from './TermTooltip';
