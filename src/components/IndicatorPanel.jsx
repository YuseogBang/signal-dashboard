import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
} from 'recharts';
import TermTooltip from './TermTooltip';

export default function IndicatorPanel({ data }) {
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <section aria-labelledby="rsi-heading">
        <h2 id="rsi-heading" style={styles.h3}><TermTooltip term="RSI">RSI (14)</TermTooltip></h2>
        <div style={{ width: '100%', height: 140 }}>
          <ResponsiveContainer>
            <ComposedChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--gridline)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} minTickGap={50} axisLine={{ stroke: 'var(--baseline)' }} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={32} ticks={[0, 30, 50, 70, 100]} />
              <ReferenceLine y={70} stroke="var(--status-critical)" strokeDasharray="4 4" />
              <ReferenceLine y={30} stroke="var(--status-good)" strokeDasharray="4 4" />
              <Tooltip
                contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--border)', fontSize: 12 }}
                formatter={(v) => [Number(v).toFixed(1), 'RSI']}
              />
              <Line type="monotone" dataKey="rsi" stroke="var(--series-price)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section aria-labelledby="macd-heading">
        <h2 id="macd-heading" style={styles.h3}><TermTooltip term="MACD">MACD (12, 26, 9)</TermTooltip></h2>
        <div style={{ width: '100%', height: 160 }}>
          <ResponsiveContainer>
            <ComposedChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--gridline)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} minTickGap={50} axisLine={{ stroke: 'var(--baseline)' }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={40} />
              <ReferenceLine y={0} stroke="var(--baseline)" />
              <Tooltip contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--border)', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
              <Bar dataKey="histogram" name="히스토그램" fill="var(--text-muted)" opacity={0.5} isAnimationActive={false} />
              <Line type="monotone" dataKey="macdLine" name="MACD" stroke="var(--series-macd)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="signalLine" name="Signal" stroke="var(--series-signal-line)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

const styles = {
  h3: { fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', margin: '0 0 6px' },
};
