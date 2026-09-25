import { useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import useStoredState from '../hooks/useStoredState';
import { comparison, percent } from '../utils/decision';
import { fetchMarketCandles } from '../utils/marketApi';
import { parseCsvFile } from '../utils/csv';
import { getSampleData, SAMPLE_TICKERS } from '../data/sampleData';
import { Card, Field } from './DecisionWorkbench';

const EMPTY = [];

export default function MarketComparison({ visible, rows, symbol, sourceType, currency, onRelative }) {
  const [config, setConfig, storageError] = useStoredState(`comparison:${sourceType}:${symbol}`, { benchmark: null, sector: null });
  const [lookback, setLookback] = useState(20);
  const valid = d => d && d.currency === currency && (sourceType === 'sample' ? d.source === 'sample' : d.source !== 'sample');
  const benchmark = valid(config.benchmark) ? config.benchmark.rows : EMPTY;
  const sector = valid(config.sector) ? config.sector.rows : EMPTY;
  const result = useMemo(() => comparison(rows, benchmark, sector, lookback), [rows, benchmark, sector, lookback]);
  const sectorResult = useMemo(() => sector.length ? comparison(sector, benchmark, [], lookback) : null, [sector, benchmark, lookback]);
  useEffect(() => { onRelative(result?.strength ?? null); }, [result?.strength, onRelative]);
  const dots = result ? [{ name: symbol, x: result.strength * 100, y: result.momentum * 100 }, ...(sectorResult ? [{ name: config.sector.label, x: sectorResult.strength * 100, y: sectorResult.momentum * 100 }] : [])] : [];
  if (!visible) return null;
  return <>
    <Card title="시장·업종 대비 상대강도" hint="같은 날짜·통화 기준 수익률 차이를 비교합니다. ETF 사용 시 시장·업종의 대용치이며 실제 지수와 다를 수 있습니다.">
      <div className="wb-grid">{['benchmark', 'sector'].map(kind => <DatasetInput key={kind} name={kind === 'benchmark' ? '시장 기준 (필수)' : '업종 기준 (선택)'} currency={currency} sourceType={sourceType} value={config[kind]} onChange={v => setConfig({ ...config, [kind]: v })} />)}</div>
      {storageError && <p role="alert">{storageError}</p>}
      <Field label="비교 기간"><select className="ctrl" value={lookback} onChange={e => setLookback(Number(e.target.value))}><option value={20}>20개 공통 거래일</option><option value={60}>60개 공통 거래일</option></select></Field>
      {!result ? <p className="wb-note">시장 기준 데이터를 연결하세요. {lookback + 6}개 이상의 공통 거래일과 현재 종목의 최신 날짜가 필요합니다. 통화 또는 샘플/실제 구분이 다른 데이터는 계산에서 제외합니다.</p> : <>
        <div className="wb-metrics"><div><span>시장 대비 수익률 차이</span><strong>{percent(result.strength)}p</strong></div><div><span>업종 대비 수익률 차이</span><strong>{result.sectorStrength == null ? '미연결' : `${percent(result.sectorStrength)}p`}</strong></div><div><span>최근 5개 공통 거래일 변화</span><strong>{result.label}</strong></div></div>
        <p className="wb-muted">비교 구간 {result.from} ~ {result.to} · 상대강도는 RSI와 다른 값이며 수익률 차이(%p)입니다. 비교 차트는 표시 시작일=100입니다.</p>
        <div className="wb-chart"><ResponsiveContainer width="100%" height={300}><LineChart data={result.curve}><CartesianGrid stroke="var(--gridline)" /><XAxis dataKey="date" minTickGap={45} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} /><YAxis domain={['auto','auto']} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} /><Tooltip contentStyle={{ background:'var(--surface-card)' }} formatter={v => Number(v).toFixed(2)} /><Legend /><Line dataKey="stock" name={symbol} stroke="var(--series-price)" dot={false} isAnimationActive={false} /><Line dataKey="benchmark" name={config.benchmark.label} stroke="var(--accent-strong)" dot={false} isAnimationActive={false} />{sector.length > 0 && <Line dataKey="sector" name={config.sector.label} stroke="var(--status-warning)" dot={false} isAnimationActive={false} />}</LineChart></ResponsiveContainer></div>
        <h3>상대강도 × 개선 속도</h3><p className="wb-muted">오른쪽: 시장보다 강함 / 위쪽: 상대강도 개선 · 우상단 강세 확대, 우하단 강세 둔화, 좌상단 약세 개선, 좌하단 약세 확대</p>
        <div className="wb-chart"><ResponsiveContainer width="100%" height={280}><ScatterChart margin={{ top:20, right:24, bottom:22, left:10 }}><CartesianGrid stroke="var(--gridline)" /><XAxis type="number" dataKey="x" name="시장 대비 수익률 차이" unit="%p" domain={[-Math.max(1,...dots.map(d=>Math.abs(d.x)))*1.25,Math.max(1,...dots.map(d=>Math.abs(d.x)))*1.25]} tick={{ fontSize:10, fill:'var(--text-muted)' }} /><YAxis type="number" dataKey="y" name="5거래일 개선 폭" unit="%p" domain={[-Math.max(1,...dots.map(d=>Math.abs(d.y)))*1.25,Math.max(1,...dots.map(d=>Math.abs(d.y)))*1.25]} tick={{ fontSize:10, fill:'var(--text-muted)' }} /><ReferenceLine x={0} stroke="var(--text-muted)" /><ReferenceLine y={0} stroke="var(--text-muted)" /><Tooltip content={({ active, payload }) => active && payload?.length ? <div className="wb-card">{payload[0].payload.name}<p>강도 {payload[0].payload.x.toFixed(2)}%p / 개선 {payload[0].payload.y.toFixed(2)}%p</p></div> : null} /><Scatter data={dots} fill="var(--accent-strong)" isAnimationActive={false} /></ScatterChart></ResponsiveContainer></div>
        <div className="wb-scroll"><table><thead><tr><th>종목/그룹</th><th>강도</th><th>개선 폭</th></tr></thead><tbody>{dots.map(d => <tr key={d.name}><td>{d.name}</td><td>{d.x.toFixed(2)}%p</td><td>{d.y.toFixed(2)}%p</td></tr>)}</tbody></table></div>
      </>}
    </Card>
  </>;
}
function DatasetInput({ name, currency, sourceType, value, onChange }) {
  const [ticker, setTicker] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const load = async e => {
    e.preventDefault(); setBusy(true); setError('');
    try { const result = await fetchMarketCandles(ticker); if (result.currency !== currency) throw new Error('현재 종목과 같은 통화의 기준을 선택하세요.'); onChange({ label: ticker.toUpperCase(), rows: result.rows, currency: result.currency, source: 'live' }); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return <div>
    <h3>{name}</h3>
    {sourceType === 'sample' ? <Field label={`${name} 데모 종목`}><select className="ctrl" value={value?.label || ''} onChange={e => onChange(e.target.value ? { label:e.target.value, rows:getSampleData(e.target.value), currency, source:'sample' } : null)}><option value="">데모 기준 선택</option>{SAMPLE_TICKERS.filter(t => t.currency === currency).map(t => <option key={t.id} value={t.id}>{t.label} (지수 아님)</option>)}</select></Field> : <>
      <form onSubmit={load}><Field label={`${name} 지수·ETF 코드`}><input className="ctrl" required value={ticker} onChange={e => setTicker(e.target.value)} placeholder={currency === 'USD' ? '예: SPY / SOXX' : '예: 069500 / 091160'} /></Field><button className="ctrl" disabled={busy} type="submit">{busy ? '조회 중…' : `${name} 조회`}</button></form>
      <Field label={`${name} CSV (${currency} 기준)`}><input className="ctrl" type="file" accept=".csv" onChange={async e => { const file = e.target.files?.[0]; if (!file) return; try { const data = await parseCsvFile(file); onChange({ label: file.name, rows:data, currency, source:'upload' }); setError(''); } catch(err) {setError(err.message);} e.target.value=''; }} /></Field>
    </>}
    {value && <p className="wb-muted">{value.label} · {value.source === 'sample' ? '시뮬레이션' : value.source === 'live' ? 'API 조회' : 'CSV'} · {value.rows.at(-1)?.date} 기준 <button className="ctrl" onClick={() => onChange(null)}>해제</button></p>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
