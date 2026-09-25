import { useCallback, useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import useStoredState from '../hooks/useStoredState';
import { REGIMES, regimeOf, scenarios, rewardRisk, sizePosition, anchoredVwap, evaluateTheses, exitState, conditionSnapshot, snapshotChanges, percent, positive } from '../utils/decision';
import MarketComparison from './MarketComparison';
import PortfolioPanel from './PortfolioPanel';
import { formatPrice } from '../utils/format';
import './workbench.css';

export function Card({ title, children, hint }) {
  return <section className="wb-card"><h2>{title}</h2>{hint && <p className="wb-muted">{hint}</p>}{children}</section>;
}
export function Field({ label, children }) { return <label className="wb-field"><span>{label}</span>{children}</label>; }
export function NumberField({ label, value, onChange, min = 0, max, step = 'any', required = false }) {
  return <Field label={label}><input className="ctrl" type="number" min={min} max={max} step={step} required={required} value={value ?? ''} onChange={e => onChange(e.target.value)} /></Field>;
}
export function PriceMap({ rows, currency, entry, stop, target, anchor }) {
  return <div className="wb-chart" aria-label="종가와 진입·청산·목표 가격 지도">
    <ResponsiveContainer width="100%" height={290}><LineChart data={rows.slice(-120)} margin={{ top: 16, right: 18, bottom: 8, left: 8 }}>
      <CartesianGrid stroke="var(--gridline)" /><XAxis dataKey="date" minTickGap={45} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
      <YAxis domain={['auto', 'auto']} width={70} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
      <Tooltip contentStyle={{ background: 'var(--surface-card)', borderColor: 'var(--border)', borderRadius: 10 }} formatter={v => formatPrice(v, currency)} />
      <Line dataKey="close" name="종가" stroke="var(--series-price)" dot={false} isAnimationActive={false} />
      {anchor && <Line dataKey="avwap" name="이벤트 평균 가격" stroke="var(--status-warning)" dot={false} connectNulls={false} isAnimationActive={false} />}
      {[[entry, '진입', 'var(--accent-strong)'], [stop, '청산', 'var(--status-critical)'], [target, '목표', 'var(--status-good)']].filter(([p]) => positive(p)).map(([p, label, color]) => <ReferenceLine key={label} y={Number(p)} ifOverflow="extendDomain" stroke={color} strokeDasharray="5 4" label={{ value: label, fill: color, position: 'insideTopRight' }} />)}
    </LineChart></ResponsiveContainer>
  </div>;
}

export default function DecisionWorkbench({ activeTab, rows, symbol, sourceType, currency }) {
  const [db, setDb, storageError] = useStoredState('investment-workbench', { records: {}, holdings: [], fx: '' });
  const key = `${sourceType}:${symbol}`;
  const record = db.records?.[key] || {};
  const plan = record.plan;
  const last = rows.at(-1);
  const updateRecord = useCallback(changes => setDb(prev => ({ ...prev, records: { ...prev.records, [key]: { ...(prev.records?.[key] || {}), ...changes } } })), [key, setDb]);
  const [relativeRecord, setRelativeRecord] = useState(null);
  const relative = relativeRecord?.key === key ? relativeRecord.value : null;
  const setRelative = useCallback(value => setRelativeRecord({ key, value }), [key]);
  // Monitoring runs while the dashboard is open, including when another tab is selected.
  useEffect(() => {
    if (!last || (!record.watching && !plan)) return;
    const snapshot = conditionSnapshot(last, plan, rows, relative, record.events);
    const changes = record.watching ? snapshotChanges(record.snapshot, snapshot) : [];
    const exit = plan && exitState(plan, rows);
    const trailChanged = exit && exit.trail > Number(plan.trail || 0);
    if (!changes.length && (!record.watching || record.snapshot) && !trailChanged) return;
    updateRecord({ ...(record.watching ? { snapshot } : {}), ...(trailChanged ? { plan: { ...plan, trail: exit.trail } } : {}), alerts: [...changes.map(c => ({ ...c, date: new Date().toISOString(), bar: last.date })), ...(record.alerts || [])].slice(0, 60) });
  }, [key, last, plan, rows, relative, record.watching, record.events, record.snapshot, record.alerts, updateRecord]);

  const visible = ['plan', 'holdings', 'market'].includes(activeTab);
  return <div className="workbench" hidden={!visible}>
    {storageError && <p role="alert">{storageError}</p>}
    {visible && <p className="wb-source">{sourceType === 'sample' ? '시뮬레이션 데이터 · 실제 투자 계획과 별도 저장' : sourceType === 'upload' ? '업로드한 데이터 기준 · 수정주가·종목·통화 확인 필요' : '조회된 일봉 기준'} · 기준일 {last?.date} · 계획과 기록은 이 브라우저에 저장됩니다.</p>}
    {activeTab === 'plan' && <PlanPanel key={key} rows={rows} currency={currency} record={record} onSave={updateRecord} />}
    {activeTab === 'holdings' && <>
      <HoldingPanel rows={rows} currency={currency} record={record} relative={relative} onSave={updateRecord} />
      <PortfolioPanel db={db} setDb={setDb} rows={rows} symbol={symbol} currency={currency} sourceType={sourceType} />
    </>}
    <div hidden={activeTab !== 'market'}><MarketComparison visible={activeTab === 'market'} key={key} rows={rows} symbol={symbol} sourceType={sourceType} currency={currency} onRelative={setRelative} /></div>
  </div>;
}

function PlanPanel({ rows, currency, record, onSave }) {
  const choices = useMemo(() => scenarios(rows), [rows]);
  const last = rows.at(-1);
  const regime = REGIMES[regimeOf(last)];
  const [selection, setSelection] = useState(record.plan?.id || 'now');
  const [draft, setDraft] = useState(() => ({ ...(choices[0] || {}), account: '', cash: '', riskPct: 1, maxWeight: 20, costBps: 10, units: '', horizon: 20, date: last?.date, theses: ['trend', 'support'], ...(record.plan || {}) }));
  const [anchor, setAnchor] = useState(record.anchor || '');
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [message, setMessage] = useState('');
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));
  const sizing = sizePosition({ ...draft, entry: Number(draft.entry), stop: Number(draft.stop) });
  const rr = rewardRisk(Number(draft.entry), Number(draft.stop), Number(draft.target), Number(draft.costBps));
  const withVwap = anchor && anchor >= rows[0]?.date && anchor <= last?.date ? anchoredVwap(rows, anchor) : rows;
  const anchorValue = withVwap.at(-1)?.avwap;
  const extension = positive(last?.atr) && positive(last?.timing?.emaFast) ? (last.close - last.timing.emaFast) / last.atr : null;
  const events = record.events || [];
  const endDate = new Date(`${draft.date}T00:00:00Z`);
  endDate.setUTCDate(endDate.getUTCDate() + Math.ceil(Number(draft.horizon || 20) * 7 / 5));
  const plannedEnd = Number.isFinite(endDate.getTime()) ? endDate.toISOString().slice(0, 10) : '';
  const inPeriod = events.filter(e => e.date >= draft.date && e.date <= plannedEnd);
  const save = e => {
    e.preventDefault();
    if (!positive(draft.entry) || !positive(draft.stop) || Number(draft.stop) >= Number(draft.entry) || !positive(draft.units) || Number(draft.units) > 1e9 || !draft.date || draft.date > last.date || !positive(draft.horizon) || draft.horizon > 252 || !draft.theses.length || (draft.target && Number(draft.target) <= Number(draft.entry))) { setMessage('진입가 > 청산가 > 0, 양수 수량, 기준일 이하 매수일, 1~252봉 보유기간과 매수 근거를 확인하세요. 목표가는 진입가보다 높아야 합니다.'); return; }
    onSave({ plan: { ...draft, entry: Number(draft.entry), stop: Number(draft.stop), target: positive(draft.target) ? Number(draft.target) : null, units: Number(draft.units), horizon: Number(draft.horizon), support: Number(draft.stop), anchor: anchor || null, trail: Number(draft.stop), multiplier: 2, savedAt: new Date().toISOString() }, anchor });
    setMessage('보유 계획을 저장했습니다. 보유 관리 탭에서 근거와 청산 조건을 확인하세요.');
  };
  return <>
    <Card title="시장 상태에 맞는 진입 계획" hint="일봉 기준 수일~수주 시나리오 · 규칙 기반 참고값이며 상승 확률이 아닙니다.">
      <div className="wb-metrics"><div><span>현재 상태</span><strong>{regime.name}</strong></div><div><span>검토 전략</span><strong>{regime.strategy}</strong></div><div><span>EMA 20 대비 이격</span><strong>{extension == null ? '자료 부족' : `${extension.toFixed(2)} ATR`}</strong></div></div>
      <p className="wb-note">{regime.note} {extension > 2 && '기준선에서 2 ATR 이상 멀어져 추격 부담을 확인해야 합니다. 2 ATR은 초기 규칙값입니다.'}</p>
      <div className="wb-scroll"><table><thead><tr><th>시나리오</th><th>진입 가정</th><th>무효화선</th><th>목표 후보</th><th>비용 후 손익비</th></tr></thead><tbody>{choices.map(c => { const ratio = rewardRisk(c.entry, c.stop, c.target, Number(draft.costBps)); return <tr key={c.id}><td><button className="ctrl" aria-pressed={selection === c.id} onClick={() => { setSelection(c.id); setDraft(d => ({ ...d, ...c })); }}>{c.name}</button></td><td>{formatPrice(c.entry, currency)}</td><td>{formatPrice(c.stop, currency)}</td><td>{c.target ? formatPrice(c.target, currency) : '직접 설정 필요'}</td><td>{ratio == null ? '산출 불가' : `${ratio.toFixed(2)}배`}</td></tr>; })}</tbody></table></div>
      {!choices.length && <p>OHLC·ATR·EMA 데이터가 부족합니다. 가격을 직접 입력해 계획을 작성할 수 있습니다.</p>}
      <p className="wb-muted">{draft.condition} · {draft.targetSource} · 손익비가 높아도 해당 가격에 체결되거나 목표에 도달한다는 의미는 아닙니다.</p>
    </Card>
    <Card title="진입·청산 가격을 조정해 보세요" hint="매수 방향 계획입니다. 매도 신호가 나와도 공매도로 전환하지 않습니다.">
      <form onSubmit={save}>
        <div className="wb-grid">
          <NumberField label={`진입·실제 매수가 (${currency})`} value={draft.entry} onChange={v => set('entry', v)} required />
          <NumberField label={`무효화·청산 가격 (${currency})`} value={draft.stop} onChange={v => set('stop', v)} required />
          <NumberField label={`목표가 (${currency}, 선택)`} value={draft.target} onChange={v => set('target', v)} />
        </div>
        {positive(draft.entry) && positive(last?.atr) && <Field label="진입 가격 미세 조정"><input type="range" aria-label="진입 가격 미세 조정" min={Math.max(.01, last.close - last.atr * 5)} max={last.close + last.atr * 5} step="any" value={draft.entry} onChange={e => set('entry', e.target.value)} /></Field>}
        <PriceMap rows={withVwap} currency={currency} entry={draft.entry} stop={draft.stop} target={draft.target} anchor={anchor} />
        <div className="wb-grid">
          <NumberField label={`계좌 평가액 (${currency})`} value={draft.account} onChange={v => set('account', v)} />
          <NumberField label={`매수 가능 현금 (${currency})`} value={draft.cash} onChange={v => set('cash', v)} />
          <NumberField label="허용 위험 (%/거래)" value={draft.riskPct} min={.01} max={100} onChange={v => set('riskPct', v)} />
          <NumberField label="종목 비중 상한 (%)" value={draft.maxWeight} min={.01} max={100} onChange={v => set('maxWeight', v)} />
          <NumberField label="편도 비용·슬리피지 (bp, 10bp=0.1%)" value={draft.costBps} max={1000} onChange={v => set('costBps', v)} />
        </div>
        <p className="wb-note">비용 후 손익비 <b>{rr == null ? '유효한 목표·청산 가격 필요' : `${rr.toFixed(2)}배`}</b> · {sizing ? <>현금·위험·비중 한도 기준 <b>{sizing.units.toLocaleString()}주</b> / 청산 가격 체결 가정 손실 {formatPrice(sizing.plannedLoss, currency)}</> : '계좌와 현금을 입력하면 수량을 계산합니다.'}</p>
        <p className="wb-muted">청산 가격의 체결을 가정한 손실입니다. 갭과 급변동으로 실제 손실이 더 커질 수 있습니다.</p>
        <div className="wb-grid"><Field label="실제 매수일"><input className="ctrl" type="date" required max={last?.date} value={draft.date} onChange={e => set('date', e.target.value)} /></Field><NumberField label="실제 보유 수량" value={draft.units} onChange={v => set('units', v)} required /><NumberField label="재검토할 보유기간 (거래일)" value={draft.horizon} min={1} max={252} step={1} onChange={v => set('horizon', v)} required /></div>
        <fieldset><legend>저장할 매수 근거</legend>{[['trend','EMA 상승 정렬'],['support','설정한 청산 가격 유지'],['relative','시장 대비 상대강세'],['anchor','이벤트 평균 가격 유지']].map(([id, name]) => <label className="wb-check" key={id}><input type="checkbox" checked={draft.theses.includes(id)} onChange={e => set('theses', e.target.checked ? [...draft.theses, id] : draft.theses.filter(t => t !== id))} />{name}</label>)}</fieldset>
        <button className="ctrl" type="submit">{record.plan ? '현재 종목 보유 계획 다시 저장' : '보유 계획 저장'}</button>
        {record.plan && <span className="wb-muted"> 다시 저장하면 기존 진입·청산 기준을 새 계획으로 교체합니다.</span>}
        <p role="status">{message}</p>
      </form>
    </Card>
    <Card title="이벤트 기준 가격과 일정" hint="실적 발표일·급등 시작일·매수일 등을 직접 등록합니다. 외부 일정 자동 연동은 포함되지 않습니다.">
      <Field label="평균 가격 계산 시작일"><input className="ctrl" type="date" min={rows[0]?.date} max={last?.date} value={anchor} onChange={e => { setAnchor(e.target.value); onSave({ anchor: e.target.value }); }} /></Field>
      <p>이벤트 이후 거래량 가중 평균: <b>{anchorValue == null ? '시작일과 유효한 OHLCV 필요' : formatPrice(anchorValue, currency)}</b>{positive(anchorValue) && ` · 종가 ${percent(last.close / anchorValue - 1)} 이격`}</p>
      <p className="wb-muted">일봉 대표가격 (고가+저가+종가)/3을 사용한 근사치입니다. 기관 평단이나 현재 보유자의 실제 평단이 아닙니다.</p>
      <form onSubmit={e => { e.preventDefault(); if (eventDate && eventName.trim()) { onSave({ events: [...events, { id: crypto.randomUUID(), name: eventName.trim(), date: eventDate }].sort((a,b) => a.date.localeCompare(b.date)) }); setEventName(''); setEventDate(''); } }} className="wb-grid">
        <Field label="이벤트 이름"><input className="ctrl" required maxLength={80} value={eventName} onChange={e => setEventName(e.target.value)} placeholder="예: 분기 실적 발표" /></Field><Field label="이벤트 날짜"><input className="ctrl" type="date" required value={eventDate} onChange={e => setEventDate(e.target.value)} /></Field><button className="ctrl" type="submit">일정 추가</button>
      </form>
      {inPeriod.length > 0 && <p className="wb-note">계획 보유기간 내 일정: {inPeriod.map(e => `${e.date} ${e.name}`).join(' · ')} (예상 종료일은 주 5일 환산, 휴장일 미반영)</p>}
      <ul className="wb-events">{events.map(e => <li key={e.id}><time>{e.date}</time> {e.name} <button className="ctrl" onClick={() => onSave({ events: events.filter(x => x.id !== e.id) })} aria-label={`${e.name} 일정 삭제`}>삭제</button></li>)}</ul>
    </Card>
  </>;
}

