import { useState } from 'react';
import { formatPrice, formatDecimal2 } from '../utils/format';

const MULTIPLIER_OPTIONS = [1.5, 2, 3];

export default function RiskPanel({ last, currency }) {
  const [multiplier, setMultiplier] = useState(2);
  const [accountSize, setAccountSize] = useState('');
  const [riskPct, setRiskPct] = useState('1');

  const atrValue = last?.atr ?? null;
  const price = last?.close ?? null;
  const label = last?.signalLabel;
  const isShort = label === 'SELL' || label === 'STRONG_SELL';

  if (atrValue == null || price == null) {
    return (
      <section aria-labelledby="risk-heading">
        <h2 id="risk-heading" style={styles.h2}>
          리스크 가이드 (ATR 기반)
        </h2>
        <p style={styles.emptyNote}>ATR(14) 계산에 필요한 데이터(최소 15거래일)가 부족합니다.</p>
      </section>
    );
  }

  const riskPerUnit = atrValue * multiplier;
  const stopLoss = isShort ? price + riskPerUnit : price - riskPerUnit;
  const target = isShort ? price - riskPerUnit * 1.5 : price + riskPerUnit * 1.5;

  const accountNum = parseFloat(accountSize);
  const riskPctNum = parseFloat(riskPct);
  const hasSizingInput = accountSize !== '' && !Number.isNaN(accountNum) && accountNum > 0 && !Number.isNaN(riskPctNum) && riskPctNum > 0;
  const riskAmount = hasSizingInput ? accountNum * (riskPctNum / 100) : null;
  const suggestedUnits = hasSizingInput && riskPerUnit > 0 ? Math.floor(riskAmount / riskPerUnit) : null;
  const positionValue = suggestedUnits != null ? suggestedUnits * price : null;

  return (
    <section aria-labelledby="risk-heading">
      <h2 id="risk-heading" style={styles.h2}>
        리스크 가이드 (ATR 기반)
      </h2>
      <p style={styles.disclaimer}>
        변동성(ATR)을 이용한 참고용 계산이며 투자 자문이 아닙니다. 실제 주문 전 반드시 본인 판단으로 재확인하세요.
        {label === 'HOLD' && ' 현재 관망 시그널이라 방향성 없이 ATR 밴드만 표시합니다.'}
      </p>

      <div style={styles.grid}>
        <div style={styles.block}>
          <div style={styles.label}>ATR (14)</div>
          <div style={styles.value} className="mono-num">
            {formatPrice(atrValue, currency)}
          </div>
          <div style={styles.hint}>최근 14거래일 평균 변동폭</div>
        </div>

        <div style={styles.block}>
          <div style={styles.labelRow}>
            <span style={styles.label}>손절가 제안</span>
            <select className="ctrl" style={styles.multiplierSelect} value={multiplier} onChange={(e) => setMultiplier(Number(e.target.value))}>
              {MULTIPLIER_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  ATR × {m}
                </option>
              ))}
            </select>
          </div>
          <div style={{ ...styles.value, color: 'var(--status-critical)' }} className="mono-num">
            {label === 'HOLD' ? formatPrice(price - riskPerUnit, currency) : formatPrice(stopLoss, currency)}
          </div>
          <div style={styles.hint}>{isShort ? '진입가 + ' : '진입가 − '}ATR×{multiplier}</div>
        </div>

        <div style={styles.block}>
          <div style={styles.label}>목표가 제안 (R:R 1:1.5)</div>
          <div style={{ ...styles.value, color: 'var(--status-good)' }} className="mono-num">
            {label === 'HOLD' ? formatPrice(price + riskPerUnit, currency) : formatPrice(target, currency)}
          </div>
          <div style={styles.hint}>손절폭의 1.5배 지점</div>
        </div>
      </div>

      <div style={styles.sizingBox}>
        <div style={styles.label}>포지션 사이징 계산기</div>
        <div style={styles.sizingRow}>
          <label style={styles.sizingLabel}>
            계좌 규모 ({currency})
            <input
              type="number"
              className="ctrl"
              style={styles.sizingInput}
              value={accountSize}
              onChange={(e) => setAccountSize(e.target.value)}
              placeholder="예: 10000000"
              min="0"
            />
          </label>
          <label style={styles.sizingLabel}>
            거래당 리스크 (%)
            <input
              type="number"
              className="ctrl"
              style={styles.sizingInput}
              value={riskPct}
              onChange={(e) => setRiskPct(e.target.value)}
              min="0.1"
              step="0.1"
            />
          </label>
        </div>
        {hasSizingInput ? (
          <div style={styles.sizingResult}>
            손절폭 기준 최대 손실 <b className="mono-num">{formatPrice(riskAmount, currency)}</b> 이내로 맞추려면 약{' '}
            <b className="mono-num">{suggestedUnits.toLocaleString('ko-KR')}주</b>
            {positionValue != null && (
              <>
                {' '}
                (평가금액 약 <b className="mono-num">{formatPrice(positionValue, currency)}</b>, ATR×{multiplier} ={' '}
                {formatDecimal2(riskPerUnit)})
              </>
            )}
          </div>
        ) : (
          <div style={styles.sizingHint}>계좌 규모와 리스크 비율을 입력하면 ATR 기반 권장 수량을 계산합니다. 입력값은 브라우저 밖으로 전송되지 않습니다.</div>
        )}
      </div>
    </section>
  );
}

const styles = {
  h2: { fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', margin: '0 0 6px' },
  disclaimer: { fontSize: 11.5, color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: 1.5 },
  emptyNote: { fontSize: 12.5, color: 'var(--text-muted)' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 1,
    background: 'var(--border)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 16,
  },
  block: { background: 'var(--surface-card)', padding: '12px 14px' },
  labelRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 8 },
  label: { fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.2 },
  value: { fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' },
  hint: { fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 },
  multiplierSelect: { padding: '2px 6px', fontSize: 11, fontWeight: 600 },
  sizingBox: { border: '1px solid var(--border)', borderRadius: 6, padding: '14px 16px', background: 'var(--surface-card)' },
  sizingRow: { display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 8 },
  sizingLabel: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 },
  sizingInput: { width: 160, fontSize: 13 },
  sizingResult: { fontSize: 13, color: 'var(--text-primary)', marginTop: 12, lineHeight: 1.7 },
  sizingHint: { fontSize: 11.5, color: 'var(--text-muted)', marginTop: 12 },
};
