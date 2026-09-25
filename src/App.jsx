import { useEffect, useMemo, useState } from 'react';
import ControlPanel from './components/ControlPanel';
import StatTiles from './components/StatTiles';
import PriceChart from './components/PriceChart';
import IndicatorPanel from './components/IndicatorPanel';
import DataTable from './components/DataTable';
import RiskPanel from './components/RiskPanel';
import BacktestPanel from './components/BacktestPanel';
import TimingPanel from './components/TimingPanel';
import { getSampleData, getTickerMeta, SAMPLE_TICKERS } from './data/sampleData';
import { compareStrategies, compositeSignal, runBacktest } from './utils/indicators';
import { parseCsvFile } from './utils/csv';
import { fetchKisCandles } from './utils/kisApi';
import StrategyPanel from './components/StrategyPanel';
import DashboardTabs from './components/DashboardTabs';
import DecisionSummary from './components/DecisionSummary';
import MarketInsightPanel from './components/MarketInsightPanel';
import PeerGroupPanel from './components/PeerGroupPanel';
import PositioningPanel from './components/PositioningPanel';
import { PEER_GROUPS } from './components/PeerGroupPanel';
import MethodologyPanel from './components/MethodologyPanel';
import DecisionWorkbench from './components/DecisionWorkbench';

const DEFAULT_TICKER = SAMPLE_TICKERS[0].id;
const DEFAULT_LIVE_SYMBOL = '005930';