function HoldingPanel({ rows, currency, record, relative, onSave }) {
  const plan = record.plan;
  const exit = plan && exitState(plan, rows);
  const thesis = plan ? evaluateTheses(plan, rows, relative) : [];
  return <>
    <Card title="보유 근거와 엑시트 관리" hint="매매 계획 탭에서 실제 매수가·수량·근거를 저장하면 추적합니다. 자동 주문 기능은 없습니다.">
      {!exit ? <p>이 종목의 보유 계획을 먼저 저장하세요.</p> : <>
        <div className="wb-metrics"><div><span>매수가 대비 변화</span><strong>{percent(exit.pnl)}</strong></div><div><span>추적 청산선</span><strong>{formatPrice(exit.trail, currency)}</strong></div><div><span>관측 보유기간 / 재검토</span><strong>{exit.elapsed} / {plan.horizon}거래일</strong></div></div>
        <PriceMap rows={rows} currency={currency} entry={plan.entry} stop={exit.trail} target={plan.target} />
        <div className="wb-scroll"><table><thead><tr><th>저장한 매수 근거</th><th>현재 상태</th></tr></thead><tbody>{thesis.map(t => <tr key={t.key}><td>{t.name}</td><td>{t.status}</td></tr>)}</tbody></table></div>
        <div className="wb-grid"><p className="wb-note">가격: {exit.priceExit ? '추적 청산선 이하 · 청산 계획 확인' : exit.targetHit ? '목표가 도달 · 익절 계획 확인' : '설정 구간 내'}</p><p className="wb-note">근거: {thesis.filter(t => t.status === '약화').length}개 약화 · {thesis.filter(t => t.status === '자료 부족').length}개 미확인</p><p className="wb-note">시간: {exit.timeExit ? '예정 보유기간 경과 · 계속 보유할 이유 재검토' : '계획 기간 내'}</p></div>
        <p className="wb-muted">추적 청산선은 관측 종가 최고점 − 2 ATR과 기존 청산선 중 높은 값입니다. 이전 선을 낮추지 않습니다. 장중 도달·체결은 확인하지 않습니다.</p>
        {!exit.rangeCovered && <p role="status">매수일부터의 전체 이력이 없어 보유기간·추적선은 일부 데이터 기준입니다. 과거 CSV를 추가하세요.</p>}
        <button className="ctrl" onClick={() => onSave({ plan: null, watching: false, snapshot: null })}>이 종목 보유 계획 해제</button>
      </>}
    </Card>
    <Card title="조건 변화 알림" hint="이 페이지가 열린 동안 조회·갱신된 현재 종목을 감시합니다. 창을 닫으면 감시가 중단됩니다.">
      <label className="wb-check"><input type="checkbox" checked={Boolean(record.watching)} onChange={e => onSave({ watching: e.target.checked, snapshot: conditionSnapshot(rows.at(-1), plan, rows, relative, record.events) })} />현재 종목의 조건 변화 기록</label>
      <p className="wb-muted">실시간 종목은 첫 화면의 ‘1분마다 자동 갱신’을 함께 켜세요. 일봉 마지막 값은 장중에는 확정되지 않을 수 있습니다. 브라우저 푸시·서버 상시 감시는 연결되지 않았습니다.</p>
      <div className="wb-scroll" aria-live="polite"><table><thead><tr><th>기록 시각</th><th>바뀐 조건</th><th>이전 → 현재</th></tr></thead><tbody>{(record.alerts || []).map((a, i) => <tr key={`${a.date}-${i}`}><td>{new Date(a.date).toLocaleString('ko-KR')}</td><td>{a.name}</td><td>{a.before} → {a.after}</td></tr>)}</tbody></table></div>
      {!record.alerts?.length && <p>기록된 조건 변화가 없습니다.</p>}
      {record.alerts?.length > 0 && <button className="ctrl" onClick={() => onSave({ alerts: [] })}>알림 기록 비우기</button>}
    </Card>
  </>;
}
