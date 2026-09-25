import { useEffect, useState } from 'react';
import { getTickerMeta } from '../data/sampleData';
import { fetchKisPositioning } from '../utils/kisPositioning';

function asRows(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return [value];
  return [];
}

function numericValue(rows, patterns) {
  for (const row of asRows(rows)) {
    for (const [key, value] of Object.entries(row || {})) {
      if (patterns.some((pattern) => pattern.test(key))) {
        const number = Number(String(value).replaceAll(',', ''));
        if (Number.isFinite(number)) return number;
      }
    }
  }
  return null;
}

function clamp(value, min, max) { return Math.min(Math.max(value, min), max); }

function firstRow(value) { return Array.isArray(value) ? value[0] || {} : value && typeof value === 'object' ? value : {}; }

export default function PositioningPanel({ symbol, data, sourceType }) {
  const meta = getTickerMeta(symbol);
  const [positioning, setPositioning] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isDomestic = /^\d{6}$/.test(symbol || '');

  useEffect(() => {
    if (sourceType !== 'live' || !isDomestic) {
      setPositioning(null);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchKisPositioning(symbol)
      .then((payload) => { if (!cancelled) setPositioning(payload); })
      .catch((reason) => { if (!cancelled) setError(reason.message || '시장 포지셔닝을 조회하지 못했습니다.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [symbol, sourceType, isDomestic]);

  const etfMatches = positioning?.etfs?.flatMap((etf) => etf.matches || []) || [];
  const connectedEtfs = positioning?.etfs?.filter((etf) => !etf.error) || [];
  const totalWeight = etfMatches.reduce((sum, match) => sum + (Number(match.weight) || 0), 0);
  const futureChange = numericValue(positioning?.futures, [/prdy.*ctrt/i, /change.*rate/i, /rate/i]);
  const putCall = numericValue(positioning?.options, [/put.*call/i, /pcr/i, /putcall/i]);
  const future = firstRow(positioning?.futures);
  const askQty = Number(future.total_askp_rsqn) || 0;
  const bidQty = Number(future.total_bidp_rsqn) || 0;
  const orderImbalance = askQty + bidQty ? (bidQty - askQty) / (bidQty + askQty) : null;
  const directionalSignals = [
    futureChange == null ? null : clamp(futureChange / 3, -1, 1),
    putCall == null ? null : clamp((1 - putCall) / 1.5, -1, 1),
    orderImbalance == null ? null : clamp(orderImbalance * 2, -1, 1),
  ].filter((value) => value != null);
  const impactScore = directionalSignals.length ? directionalSignals.reduce((sum, value) => sum + value, 0) / directionalSignals.length : null;
  const impact = [];
  if (etfMatches.length) impact.push({ tone: 'good', text: `편입 ${etfMatches.length}개 · 노출 ${totalWeight ? `${totalWeight.toFixed(2)}%` : '비중 확인 중'}` });
  if (futureChange != null) impact.push({ tone: futureChange >= 0 ? 'good' : 'critical', text: `선물 등락 ${futureChange >= 0 ? '상승' : '하락'} 방향` });
  if (putCall != null) impact.push({ tone: putCall > 1 ? 'critical' : 'good', text: `풋콜 비율 ${putCall > 1 ? '하락 방어 우위' : '콜 우위'}` });
  if (!impact.length) impact.push({ tone: 'muted', text: 'API 응답 항목을 수신하면 영향 방향을 계산합니다.' });

  const return5 = data.length > 5 ? data.at(-1).close / data.at(-6).close - 1 : null;
  const proxyTone = return5 == null ? '데이터 대기' : return5 >= 0 ? '최근 가격 상승' : '최근 가격 하락';

  return (
    <section aria-labelledby="positioning-heading">
      <div style={styles.header}>
        <div><h2 id="positioning-heading" style={styles.title}>시장 포지셔닝과 주가 영향</h2><p style={styles.description}>{meta.name} 주변의 ETF 편입과 선물·옵션 데이터를 모아 가격에 작용할 수 있는 방향을 추정합니다.</p></div>
        <span style={styles.badge}>{loading ? '시장 데이터 조회 중…' : positioning ? 'KIS REST · 최신 조회' : '연결 대기'}</span>
      </div>

      {error && <div style={styles.error} role="alert">{error}</div>}
      <div style={styles.impactBar}>
        <div><span style={styles.eyebrow}>시장 포지셔닝 영향 추정</span><strong style={styles.impactTitle}>{impactScore == null ? '판단 자료 수집 중' : impactScore >= 0.15 ? '상승 우호 요인 확인' : impactScore <= -0.15 ? '하락 압력·주의' : '방향성 중립'}</strong></div>
        <div style={styles.impactList}>{impact.map((item) => <span key={item.text} style={{ ...styles.impactChip, color: `var(--status-${item.tone})` }}>{item.text}</span>)}</div>
      </div>

      <div className="visualGrid" style={styles.visualGrid}>
        <Visual title="영향 방향" subtitle="선물·옵션·호가 기반" >
          <DivergingBar value={impactScore} />
          <div style={styles.scale}><span>하락 압력</span><strong>{impactScore == null ? '데이터 미수신' : `${impactScore > 0 ? '+' : ''}${impactScore.toFixed(2)}`}</strong><span>상승 우호</span></div>
        </Visual>
        <Visual title="ETF 노출 강도" subtitle="편입 비중 합산" >
          <ExposureBar value={totalWeight ? clamp(totalWeight / 30, 0, 1) : null} />
          <div style={styles.scale}><span>낮음</span><strong>{totalWeight ? `${totalWeight.toFixed(2)}%` : '데이터 미수신'}</strong><span>높음</span></div>
        </Visual>
        <Visual title="호가 균형" subtitle="선물 총 잔량" >
          <DivergingBar value={orderImbalance} />
          <div style={styles.scale}><span>매도 우위</span><strong>{orderImbalance == null ? '데이터 미수신' : `${orderImbalance > 0 ? '+' : ''}${(orderImbalance * 100).toFixed(1)}%`}</strong><span>매수 우위</span></div>
        </Visual>
      </div>

      <div style={styles.grid}>
        <Block title="ETF 편입 현황" accent="good" badge={positioning ? '실시간 조회' : 'API 연결 대기'}>
          {positioning ? <><div style={styles.big}>{connectedEtfs.length}개 ETF 확인</div><div style={styles.list}>{connectedEtfs.map((etf) => <span key={etf.etfCode}>{etf.etfCode} · {etf.matches?.length ? `${etf.matches[0].weight ? `${etf.matches[0].weight}%` : '편입 확인'}` : '미확인'}</span>)}</div><small>{etfMatches.length ? `편입 확인 ETF의 비중 합계 ${totalWeight ? `${totalWeight.toFixed(2)}%` : 'API 응답 필드 확인 중'}를 노출 요인으로 반영했습니다.` : '현재 응답에서 해당 종목의 편입을 확인하지 못했습니다.'}</small></> : <Pending code="ETF 구성종목시세" />}
        </Block>
        <Block title="선물 포지션" accent="critical" badge={positioning?.futures?.error ? '조회 실패' : positioning ? '실시간 조회' : 'API 연결 대기'}>
          {positioning?.futures?.error ? <small>{positioning.futures.error}</small> : positioning ? <><div style={styles.big}>KOSPI 선물 보드</div><Metric label="등락률" value={futureChange == null ? '응답 필드 확인 중' : `${futureChange.toFixed(2)}%`} tone={futureChange >= 0 ? 'good' : 'critical'} /><small>선물 강도와 현물 추세를 함께 보며 방향성 영향을 추정합니다.</small></> : <Pending code="선물옵션 시세호가" />}
        </Block>
        <Block title="옵션 포지션" accent="warning" badge={positioning?.options?.error ? '조회 실패' : positioning ? '실시간 조회' : 'API 연결 대기'}>
          {positioning?.options?.error ? <small>{positioning.options.error}</small> : positioning ? <><div style={styles.big}>콜·풋 전광판</div><Metric label="풋콜 비율" value={putCall == null ? '응답 필드 확인 중' : putCall.toFixed(2)} tone={putCall > 1 ? 'critical' : 'good'} /><small>풋콜 비율·행사가별 OI·변동성은 API 응답 범위에서만 표시합니다.</small></> : <Pending code="국내옵션전광판_콜풋" />}
        </Block>
      </div>
      <div style={styles.footer}><strong>{proxyTone}</strong><span>포지셔닝 수치는 주가와의 인과관계가 아닌, 동시점 시장 노출을 기반으로 한 참고용 영향 추정입니다.</span>{positioning?.updatedAt && <time dateTime={positioning.updatedAt}>조회 {new Date(positioning.updatedAt).toLocaleTimeString('ko-KR')}</time>}</div>
    </section>
  );
}

function Pending({ code }) { return <><div style={styles.big}>연결 대기</div><small>{code} API 연결 후 임의 데이터 없이 표시됩니다.</small></>; }
function Block({ title, accent, badge, children }) { return <div style={{ ...styles.block, borderTopColor: `var(--status-${accent})` }}><div style={styles.blockHeader}><h3 style={styles.blockTitle}>{title}</h3><span style={styles.miniBadge}>{badge}</span></div>{children}</div>; }
function Metric({ label, value, tone }) { return <div style={styles.metric}><span>{label}</span><strong style={tone ? { color: `var(--status-${tone})` } : {}} className="mono-num">{value}</strong></div>; }
function Visual({ title, subtitle, children }) { return <div style={styles.visual}><div style={styles.visualHeader}><strong>{title}</strong><span>{subtitle}</span></div>{children}</div>; }
function DivergingBar({ value }) { const width = value == null ? 0 : Math.round(Math.abs(value) * 50); const left = value != null && value < 0 ? 50 - width : 50; return <div style={styles.diverging}><div style={styles.centerLine} /><div style={{ ...styles.divergingFill, left: `${left}%`, width: `${width}%`, background: value >= 0 ? 'var(--status-good)' : 'var(--status-critical)' }} /></div>; }
function ExposureBar({ value }) { return <div style={styles.exposure}><div style={{ ...styles.exposureFill, width: value == null ? 0 : `${Math.round(value * 100)}%` }} /></div>; }

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  title: { margin: 0, fontSize: 15, color: 'var(--text-primary)' },
  description: { margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' },
  badge: { color: 'var(--accent-strong)', background: 'var(--accent-soft)', borderRadius: 999, padding: '5px 9px', fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap' },
  impactBar: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', padding: 14, marginBottom: 10, borderRadius: 12, background: 'linear-gradient(110deg, var(--accent-soft), var(--surface-card-alt))', border: '1px solid var(--border)' },
  eyebrow: { display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 },
  impactTitle: { display: 'block', fontSize: 16, color: 'var(--text-primary)' },
  impactList: { display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 6 },
  impactChip: { padding: '5px 8px', borderRadius: 999, background: 'var(--surface-card)', border: '1px solid var(--border)', fontSize: 10.5, fontWeight: 700 },
  visualGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginBottom: 10 },
  visual: { padding: '12px 14px', background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 12 },
  visualHeader: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline', marginBottom: 16, fontSize: 11, color: 'var(--text-primary)' },
  visualHeaderSpan: { color: 'var(--text-muted)' },
  diverging: { position: 'relative', height: 10, borderRadius: 99, background: 'var(--gridline)', overflow: 'hidden' },
  centerLine: { position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'var(--text-muted)', zIndex: 1 },
  divergingFill: { position: 'absolute', top: 0, height: '100%', borderRadius: 99 },
  exposure: { height: 10, borderRadius: 99, background: 'var(--gridline)', overflow: 'hidden' },
  exposureFill: { height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, var(--accent), var(--status-good))' },
  scale: { display: 'flex', justifyContent: 'space-between', gap: 6, marginTop: 8, fontSize: 9.5, color: 'var(--text-muted)' },
  error: { padding: 10, marginBottom: 10, color: 'var(--status-critical)', background: 'var(--status-critical-soft)', borderRadius: 10, fontSize: 11 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 },
  block: { background: 'var(--surface-card-alt)', border: '1px solid var(--border)', borderTop: '3px solid', borderRadius: 12, padding: '13px 14px', minHeight: 150 },
  blockHeader: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 10 },
  blockTitle: { margin: 0, fontSize: 12, color: 'var(--text-secondary)' },
  miniBadge: { fontSize: 9, color: 'var(--text-muted)', background: 'var(--surface-card)', borderRadius: 999, padding: '3px 6px' },
  big: { fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10 },
  list: { display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 },
  metric: { display: 'flex', justifyContent: 'space-between', gap: 8, padding: '5px 0', borderTop: '1px solid var(--gridline)', fontSize: 11, color: 'var(--text-muted)' },
  footer: { display: 'flex', gap: 10, alignItems: 'baseline', marginTop: 12, fontSize: 11, color: 'var(--text-muted)' },
};
