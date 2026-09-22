import { getTickerMeta } from '../data/sampleData';
import { formatPercentSigned } from '../utils/format';

const POSITIONING = {
  '005930': { etfs: ['KODEX 200', 'TIGER 200', 'KODEX 반도체'], future: 'KOSPI200 선물', option: 'KOSPI200 옵션' },
  '000660': { etfs: ['KODEX 반도체', 'TIGER Fn반도체TOP10', 'KODEX 200'], future: 'KOSPI200 선물', option: 'KOSPI200 옵션' },
  '042700': { etfs: ['KODEX 반도체', 'TIGER Fn반도체TOP10'], future: 'KOSPI200 선물', option: 'KOSPI200 옵션' },
  NVDA: { etfs: ['SOXX', 'SMH', 'QQQ'], future: 'NASDAQ100 선물', option: 'NASDAQ 옵션' },
  AMD: { etfs: ['SOXX', 'SMH', 'QQQ'], future: 'NASDAQ100 선물', option: 'NASDAQ 옵션' },
};

export default function PositioningPanel({ symbol, data, last, peerData = {}, sourceType }) {
  const meta = getTickerMeta(symbol);
  const config = POSITIONING[symbol?.toUpperCase()] ?? { etfs: ['종목별 ETF 조회 대기'], future: '시장 선물 연결 대기', option: '시장 옵션 연결 대기' };
  const closes = data.map((row) => row.close).filter(Number.isFinite);
  const return5 = closes.length > 5 ? closes.at(-1) / closes.at(-6) - 1 : null;
  const return20 = closes.length > 20 ? closes.at(-1) / closes.at(-21) - 1 : null;
  const peerCount = Object.keys(peerData).length;
  const proxyTone = return5 == null ? '데이터 대기' : return5 >= 0 ? '상승 모멘텀' : '하락 모멘텀';

  return (
    <section aria-labelledby="positioning-heading">
      <div style={styles.header}><div><h2 id="positioning-heading" style={styles.title}>시장 포지셔닝</h2><p style={styles.description}>{meta.name}를 둘러싼 ETF·선물·옵션 노출을 한눈에 확인합니다.</p></div><span style={styles.badge}>{sourceType === 'live' ? '실시간 가격 + 파생 데이터 연결 영역' : '분석 구조 미리보기'}</span></div>
      <div style={styles.grid}>
        <Block title="ETF 편입 현황" accent="good">
          <div style={styles.big}>{config.etfs.length}개 그룹</div>
          <div style={styles.list}>{config.etfs.map((name) => <span key={name}>{name}</span>)}</div>
          <small>편입 비중·순자산·자금 유입은 ETF holdings API 연결 후 실시간 표시</small>
        </Block>
        <Block title="선물 포지션" accent="critical">
          <div style={styles.big}>{config.future}</div>
          <Metric label="현물 5봉 모멘텀" value={formatPercentSigned(return5)} tone={return5 >= 0 ? 'good' : 'critical'} />
          <Metric label="현물 20봉 모멘텀" value={formatPercentSigned(return20)} tone={return20 >= 0 ? 'good' : 'critical'} />
          <small>베이시스·미결제약정·외국인 포지션은 선물 API 연결 대기</small>
        </Block>
        <Block title="옵션 포지션" accent="warning">
          <div style={styles.big}>{config.option}</div>
          <Metric label="ATR 변동성 프록시" value={last?.atr && last.close ? `${(last.atr / last.close * 100).toFixed(2)}%` : '—'} />
          <Metric label="현재 데이터 피어 수" value={`${peerCount}개`} />
          <small>풋콜 비율·행사가별 OI·내재변동성은 옵션 API 연결 후 실시간 표시</small>
        </Block>
      </div>
      <div style={styles.footer}><strong>{proxyTone}</strong><span>현재 연결 범위에서는 실제 가격과 ATR을 프록시로 사용하며, 파생상품 수치를 임의로 생성하지 않습니다.</span></div>
    </section>
  );
}

function Block({ title, accent, children }) { return <div style={{ ...styles.block, borderTopColor: `var(--status-${accent})` }}><h3 style={styles.blockTitle}>{title}</h3>{children}</div>; }
function Metric({ label, value, tone }) { return <div style={styles.metric}><span>{label}</span><strong style={tone ? { color: `var(--status-${tone})` } : {}} className="mono-num">{value}</strong></div>; }

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  title: { margin: 0, fontSize: 15, color: 'var(--text-primary)' },
  description: { margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' },
  badge: { color: 'var(--accent-strong)', background: 'var(--accent-soft)', borderRadius: 999, padding: '5px 9px', fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 },
  block: { background: 'var(--surface-card-alt)', border: '1px solid var(--border)', borderTop: '3px solid', borderRadius: 12, padding: '13px 14px', minHeight: 150 },
  blockTitle: { margin: '0 0 10px', fontSize: 12, color: 'var(--text-secondary)' },
  big: { fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10 },
  list: { display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 },
  listItem: { fontSize: 11 },
  metric: { display: 'flex', justifyContent: 'space-between', gap: 8, padding: '5px 0', borderTop: '1px solid var(--gridline)', fontSize: 11, color: 'var(--text-muted)' },
  footer: { display: 'flex', gap: 10, alignItems: 'baseline', marginTop: 12, fontSize: 11, color: 'var(--text-muted)' },
};

