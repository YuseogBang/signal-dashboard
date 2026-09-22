import { SIGNAL_META, TREND_META } from '../utils/indicators';
import { formatPrice, formatPercentAbs, formatDecimal1, formatDecimal2 } from '../utils/format';

export default function StatTiles({
  last,
  prev,
  currency,
  rsi,
  histogram,
  signalLabel,
  signalScore,
  adx,
  trend,
  relVolume,
  volumeConfirmed,
  weightRsi,
  weightMacd,
}) {
  const change = last != null && prev != null ? (last - prev) / prev : null;
  const changeUp = change != null && change >= 0;
  const meta = signalLabel ? SIGNAL_META[signalLabel] : null;
  const trendMeta = trend ? TREND_META[trend] : null;

  // 게이지: -1(강한 매도) ~ +1(강한 매수)를 0~100% 위치로 변환
  const gaugePct = signalScore != null ? clip(((signalScore + 1) / 2) * 100, 0, 100) : 50;

  const strongTrendConflict = adx != null && adx >= 25 && trend === 'UP' && (signalLabel === 'SELL' || signalLabel === 'STRONG_SELL');
  const strongTrendConflictDown = adx != null && adx >= 25 && trend === 'DOWN' && (signalLabel === 'BUY' || signalLabel === 'STRONG_BUY');

  return (
    <div style={styles.wrap}>
      <div style={{ ...styles.hero, ...styles.heroTone(meta?.tone) }}>
        <div style={styles.heroTop}>
          <div>
            <div style={styles.label}>종합 시그널</div>
            <div style={{ ...styles.heroValue, color: toneColor(meta?.tone) }}>{meta ? meta.text : '—'}</div>
          </div>
          <div style={styles.heroScore} className="mono-num">
            {signalScore != null ? (signalScore >= 0 ? '+' : '') + formatDecimal2(signalScore) : '—'}
          </div>
        </div>
        <div style={styles.gaugeTrack} aria-hidden="true">
          <div style={styles.gaugeMid} />
          <div style={{ ...styles.gaugeFill, left: `${Math.min(gaugePct, 50)}%`, width: `${Math.abs(gaugePct - 50)}%`, background: toneColor(meta?.tone) }} />
          <div style={{ ...styles.gaugeDot, left: `${gaugePct}%`, background: toneColor(meta?.tone) }} />
        </div>
        <div style={styles.gaugeLabels}>
          <span>강한 매도 -1</span>
          <span>관망 0</span>
          <span>강한 매수 +1</span>
        </div>
        {weightRsi != null && (
          <div style={styles.weightNote}>
            가중치 — RSI {Math.round(weightRsi * 100)}% · MACD {Math.round(weightMacd * 100)}%
            {adx != null && (adx >= 25 ? ' (추세 강함 → MACD 비중↑)' : adx < 20 ? ' (횡보 → RSI 비중↑)' : '')}
          </div>
        )}
        {(strongTrendConflict || strongTrendConflictDown) && (
          <div style={styles.conflictNote}>
            ⚠ 추세 강도(ADX {formatDecimal1(adx)})가 높은 상태에서 반대 방향 신호입니다 — 추세 반전보다는 일시적
            되돌림일 가능성을 함께 고려하세요.
          </div>
        )}
      </div>

      <div style={styles.row}>
        <Tile
          label="현재가"
          value={formatPrice(last, currency)}
          sub={
            change != null ? (
              <span style={{ color: changeUp ? 'var(--status-good)' : 'var(--status-critical)' }} className="mono-num">
                {changeUp ? '▲' : '▼'} {formatPercentAbs(change)}
              </span>
            ) : null
          }
        />
        <Tile label="RSI (14)" value={formatDecimal1(rsi)} sub={rsi != null ? (rsi >= 70 ? '과매수' : rsi <= 30 ? '과매도' : '중립') : null} />
        <Tile
          label="MACD 히스토그램"
          value={formatDecimal2(histogram)}
          sub={histogram != null ? (histogram >= 0 ? '상승 모멘텀' : '하락 모멘텀') : null}
        />
        <Tile
          label="추세 (ADX 14)"
          value={adx != null ? formatDecimal1(adx) : '—'}
          sub={
            trendMeta ? (
              <span style={{ color: toneColor(trendMeta.tone) }}>
                {trendMeta.text} · {adx != null ? (adx >= 25 ? '강함' : adx < 20 ? '약함' : '보통') : '—'}
              </span>
            ) : (
              '데이터 부족 (50일+)'
            )
          }
        />
        <Tile
          label="거래량 확인"
          value={relVolume != null ? `${formatDecimal2(relVolume)}x` : '—'}
          sub={
            volumeConfirmed == null ? (
              relVolume != null ? '관망 구간' : '데이터 없음'
            ) : (
              <span style={{ color: volumeConfirmed ? 'var(--status-good)' : 'var(--status-warning)' }}>
                {volumeConfirmed ? '평균 대비 거래량 뒷받침' : '거래량 뒷받침 약함'}
              </span>
            )
          }
        />
      </div>
    </div>
  );
}

function clip(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function Tile({ label, value, sub }) {
  return (
    <div style={styles.tile}>
      <div style={styles.label}>{label}</div>
      <div style={styles.value} className="mono-num">
        {value}
      </div>
      {sub != null && <div style={styles.sub}>{sub}</div>}
    </div>
  );
}

function toneColor(tone) {
  if (tone === 'good') return 'var(--status-good)';
  if (tone === 'critical') return 'var(--status-critical)';
  if (tone === 'warning') return 'var(--status-warning)';
  return 'var(--text-primary)';
}

const styles = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 12 },
  hero: {
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '16px 18px',
  },
  heroTone: (tone) => ({
    background:
      tone === 'good' ? 'var(--status-good-bg)' : tone === 'critical' ? 'var(--status-critical-bg)' : tone === 'warning' ? 'var(--status-warning-bg)' : 'var(--surface-card)',
  }),
  heroTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 8 },
  heroValue: { fontSize: 28, fontWeight: 800, lineHeight: 1.15 },
  heroScore: { fontSize: 20, fontWeight: 700, color: 'var(--text-secondary)' },
  gaugeTrack: {
    position: 'relative',
    height: 6,
    borderRadius: 3,
    background: 'var(--gridline)',
    marginTop: 14,
  },
  gaugeMid: {
    position: 'absolute',
    left: '50%',
    top: -3,
    width: 1,
    height: 12,
    background: 'var(--baseline)',
  },
  gaugeFill: { position: 'absolute', top: 0, height: 6, borderRadius: 3, opacity: 0.55 },
  gaugeDot: {
    position: 'absolute',
    top: -3,
    width: 12,
    height: 12,
    borderRadius: '50%',
    transform: 'translateX(-50%)',
    border: '2px solid var(--surface-page)',
  },
  gaugeLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 10.5,
    color: 'var(--text-muted)',
    marginTop: 6,
  },
  weightNote: { fontSize: 11.5, color: 'var(--text-muted)', marginTop: 10 },
  conflictNote: {
    fontSize: 11.5,
    color: 'var(--status-warning)',
    marginTop: 8,
    paddingTop: 8,
    borderTop: '1px solid var(--gridline)',
  },
  row: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 1, background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' },
  tile: {
    background: 'var(--surface-card)',
    padding: '12px 14px',
  },
  label: { fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6, letterSpacing: 0.2, textTransform: 'uppercase' },
  value: { fontSize: 19, fontWeight: 700, color: 'var(--text-primary)' },
  sub: { fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 4 },
};
