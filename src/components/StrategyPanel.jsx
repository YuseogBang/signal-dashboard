import { formatPercentAbs, formatPercentSigned } from '../utils/format';

export default function StrategyPanel({ strategies }) {
  return (
    <section aria-labelledby="strategy-heading">
      <h2 id="strategy-heading" style={styles.h2}>전략별 성과 비교</h2>
      <p style={styles.note}>같은 데이터에서 어떤 매매 규칙이 더 안정적이었는지 비교합니다. 과거 결과이며 미래 수익을 보장하지 않습니다.</p>
      <div style={styles.grid}>
        {strategies.map((strategy) => (
          <div key={strategy.name} style={styles.block}>
            <div style={styles.name}>{strategy.name}</div>
            <div style={{ ...styles.return, color: strategy.totalReturn >= 0 ? 'var(--status-good)' : 'var(--status-critical)' }} className="mono-num">{formatPercentSigned(strategy.totalReturn)}</div>
            <div style={styles.meta}>MDD {formatPercentSigned(strategy.maxDrawdown)} · 승률 {strategy.winRate == null ? '—' : formatPercentAbs(strategy.winRate)} · {strategy.tradeCount}회</div>
          </div>
        ))}
      </div>
    </section>
  );
}

const styles = {
  h2: { fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', margin: '0 0 6px' },
  note: { fontSize: 11.5, color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: 1.5 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 1, background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' },
  block: { background: 'var(--surface-card)', padding: '12px 14px' },
  name: { fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700, marginBottom: 8 },
  return: { fontSize: 20, fontWeight: 800 },
  meta: { fontSize: 10.5, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 },
};

