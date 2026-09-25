import { useRef, useState } from 'react';
import { getTickerMeta, SAMPLE_TICKERS } from '../data/sampleData';

export default function ControlPanel({
  source,
  onSelectSample,
  onUpload,
  uploadedName,
  error,
  onLiveLookup,
  liveLoading,
  defaultLiveSymbol,
}) {
  const fileRef = useRef(null);
  const [symbolInput, setSymbolInput] = useState(defaultLiveSymbol);

  function submitLiveLookup(e) {
    e.preventDefault();
    const trimmed = symbolInput.trim();
    if (!trimmed || liveLoading) return;
    onLiveLookup(trimmed);
  }

  const tickerMeta = getTickerMeta(symbolInput);
  const isKnownTicker = Boolean(symbolInput.trim()) && tickerMeta.name !== symbolInput.trim().toUpperCase();

  return (
    <div style={styles.wrap}>
      {onLiveLookup && (
        <form style={styles.group} onSubmit={submitLiveLookup}>
          <label htmlFor="live-symbol" style={styles.label}>
            실시간 조회 (한국투자증권 Open API)
          </label>
          <div style={styles.uploadRow}>
            <input
              id="live-symbol"
              className="ctrl"
              style={styles.symbolInput}
              type="text"
              placeholder="예: 005930, AAPL"
              value={symbolInput}
              onChange={(e) => setSymbolInput(e.target.value)}
              autoComplete="off"
            />
            <button type="submit" className="ctrl" disabled={liveLoading || !symbolInput.trim()}>
              {liveLoading ? '조회 중…' : '조회'}
            </button>
          </div>
          {isKnownTicker ? <span style={styles.tickerHint}>{tickerMeta.name} · {tickerMeta.market} · {tickerMeta.currency}</span> : <span style={styles.hint}>티커를 입력하면 등록된 종목명을 먼저 표시합니다.</span>}
          <span style={styles.hint}>먼저 실시간 데이터를 시도하고, 실패하면 샘플 데이터로 전환합니다.</span>
        </form>
      )}

      <div style={styles.group}>
        <label htmlFor="ticker-select" style={styles.label}>
          샘플 종목
        </label>
        <select
          id="ticker-select"
          className="ctrl"
          style={styles.select}
          value={source.type === 'sample' ? source.id : ''}
          onChange={(e) => onSelectSample(e.target.value)}
        >
          <option value="" disabled>
            종목 선택…
          </option>
          {SAMPLE_TICKERS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label} · {t.market}
            </option>
          ))}
        </select>
      </div>

      <div style={styles.group}>
        <label htmlFor="csv-upload" style={styles.label}>
          또는 CSV 업로드
        </label>
        <div style={styles.uploadRow}>
          <button type="button" className="ctrl" onClick={() => fileRef.current?.click()}>
            파일 선택
          </button>
          <span style={{ ...styles.fileName }} className="truncate">
            {source.type === 'upload' ? uploadedName : '선택된 파일 없음'}
          </span>
          <input
            id="csv-upload"
            ref={fileRef}
            type="file"
            accept=".csv"
            style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.target.value = '';
            }}
          />
        </div>
        <span style={styles.hint}>필요 컬럼: date, close (open/high/low/volume 선택)</span>
      </div>

      {error && (
        <div role="alert" aria-live="polite" style={styles.error}>
          {error}
        </div>
      )}
    </div>
  );
}

const styles = {
  wrap: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 24,
    padding: '18px 20px',
    background: 'var(--surface-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-panel)',
    boxShadow: 'var(--shadow-soft)',
  },
  group: { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 220, maxWidth: 320 },
  label: { fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 0.2 },
  select: {
    background: 'var(--surface-card-alt)',
    color: 'var(--text-primary)',
    fontSize: 14,
  },
  uploadRow: { display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 },
  fileName: { fontSize: 13, color: 'var(--text-secondary)', minWidth: 0 },
  symbolInput: {
    background: 'var(--surface-card-alt)',
    color: 'var(--text-primary)',
    fontSize: 14,
    width: 130,
  },
  hint: { fontSize: 11, color: 'var(--text-muted)' },
  tickerHint: { fontSize: 11.5, color: 'var(--accent-strong)', fontWeight: 700 },
  error: {
    fontSize: 13,
    color: 'var(--status-critical)',
    background: 'var(--status-critical-bg)',
    padding: '8px 12px',
    borderRadius: 8,
    alignSelf: 'center',
  },
};
