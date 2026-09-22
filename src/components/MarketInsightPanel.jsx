import { formatDecimal1, formatDecimal2, formatPrice, formatPercentSigned } from '../utils/format';

export default function MarketInsightPanel({ data, last, prev, currency, symbol, label, sourceType }) {
  const recent = data.slice(-20);
  const averageVolume = recent.length ? recent.reduce((sum, row) => sum + (row.volume ?? 0), 0) / recent.length : null;
  const upVolume = recent.filter((row, i) => i > 0 && row.close >= recent[i - 1].close).reduce((sum, row) => sum + (row.volume ?? 0), 0);
  const downVolume = recent.filter((row, i) => i > 0 && row.close < recent[i - 1].close).reduce((sum, row) => sum + (row.volume ?? 0), 0);
  const breadth = upVolume + downVolume > 0 ? upVolume / (upVolume + downVolume) : null;
  const change = last?.close != null && prev?.close ? last.close / prev.close - 1 : null;
  const dayRange = last?.high != null && last?.low != null ? (last.high - last.low) / last.close : null;

  return (
    <section aria-labelledby="market-insight-heading">
      <div style={styles.header}>
        <div><h2 id="market-insight-heading" style={styles.title}>일봉과 주요 지표</h2><p style={styles.description}>토스증권 종목 화면의 핵심 정보 구조를 분석용 데이터에 맞춰 재구성했습니다.</p></div>
        <span style={styles.source}>{sourceType === 'live' ? '실시간 OHLCV' : '샘플·CSV 분석'}</span>
      </div>

      <div style={styles.sections}>
        <InfoSection title="일봉">
          <Metric label="기준일" value={last?.date ?? '—'} />
          <Metric label="시가" value={formatPrice(last?.open, currency)} />
          <Metric label="고가" value={formatPrice(last?.high, currency)} />
          <Metric label="저가" value={formatPrice(last?.low, currency)} />
          <Metric label="종가" value={formatPrice(last?.close, currency)} tone={change != null && change >= 0 ? 'good' : 'critical'} />
          <Metric label="일중 변동폭" value={formatPercentSigned(dayRange)} />
        </InfoSection>

        <InfoSection title="주요 지표">
          <Metric label="RSI (14)" value={formatDecimal1(last?.rsi)} hint={last?.rsi <= 30 ? '과매도' : last?.rsi >= 70 ? '과매수' : '중립'} />
          <Metric label="MACD 히스토그램" value={formatDecimal2(last?.histogram)} hint={last?.histogram >= 0 ? '상승 모멘텀' : '하락 모멘텀'} />
          <Metric label="ADX (14)" value={formatDecimal1(last?.adx)} hint={last?.adx >= 25 ? '추세 강함' : '추세 약함'} />
          <Metric label="ATR (14)" value={formatPrice(last?.atr, currency)} />
          <Metric label="EMA 20 / 50" value={last?.timing?.emaFast == null ? '—' : `${formatPrice(last.timing.emaFast, currency)} / ${formatPrice(last.timing.emaSlow, currency)}`} />
          <Metric label="볼린저 %B" value={last?.timing?.percentB == null ? '—' : `${(last.timing.percentB * 100).toFixed(1)}%`} />
        </InfoSection>

        <InfoSection title="거래현황">
          <Metric label="당일 거래량" value={formatVolume(last?.volume)} />
          <Metric label="20일 평균 거래량" value={formatVolume(averageVolume)} />
          <Metric label="상대거래량" value={last?.relVolume == null ? '—' : `${last.relVolume.toFixed(2)}x`} tone={last?.volumeConfirmed ? 'good' : 'warning'} />
          <Metric label="상승 거래량 비중" value={breadth == null ? '—' : `${(breadth * 100).toFixed(1)}%`} />
          <Metric label="전일 대비" value={formatPercentSigned(change)} tone={change != null && change >= 0 ? 'good' : 'critical'} />
          <Metric label="최근 20봉 범위" value={last?.timing?.support == null ? '—' : `${formatPrice(last.timing.support, currency)} ~ ${formatPrice(last.timing.resistance, currency)}`} />
        </InfoSection>

        <InfoSection title="종목정보">
          <Metric label="종목" value={label || symbol} />
          <Metric label="코드" value={symbol || '—'} />
          <Metric label="통화" value={currency} />
          <Metric label="분석 데이터" value={`${data.length.toLocaleString('ko-KR')}개 봉`} />
          <Metric label="거래 가능 시간" value={currency === 'KRW' ? '국내 정규장 기준' : '해외시장 기준'} />
          <div style={styles.disclaimer}>PER·PBR·배당수익률·시가총액은 현재 연결된 캔들 API에서 제공하지 않는 값입니다. 미제공 값을 임의로 표시하지 않고, 별도 펀더멘털 API 연결 영역으로 구분했습니다.</div>
        </InfoSection>
      </div>
    </section>
  );
}

function InfoSection({ title, children }) { return <div style={styles.section}><h3 style={styles.sectionTitle}>{title}</h3><div style={styles.grid}>{children}</div></div>; }
function Metric({ label, value, hint, tone }) { return <div style={styles.metric}><span style={styles.label}>{label}</span><strong style={tone ? { color: `var(--status-${tone})` } : {}} className="mono-num">{value}</strong>{hint && <small>{hint}</small>}</div>; }
function formatVolume(value) { if (value == null) return '—'; if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`; if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`; return value.toLocaleString('ko-KR'); }

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  title: { margin: 0, fontSize: 15, color: 'var(--text-primary)' },
  description: { margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' },
  source: { color: 'var(--accent-strong)', background: 'var(--accent-soft)', borderRadius: 999, padding: '5px 9px', fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap' },
  sections: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 },
  section: { border: '1px solid var(--border)', borderRadius: 6, padding: '11px 12px', background: 'var(--surface-card)' },
  sectionTitle: { margin: '0 0 9px', fontSize: 12, color: 'var(--text-secondary)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 },
  metric: { display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 },
  label: { color: 'var(--text-muted)', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  disclaimer: { gridColumn: '1 / -1', color: 'var(--text-muted)', fontSize: 10.5, lineHeight: 1.45, paddingTop: 3 },
};

