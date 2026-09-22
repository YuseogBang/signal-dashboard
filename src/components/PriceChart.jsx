import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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

export default function PriceChart({ data, currency }) {
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
    };
  });

  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer>
        <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
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
          <Line type="monotone" dataKey="close" name="종가" stroke="var(--series-price)" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
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
    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
  },
  date: { color: 'var(--text-muted)', marginBottom: 4 },
  row: { color: 'var(--text-primary)' },
};
