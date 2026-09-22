import { useMemo, useState } from 'react';
import ControlPanel from './components/ControlPanel';
import StatTiles from './components/StatTiles';
import PriceChart from './components/PriceChart';
import IndicatorPanel from './components/IndicatorPanel';
import DataTable from './components/DataTable';
import RiskPanel from './components/RiskPanel';
import BacktestPanel from './components/BacktestPanel';
import { getSampleData, SAMPLE_TICKERS } from './data/sampleData';
import { compositeSignal, runBacktest } from './utils/indicators';
import { parseCsvFile } from './utils/csv';
import { fetchTossCandles } from './utils/tossApi';

const DEFAULT_TICKER = SAMPLE_TICKERS[0].id;

export default function App() {
  const [source, setSource] = useState({ type: 'sample', id: DEFAULT_TICKER });
  const [rawData, setRawData] = useState(() => getSampleData(DEFAULT_TICKER));
  const [uploadedName, setUploadedName] = useState('');
  const [liveCurrency, setLiveCurrency] = useState('KRW');
  const [liveLoading, setLiveLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTable, setShowTable] = useState(false);

  const currency = useMemo(() => {
    if (source.type === 'sample') {
      return SAMPLE_TICKERS.find((t) => t.id === source.id)?.currency ?? 'KRW';
    }
    if (source.type === 'live') return liveCurrency;
    return 'KRW';
  }, [source, liveCurrency]);

  const label = useMemo(() => {
    if (source.type === 'sample') return SAMPLE_TICKERS.find((t) => t.id === source.id)?.label ?? '';
    if (source.type === 'live') return `${source.id} (실시간)`;
    return uploadedName || '업로드된 데이터';
  }, [source, uploadedName]);

  function handleSelectSample(id) {
    setError('');
    setSource({ type: 'sample', id });
    setRawData(getSampleData(id));
  }

  async function handleUpload(file) {
    setError('');
    try {
      const rows = await parseCsvFile(file);
      setRawData(rows);
      setUploadedName(file.name);
      setSource({ type: 'upload', id: file.name });
    } catch (e) {
      setError(e.message || '파일을 처리하지 못했습니다.');
    }
  }

  async function handleLiveLookup(symbol) {
    setError('');
    setLiveLoading(true);
    try {
      const { rows, currency: cur } = await fetchTossCandles(symbol, { interval: '1d', count: 200 });
      setRawData(rows);
      setLiveCurrency(cur);
      setSource({ type: 'live', id: symbol.toUpperCase() });
    } catch (e) {
      setError(e.message || '실시간 데이터를 불러오지 못했습니다.');
    } finally {
      setLiveLoading(false);
    }
  }

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
    }));
  }, [rawData]);

  const backtest = useMemo(() => {
    const usable = enriched.filter((r) => r.signalLabel != null);
    if (usable.length < 10) return null;
    return runBacktest(usable);
  }, [enriched]);

  const last = enriched.at(-1);
  const prev = enriched.at(-2);

  return (
    <>
      <a href="#main-content" className="skip-link">
        본문 바로가기
      </a>
      <div style={styles.page}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>투자 시그널 대시보드</h1>
            <p style={styles.subtitle}>
              RSI·MACD·ADX 기반 매수/매도 시그널 분석 — {label}
              {source.type === 'sample' && <span style={styles.demoTag}>샘플(시뮬레이션) 데이터</span>}
              {source.type === 'live' && <span style={styles.liveTag}>실시간 시세 · 토스증권 Open API</span>}
            </p>
          </div>
        </header>

        <main id="main-content" style={styles.main}>
          <ControlPanel
            source={source}
            onSelectSample={handleSelectSample}
            onUpload={handleUpload}
            uploadedName={uploadedName}
            error={error}
            onLiveLookup={handleLiveLookup}
            liveLoading={liveLoading}
          />

          {enriched.length > 0 && (
            <>
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

              <div style={styles.card}>
                <PriceChart data={enriched} currency={currency} />
              </div>

              <div style={styles.card}>
                <IndicatorPanel data={enriched} />
              </div>

              <div style={styles.card}>
                <RiskPanel last={last} currency={currency} />
              </div>

              {backtest && (
                <div style={styles.card}>
                  <BacktestPanel backtest={backtest} />
                </div>
              )}

              <div style={styles.tableHeader}>
                <h2 style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>일별 데이터 &amp; 시그널</h2>
                <button
                  type="button"
                  className="ctrl"
                  aria-expanded={showTable}
                  onClick={() => setShowTable((v) => !v)}
                >
                  {showTable ? '테이블 숨기기' : '테이블 보기'}
                </button>
              </div>
              {showTable && <DataTable data={enriched} currency={currency} />}
            </>
          )}
        </main>

        <footer style={styles.footer}>
          방법론: RSI(14) 과매수/과매도 점수와 MACD(12,26,9) 히스토그램 모멘텀 점수를 ADX(14) 기반으로
          동적 가중 평균한 복합 스코어로 매수/매도/관망 시그널을 산출합니다 (추세 강한 구간은 MACD 비중↑,
          횡보 구간은 RSI 비중↑). 거래량·ATR 변동성·추세 상태는 참고 지표로 함께 표시되며 스코어 계산에는
          직접 반영되지 않습니다. 샘플 데이터는 실제 시세가 아닌 시뮬레이션이며, 실사용 시 CSV 업로드 또는
          실시간 조회(토스증권 Open API) 기능으로 실제 시세 데이터를 넣어 분석하세요. 본 도구는 투자 참고용이며
          투자 권유가 아닙니다.
        </footer>
      </div>
    </>
  );
}

const styles = {
  page: {
    maxWidth: 1080,
    margin: '0 auto',
    padding: '24px 20px 60px',
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
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
    borderRadius: 6,
    padding: '16px 16px 8px',
  },
  tableHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  footer: { fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.6, marginTop: 8, borderTop: '1px solid var(--gridline)', paddingTop: 14 },
};
