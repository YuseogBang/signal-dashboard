import { SIGNAL_META } from '../utils/indicators';
import { formatPrice, formatPercentAbs, formatDecimal1, formatDecimal2 } from '../utils/format';

export default function StatTiles({ last, prev, currency, rsi, histogram, signalLabel }) {
  const change = last != null && prev != null ? (last - prev) / prev : null;
  const changeUp = change != null && change >= 0;
  const meta = signalLabel ? SIGNAL_META[signalLabel] : null;

  return (
    <div style={styles.row}>
      <Tile
        label="현재가"
        value={formatPrice(last, currency)}
        sub={
          change != null ? (
            <span
              style={{ color: changeUp ? 'var(--status-good)' : 'var(--status-critical)' }}
              className="tabular-nums"
            >
              {changeUp ? '▲' : '▼'} {formatPercentAbs(change)}
            </span>
          ) : null
        }
      />
      <Tile
        label="RSI (14)"
        value={formatDecimal1(rsi)}
        sub={rsi != null ? (rsi >= 70 ? '과매수' : rsi <= 30 ? '과매도' : '중립') : null}
      />
      <Tile
        label="MACD 히스토그램"
        value={formatDecimal2(histogram)}
        sub={histogram != null ? (histogram >= 0 ? '상승 모멘텀' : '하락 모멘텀') : null}
      />
      <div style={{ ...styles.tile, ...styles.signalTile(meta?.tone) }}>
        <div style={styles.label}>종합 시그널</div>
        <div style={{ ...styles.signalValue, color: toneColor(meta?.tone) }}>{meta ? meta.text : '—'}</div>
      </div>
    </div>
  );
}

function Tile({ label, value, sub }) {
  return (
    <div style={styles.tile}>
      <div style={styles.label}>{label}</div>
      <div style={styles.value} className="tabular-nums">
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
  row: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 },
  tile: {
    background: 'var(--surface-card)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: '14px 16px',
  },
  signalTile: (tone) => ({
    background:
      tone === 'good'
        ? 'var(--status-good-bg)'
        : tone === 'critical'
        ? 'var(--status-critical-bg)'
        : tone === 'warning'
        ? 'var(--status-warning-bg)'
        : 'var(--surface-card)',
  }),
  label: { fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 },
  value: { fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' },
  signalValue: { fontSize: 20, fontWeight: 800 },
  sub: { fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 },
};
