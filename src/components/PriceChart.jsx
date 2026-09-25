import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { SIGNAL_META } from '../utils/indicators';
import { formatPrice, formatPriceCompact } from '../utils/format';

function CustomTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  return (
    <div style={ttStyles.box}>
      <div style={ttStyles.date}>{label}</div>
      <div style={ttStyles.row}>
        종가: <b className="tabular-nums">{formatPrice(row.close, currency)}</b>
      </div>
      {row.signalLabel && (
        <div style={{ ...ttStyles.row, color: toneColor(SIGNAL_META[row.signalLabel]?.tone) }}>
          {SIGNAL_META[row.signalLabel]?.text}
        </div>
      )}
    </div>
  );
}

function toneColor(tone) {
  if (tone === 'good') return 'var(--status-good)';
  if (tone === 'critical') return 'var(--status-critical)';
  return 'var(--text-primary)';
}

function signalGroup(label) {
  if (label === 'BUY' || label === 'STRONG_BUY') return 'BUY';
  if (label === 'SELL' || label === 'STRONG_SELL') return 'SELL';
  return 'OTHER';
}

export default function PriceChart({ data, currency, last }) {
  // 모든 시리즈가 같은 배열/카테고리 축을 공유하도록 buy/sell 마커 값을
  // 별도 data 배열이 아니라 같은 행에 필드로 얹는다 (recharts가 계열마다
  // 다른 data 배열을 받으면 카테고리 축 정렬이 어긋나는 문제를 피하기 위함).
  //
  // 마커는 조건이 유지되는 모든 날이 아니라 "상태가 전환된 시점"에만 찍는다 —
  // 매일 찍으면 추세 구간에서 마커가 겹쳐 잡음처럼 보이고, 실제 매매 관점에서도
  // 의미 있는 지점은 전환 시점 하나뿐이기 때문이다.
  const chartData = data.map((d, i) => {
    const group = signalGroup(d.signalLabel);
    const prevGroup = i > 0 ? signalGroup(data[i - 1].signalLabel) : null;
    return {
      ...d,
      buyY: group === 'BUY' && prevGroup !== 'BUY' ? d.close : null,
      sellY: group === 'SELL' && prevGroup !== 'SELL' ? d.close : null,
      ema20: d.timing?.emaFast,
      ema50: d.timing?.emaSlow,
    };
  });
  const rising = data.length > 1 ? data.at(-1).close >= data.at(-2).close : true;

  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer>
        <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={rising ? '#10b981' : '#3b82f6'} stopOpacity={0.42} />
              <stop offset="100%" stopColor={rising ? '#0f766e' : '#1e3a8a'} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--gridline)" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} minTickGap={40} axisLine={{ stroke: 'var(--baseline)' }} tickLine={false} />
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
            axisLine={false}
            tickLine={false}
            width={64}
            tickFormatter={(v) => formatPriceCompact(v, currency)}
          />
          <Tooltip content={<CustomTooltip currency={currency} />} />
          <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
          <Area type="monotone" dataKey="close" name="가격 영역" legendType="none" stroke="none" fill="url(#priceGradient)" isAnimationActive={false} />
          <Line type="monotone" dataKey="close" name="종가" stroke="var(--series-price)" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
          <Line type="monotone" dataKey="ema20" name="EMA 20" stroke="var(--accent-strong)" strokeWidth={1.2} dot={false} isAnimationActive={false} connectNulls />
          <Line type="monotone" dataKey="ema50" name="EMA 50" stroke="var(--status-warning)" strokeWidth={1.2} dot={false} isAnimationActive={false} connectNulls />
          {last?.timing?.support != null && <ReferenceLine y={last.timing.support} stroke="var(--status-good)" strokeDasharray="4 4" label={{ value: '지지', fill: 'var(--status-good)', fontSize: 10 }} />}
          {last?.timing?.resistance != null && <ReferenceLine y={last.timing.resistance} stroke="var(--status-critical)" strokeDasharray="4 4" label={{ value: '저항', fill: 'var(--status-critical)', fontSize: 10 }} />}
          <Scatter dataKey="buyY" name="매수 시그널" fill="var(--status-good)" shape="triangle" isAnimationActive={false} />
          <Scatter dataKey="sellY" name="매도 시그널" fill="var(--status-critical)" shape="triangle" isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

const ttStyles = {
  box: {
    background: 'var(--surface-card)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 12,
    boxShadow: '0 4px 12px rgba(35,52,66,0.10)',
  },
  date: { color: 'var(--text-muted)', marginBottom: 4 },
  row: { color: 'var(--text-primary)' },
};