export default function App() {
  const [theme, setTheme] = useState(() => window.localStorage.getItem('signal-dashboard-theme') || 'light');
  const [source, setSource] = useState({ type: 'sample', id: DEFAULT_TICKER });
  const [rawData, setRawData] = useState(() => getSampleData(DEFAULT_TICKER));
  const [uploadedName, setUploadedName] = useState('');
  const [liveCurrency, setLiveCurrency] = useState('KRW');
  const [liveLoading, setLiveLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTable, setShowTable] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [peerData, setPeerData] = useState({});
  const [peerLoading, setPeerLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('signal');
  const [backtestConfig, setBacktestConfig] = useState({ transactionCost: 0, slippage: 0 });
  const [backtestWindow, setBacktestWindow] = useState(0);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('signal-dashboard-theme', theme);
  }, [theme]);

  const currency = useMemo(() => {
    if (source.type === 'sample') {
      return SAMPLE_TICKERS.find((t) => t.id === source.id)?.currency ?? 'KRW';
    }
    if (source.type === 'live') return liveCurrency;
    return 'KRW';
  }, [source, liveCurrency]);

  const label = useMemo(() => {
    if (source.type === 'sample') return SAMPLE_TICKERS.find((t) => t.id === source.id)?.label ?? '';
    if (source.type === 'live') return `${getTickerMeta(source.id).name} · ${source.id} (실시간)`;
    return uploadedName || '업로드된 데이터';
  }, [source, uploadedName]);

  function handleSelectSample(id) {
    setError('');
    setPeerData({});
    setSource({ type: 'sample', id });
    setRawData(getSampleData(id));
  }

  async function handleUpload(file) {
    setError('');
    setPeerData({});
    try {
      const rows = await parseCsvFile(file);
      setRawData(rows);
      setUploadedName(file.name);
      setSource({ type: 'upload', id: file.name });
    } catch (e) {
      setError(e.message || '파일을 처리하지 못했습니다.');
    }
  }

  async function handleLiveLookup(symbol, { fallbackToSample = false } = {}) {
    setError('');
    setLiveLoading(true);
    try {
      const { rows, currency: cur } = await fetchKisCandles(symbol, { count: 200 });
      setRawData(rows);
      setLiveCurrency(cur);
      setSource({ type: 'live', id: symbol.toUpperCase() });
      const peerIds = PEER_GROUPS[symbol.toUpperCase()]?.peers ?? [];
      setPeerLoading(peerIds.length > 0);
      const peerResults = await Promise.allSettled(peerIds.map(async (peerId) => [peerId, (await fetchKisCandles(peerId, { count: 200 })).rows]));
      setPeerData(Object.fromEntries(peerResults.filter((result) => result.status === 'fulfilled').map((result) => result.value)));
      setPeerLoading(false);
    } catch (e) {
      if (fallbackToSample) {
        setSource({ type: 'sample', id: DEFAULT_TICKER });
        setRawData(getSampleData(DEFAULT_TICKER));
        setPeerData({});
        setError('실시간 조회에 실패해 샘플 데이터를 표시하고 있습니다.');
      } else {
        setError(e.message || '실시간 데이터를 불러오지 못했습니다.');
      }
      setPeerLoading(false);
    } finally {
      setLiveLoading(false);
    }
  }

  useEffect(() => {
    void handleLiveLookup(DEFAULT_LIVE_SYMBOL, { fallbackToSample: true });
  }, []);

  const enriched = useMemo(() => {
    if (!rawData?.length) return [];
    const closes = rawData.map((d) => d.close);
    const highs = rawData.map((d) => d.high ?? d.close);
    const lows = rawData.map((d) => d.low ?? d.close);
    const volumes = rawData.map((d) => d.volume ?? null);
    const hasVolumes = volumes.every((v) => v != null);
    const result = compositeSignal(closes, { highs, lows, volumes: hasVolumes ? volumes : null });
    return rawData.map((d, i) => ({
      ...d,
      rsi: result.rsi[i],
      macdLine: result.macdLine[i],
      signalLine: result.signalLine[i],
      histogram: result.histogram[i],
      adx: result.composite[i].adx,
      atr: result.composite[i].atr,
      trend: result.composite[i].trend,
      relVolume: result.composite[i].relVolume,
      volumeConfirmed: result.composite[i].volumeConfirmed,
      weightRsi: result.composite[i].weightRsi,
      weightMacd: result.composite[i].weightMacd,
      signalScore: result.composite[i].score,
      signalLabel: result.composite[i].label,
      timing: result.composite[i].timing,
    }));
  }, [rawData]);

  const backtest = useMemo(() => {
    const usable = enriched.filter((r) => r.signalLabel != null);
    if (usable.length < 10) return null;
    const rows = backtestWindow ? usable.slice(-backtestWindow) : usable;
    return runBacktest(rows, backtestConfig);
  }, [enriched, backtestConfig, backtestWindow]);

  const last = enriched.at(-1);
  const prev = enriched.at(-2);
  const strategies = useMemo(() => {
    const usable = enriched.filter((r) => r.signalLabel != null);
    const rows = backtestWindow ? usable.slice(-backtestWindow) : usable;
    return rows.length > 10 ? compareStrategies(rows) : [];
  }, [enriched, backtestWindow]);

  useEffect(() => {
    if (!autoRefresh || source.type !== 'live') return undefined;
    const timer = window.setInterval(() => { void handleLiveLookup(source.id); }, 60_000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, source.type, source.id]);

  return (
    <>
      <a href="#main-content" className="skip-link">
        본문 바로가기
      </a>
      <div className="dashboard-page" style={styles.page}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>투자 시그널 대시보드</h1>
            <p style={styles.subtitle}>
              RSI·MACD·ADX 기반 매수/매도 시그널 분석 — {label}
              {source.type === 'sample' && <span style={styles.demoTag}>샘플(시뮬레이션) 데이터</span>}
              {source.type === 'live' && <span style={styles.liveTag}>실시간 시세 · 한국투자증권 Open API</span>}
            </p>
          </div>
          <button type="button" className="ctrl theme-toggle" onClick={() => setTheme((current) => current === 'light' ? 'dark' : 'light')} aria-label="테마 전환">
            {theme === 'light' ? '다크 모드' : '라이트 모드'}
          </button>
        </header>

        <main id="main-content" className="dashboard-main" style={styles.main}>
          <ControlPanel
            source={source}
            onSelectSample={handleSelectSample}
            onUpload={handleUpload}
            uploadedName={uploadedName}
            error={error}
            onLiveLookup={handleLiveLookup}
            liveLoading={liveLoading}
            defaultLiveSymbol={DEFAULT_LIVE_SYMBOL}
          />
          <div style={styles.sourceBar} role="status" aria-live="polite">
            <span style={styles.sourceDot} />
            <strong>{source.type === 'live' ? '실시간 데이터' : source.type === 'upload' ? '사용자 CSV' : '데모 데이터'}</strong>
            <span>{source.type === 'live' ? '한국투자증권 Open API · 일봉 기반 지표 계산' : source.type === 'upload' ? uploadedName : '샘플 시계열 · API 키 없이 즉시 확인'}</span>
            {liveLoading && <span style={styles.loadingText}>조회 중…</span>}
          </div>
          {source.type === 'live' && <label style={styles.refreshToggle}><input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} /> 1분마다 실시간 가격 자동 갱신</label>}

          {enriched.length > 0 && (
            <>
              <DecisionSummary last={last} prev={prev} currency={currency} />
              <StatTiles
                last={last?.close}
                prev={prev?.close}
                currency={currency}
                rsi={last?.rsi}
                histogram={last?.histogram}
                signalLabel={last?.signalLabel}
                signalScore={last?.signalScore}
                adx={last?.adx}
                trend={last?.trend}
                relVolume={last?.relVolume}
                volumeConfirmed={last?.volumeConfirmed}
                weightRsi={last?.weightRsi}
                weightMacd={last?.weightMacd}
              />
              <DashboardTabs activeTab={activeTab} onChange={setActiveTab} />

              <DecisionWorkbench
                activeTab={activeTab}
                rows={enriched}
                symbol={source.id}
                sourceType={source.type}
                currency={currency}
              />

              {activeTab === 'signal' && <div style={styles.card}><MarketInsightPanel data={enriched} last={last} prev={prev} currency={currency} symbol={source.id} label={label} sourceType={source.type} /></div>}

              {activeTab === 'signal' && <div style={styles.card}><PeerGroupPanel data={enriched} symbol={source.id} sourceType={source.type} peerData={peerData} peerLoading={peerLoading} /></div>}

              {activeTab === 'signal' && <div style={styles.card}><PositioningPanel symbol={source.id} data={enriched} last={last} peerData={peerData} sourceType={source.type} /></div>}

              {activeTab === 'signal' && <div style={styles.card}><TimingPanel last={last} currency={currency} /></div>}

              {activeTab === 'signal' && <div style={styles.card}><PriceChart data={enriched} currency={currency} last={last} /></div>}

              {activeTab === 'signal' && <div style={styles.card}><IndicatorPanel data={enriched} /></div>}

              {activeTab === 'signal' && <div style={styles.card}><RiskPanel last={last} currency={currency} /></div>}

              {activeTab === 'backtest' && backtest && <div style={styles.card}><BacktestPanel backtest={backtest} config={backtestConfig} period={backtestWindow} onPeriodChange={setBacktestWindow} onConfigChange={setBacktestConfig} /></div>}

              {activeTab === 'backtest' && strategies.length > 0 && <div style={styles.card}><StrategyPanel strategies={strategies} /></div>}

              {activeTab === 'signal' && <div style={styles.tableHeader}>
                <h2 style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>일별 데이터 &amp; 시그널</h2>
                <button
                  type="button"
                  className="ctrl"
                  aria-expanded={showTable}
                  onClick={() => setShowTable((v) => !v)}
                >
                  {showTable ? '테이블 숨기기' : '테이블 보기'}
                </button>
              </div>}
              {activeTab === 'signal' && showTable && <DataTable data={enriched} currency={currency} />}
              {activeTab === 'about' && <div style={styles.card}><MethodologyPanel /></div>}
            </>
          )}
        </main>

        <footer style={styles.footer}>
          방법론: RSI(14) 과매수/과매도 점수와 MACD(12,26,9) 히스토그램 모멘텀 점수를 ADX(14) 기반으로
          동적 가중 평균한 복합 스코어와 EMA·볼린저·스토캐스틱·지지/저항·거래량 기반 타이밍 조건을 함께 표시합니다.
          백테스트와 리스크 가이드는 실제 주문 없이 분석 결과를 검증하기 위한 참고 기능이며, 모든 계산은 브라우저 안에서만 처리됩니다.
          샘플 데이터는 실제 시세가 아닌 시뮬레이션이며, 본 도구는 투자 참고용이고
          투자 권유가 아닙니다.
        </footer>
      </div>
    </>
  );
}

