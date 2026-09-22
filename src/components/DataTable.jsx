import { SIGNAL_META } from '../utils/indicators';
import { formatPrice, formatDecimal1, formatDecimal2 } from '../utils/format';

export default function DataTable({ data, currency }) {
  const rows = [...data].reverse().slice(0, 60); // 최신순, 최대 60행 표시

  return (
    <div style={{ overflowX: 'auto', maxHeight: 420, border: '1px solid var(--border)', borderRadius: 6 }}>
      <table style={styles.table}>
        <caption style={styles.caption}>일별 종가, RSI, MACD 히스토그램 및 종합 시그널 (최신 60거래일)</caption>
        <thead>
          <tr>
            <th style={styles.th} scope="col">날짜</th>
            <th style={styles.th} scope="col">종가</th>
            <th style={styles.th} scope="col">RSI</th>
            <th style={styles.th} scope="col">MACD Hist</th>
            <th style={styles.th} scope="col">시그널</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const meta = r.signalLabel ? SIGNAL_META[r.signalLabel] : null;
            return (
              <tr key={r.date}>
                <th style={{ ...styles.td, fontWeight: 500 }} scope="row">{r.date}</th>
                <td style={{ ...styles.td, ...styles.num }} className="tabular-nums">
                  {formatPrice(r.close, currency)}
                </td>
                <td style={{ ...styles.td, ...styles.num }} className="tabular-nums">{formatDecimal1(r.rsi)}</td>
                <td style={{ ...styles.td, ...styles.num }} className="tabular-nums">{formatDecimal2(r.histogram)}</td>
                <td style={{ ...styles.td, color: toneColor(meta?.tone), fontWeight: 700 }}>{meta ? meta.text : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
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
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  caption: { textAlign: 'left', padding: '8px 12px', fontSize: 11, color: 'var(--text-muted)' },
  th: {
    position: 'sticky',
    top: 0,
    background: 'var(--surface-card)',
    borderBottom: '1px solid var(--border)',
    textAlign: 'left',
    padding: '8px 12px',
    color: 'var(--text-muted)',
    fontSize: 11,
    fontWeight: 700,
  },
  td: { padding: '6px 12px', borderBottom: '1px solid var(--gridline)', color: 'var(--text-primary)', textAlign: 'left' },
  num: { textAlign: 'right' },
};
