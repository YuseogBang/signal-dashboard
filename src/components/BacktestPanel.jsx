import { ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Legend } from 'recharts';
import { formatPercentSigned, formatPercentAbs } from '../utils/format';

export default function BacktestPanel({ backtest, config, period, onPeriodChange, onConfigChange }) {
  const { curve, stats } = backtest;
  const chartData = curve.map((c) => ({
    date: c.date,
    strategyPct: (c.strategy - 1) * 100,
    buyHoldPct: (c.buyHold - 1) * 100,
  }));

  return (
    <section aria-labelledby="backtest-heading">
      <h2 id="backtest-heading" style={styles.h2}>
        시그널 백테스트 (참고용)
      </h2>
      <p style={styles.disclaimer}>
        이 앱이 산출한 시그널대로 매수(BUY/STRONG_BUY 진입 → SELL/STRONG_SELL 청산)했다고 가정한 단순 시뮬레이션입니다.
        아래 거래비용·슬리피지 입력값을 반영한 과거 데이터 기준 결과입니다. 유동성·분할매매·과최적화·생존 편향은
        반영하지 않았으며, 미래 수익을 보장하지 않습니다. 투자 자문이 아닙니다.
      </p>

      <div style={styles.configRow} aria-label="백테스트 설정">
        <label style={styles.configLabel}>분석 기간<select className="ctrl" value={period} onChange={(e) => onPeriodChange(Number(e.target.value))}><option value="0">전체 기간</option><option value="60">최근 60봉</option><option value="120">최근 120봉</option><option value="200">최근 200봉</option></select></label>
        <label style={styles.configLabel}>거래비용(편도 %)<input className="ctrl" type="number" min="0" max="5" step="0.01" value={(config.transactionCost * 100).toFixed(2)} onChange={(e) => onConfigChange({ ...config, transactionCost: Math.max(0, Number(e.target.value) || 0) / 100 })} /></label>
        <label style={styles.configLabel}>슬리피지(편도 %)<input className="ctrl" type="number" min="0" max="5" step="0.01" value={(config.slippage * 100).toFixed(2)} onChange={(e) => onConfigChange({ ...config, slippage: Math.max(0, Number(e.target.value) || 0) / 100 })} /></label>
        <span style={styles.configHint}>매수·매도 체결마다 적용 · 기본값 0%</span>
      </div>

      <div style={styles.statRow}>
        <Stat label="전략 누적수익률" value={formatPercentSigned(stats.totalReturn)} tone={tone(stats.totalReturn)} />
        <Stat label="단순 보유 수익률" value={formatPercentSigned(stats.buyHoldReturn)} tone={tone(stats.buyHoldReturn)} />
        <Stat label="최대 낙폭 (MDD)" value={formatPercentSigned(stats.maxDrawdown)} tone="critical" />
        <Stat label="승률" value={stats.winRate != null ? formatPercentAbs(stats.winRate) : '—'} tone="neutral" />
        <Stat label="거래 횟수" value={String(stats.tradeCount)} tone="neutral" />
      </div>

      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer>
          <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--gridline)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} minTickGap={50} axisLine={{ stroke: 'var(--baseline)' }} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => `${v.toFixed(0)}%`} />
            <ReferenceLine y={0} stroke="var(--baseline)" />
            <Tooltip
              contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--border)', fontSize: 12 }}
              formatter={(v, name) => [`${v.toFixed(1)}%`, name]}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
            <Line type="monotone" dataKey="buyHoldPct" name="단순 보유" stroke="var(--series-price)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="strategyPct" name="시그널 전략" stroke="var(--series-macd)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function tone(v) {
  if (v == null) return 'neutral';
  return v >= 0 ? 'good' : 'critical';
}

function Stat({ label, value, tone }) {
  return (
    <div style={styles.stat}>
      <div style={styles.statLabel}>{label}</div>
      <div style={{ ...styles.statValue, color: toneColor(tone) }} className="mono-num">
        {value}
      </div>
    </div>
  );
}

function toneColor(tone) {
  if (tone === 'good') return 'var(--status-good)';
  if (tone === 'critical') return 'var(--status-critical)';
  return 'var(--text-primary)';
}

const styles = {
  h2: { fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', margin: '0 0 6px' },
  disclaimer: { fontSize: 11.5, color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: 1.5 },
  statRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: 1,
    background: 'var(--border)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 14,
  },
  stat: { background: 'var(--surface-card)', padding: '10px 12px' },
  statLabel: { fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.2 },
  statValue: { fontSize: 16, fontWeight: 700 },
  configRow: { display: 'flex', alignItems: 'flex-end', flexWrap: 'wrap', gap: 10, padding: '10px 12px', marginBottom: 14, border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface-card-alt)' },
  configLabel: { display: 'flex', flexDirection: 'column', gap: 5, fontSize: 10.5, color: 'var(--text-muted)' },
  configLabelInput: {},
  configHint: { fontSize: 10.5, color: 'var(--text-muted)', paddingBottom: 8 },
};