const styles = {
  page: {
    maxWidth: 1120,
    margin: '0 auto',
    padding: '28px 22px 64px',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 8 },
  main: { display: 'flex', flexDirection: 'column', gap: 18 },
  title: { fontSize: 24, fontWeight: 800, margin: 0, textWrap: 'balance' },
  subtitle: { fontSize: 13, color: 'var(--text-secondary)', margin: '6px 0 0', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  demoTag: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--status-warning)',
    background: 'var(--status-warning-bg)',
    padding: '2px 8px',
    borderRadius: 999,
  },
  liveTag: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--status-good)',
    background: 'var(--status-good-bg)',
    padding: '2px 8px',
    borderRadius: 999,
  },
  card: {
    background: 'var(--surface-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-card)',
    padding: '20px 20px 12px',
    boxShadow: 'var(--shadow-soft)',
    backdropFilter: 'var(--glass-blur)',
    WebkitBackdropFilter: 'var(--glass-blur)',
    boxSizing: 'border-box',
  },
  tableHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  sectionTitle: { margin: '0 0 12px', fontSize: 14, color: 'var(--text-secondary)' },
  refreshToggle: { fontSize: 11.5, color: 'var(--text-muted)', alignSelf: 'flex-end', marginTop: -10 },
  sourceBar: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 7, minHeight: 30, padding: '7px 11px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface-card-alt)', color: 'var(--text-muted)', fontSize: 10.5 },
  sourceDot: { width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-strong)', boxShadow: '0 0 0 3px var(--accent-soft)' },
  loadingText: { color: 'var(--status-warning)', fontWeight: 700, marginLeft: 'auto' },
  footer: { fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.6, marginTop: 8, borderTop: '1px solid var(--gridline)', paddingTop: 14 },
};
