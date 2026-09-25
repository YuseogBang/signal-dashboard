import { useState } from 'react';
import { correlation, percent, portfolioRisk, positive } from '../utils/decision';
import { formatPrice } from '../utils/format';
import { Card, Field, NumberField } from './DecisionWorkbench';

export default function PortfolioPanel({ db, setDb, rows, symbol, currency, sourceType }) {
  const [units, setUnits] = useState(''); const [sector, setSector] = useState(''); const [stop, setStop] = useState('');
  const [cash, setCash] = useState(''); const [message, setMessage] = useState('');
  const scope = sourceType === 'sample' ? 'sample' : 'actual';
  const holdings = (db.holdings || []).filter(h => h.scope === scope);
  const options = { baseCurrency: 'KRW', usdKrw: Number(db.fx) };
  const risk = portfolioRisk(holdings, options);
  const last = rows.at(-1);
  const candidate = { id: `${sourceType}:${symbol}`, symbol, currency, units: Number(units), sector: sector.trim() || '미분류', stop: Number(stop), price: last?.close, date: last?.date, scope, history: rows.slice(-61).map(({date,close}) => ({date,close})) };
  const after = portfolioRisk([...holdings, candidate], options);
  const canPreview = positive(units) && positive(stop) && Number(stop) < last?.close;
  const add = e => {
    e.preventDefault(); if (!canPreview) { setMessage('보유 수량과 현재가보다 낮은 청산 가격을 입력하세요.'); return; }
    const existing = (db.holdings || []).find(h => h.id === candidate.id);
    const next = existing ? { ...candidate, units: Number(existing.units) + Number(units) } : candidate;
    setDb(prev => ({ ...prev, holdings: [...(prev.holdings || []).filter(h => h.id !== candidate.id), next] }));
    setUnits(''); setMessage('보유 수량과 가격 스냅샷을 저장했습니다. 기존 종목은 수량을 합산하고 청산가·업종을 입력값으로 갱신합니다.');
  };
  return <Card title="계좌 전체 위험과 추가 매수 영향" hint="직접 등록한 보유내역과 저장 시점 가격으로 계산합니다. 계좌 연동·자동 시세 갱신은 없습니다. 데모와 실제 데이터는 별도 집계합니다.">
    <div className="wb-grid"><NumberField label="USD/KRW 환율 (직접 입력)" value={db.fx} onChange={v => setDb(prev => ({ ...prev, fx:v }))} /><NumberField label="현금 잔액 (KRW, 비교용)" value={cash} onChange={setCash} /></div>
    <form onSubmit={add}><h3>현재 종목 {symbol} 추가</h3><div className="wb-grid"><NumberField label="추가할 수량" value={units} onChange={setUnits} required /><NumberField label={`청산 가격 (${currency})`} value={stop} onChange={setStop} required /><Field label="업종"><input className="ctrl" value={sector} onChange={e => setSector(e.target.value)} maxLength={40} placeholder="예: 반도체" /></Field><button className="ctrl" type="submit">보유내역에 추가</button></div></form>
    <p role="status">{message}</p>
    <div className="wb-metrics"><div><span>집계 평가금액 (현금 제외)</span><strong>{formatPrice(risk.total,'KRW')}</strong></div><div><span>청산선까지 예상 손실 합계</span><strong>{formatPrice(risk.loss,'KRW')}</strong></div><div><span>현금 포함 총자산 대비</span><strong>{risk.total + Number(cash) > 0 ? percent(risk.loss / (risk.total + Number(cash))) : '자료 부족'}</strong></div></div>
    {risk.missing.length > 0 && <p role="status">환율·가격 미확인으로 제외: {risk.missing.join(', ')}. 일부 자산만 집계한 값입니다.</p>}
    {risk.missingStops > 0 && <p>청산가 미설정 {risk.missingStops}종목은 손실 계산에서 제외됩니다.</p>}
    {canPreview && <p className="wb-note">이번 추가 매수 가정: 평가금액 {formatPrice(risk.total,'KRW')} → {formatPrice(after.total,'KRW')} / 청산선까지 손실 {formatPrice(risk.loss,'KRW')} → {formatPrice(after.loss,'KRW')}{after.missing.includes(symbol) && ' (현재 종목 환율 누락 · 추가 영향 미반영)'}</p>}
    <h3>업종 집중도 (현금 제외)</h3>{Object.entries(risk.groups).map(([name,value]) => <div key={name}><p>{name} {percent(value / risk.total)}</p><div className="wb-bar" style={{ width: `${value / risk.total * 100}%` }} /></div>)}
    <div className="wb-scroll"><table><thead><tr><th>종목 / 기준일</th><th>수량</th><th>가격</th><th>업종</th><th>예상 손실 기여</th><th>관리</th></tr></thead><tbody>{holdings.map(h => { const single = portfolioRisk([h],options); return <tr key={h.id}><td>{h.symbol}<br />{h.date}</td><td>{h.units}</td><td>{formatPrice(h.price,h.currency)}</td><td>{h.sector}</td><td>{single.missing.length || !risk.loss ? '산출 불가' : percent(single.loss / risk.loss)}</td><td>{h.id === candidate.id && <button className="ctrl" onClick={() => setDb(prev => ({...prev, holdings:prev.holdings.map(x=>x.id===h.id ? {...x,price:last.close,date:last.date,history:candidate.history} : x)}))}>현재 조회값 반영</button>} <button className="ctrl" aria-label={`${h.symbol} 보유내역 삭제`} onClick={() => setDb(prev => ({...prev, holdings:prev.holdings.filter(x=>x.id!==h.id)}))}>삭제</button></td></tr>; })}</tbody></table></div>
    <h3>보유 종목 상관관계</h3><p className="wb-muted">동일 통화의 최대 60개 공통 일별 수익률 기준. 최소 20개 필요. 통화가 다르면 환율 시계열이 없어 계산하지 않습니다. 상관계수는 미래 동반 하락 확률이 아닙니다.</p>
    <div className="wb-scroll"><table><thead><tr><th>종목</th>{holdings.map(h => <th key={h.id}>{h.symbol}</th>)}</tr></thead><tbody>{holdings.map(a => <tr key={a.id}><th>{a.symbol}</th>{holdings.map(b => { const value = a.currency === b.currency ? correlation(a.history || [],b.history || []) : null; return <td key={b.id} style={value == null ? {} : {background: `rgba(58,169,169,${Math.abs(value)*.3})`}}>{value == null ? '자료 부족' : value.toFixed(2)}</td>; })}</tr>)}</tbody></table></div>
    <p className="wb-muted">손실 합계는 각 청산가에 체결된다고 가정한 현재가 대비 감소액이며 VaR가 아닙니다. 수수료·갭 손실·환율 변화는 반영하지 않습니다.</p>
  </Card>;
}
