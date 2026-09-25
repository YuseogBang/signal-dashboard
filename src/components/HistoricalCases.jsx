import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { historicalCases, percent, regimeOf, REGIMES } from '../utils/decision';
import { Card, Field, NumberField } from './DecisionWorkbench';

export default function HistoricalCases({ rows, sourceType, costBps = 10 }) {
  const [horizon,setHorizon] = useState(10); const [cost,setCost] = useState(costBps);
  const result = useMemo(() => historicalCases(rows,{horizon,costBps:Number(cost)}),[rows,horizon,cost]);
  const bins = [{label:'−10% 미만',min:-Infinity,max:-.1},{label:'−10~−5%',min:-.1,max:-.05},{label:'−5~0%',min:-.05,max:0},{label:'0~5%',min:0,max:.05},{label:'5~10%',min:.05,max:.1},{label:'10% 이상',min:.1,max:Infinity}].map(b=>({...b,count:result.cases.filter(c=>c.ret>=b.min&&c.ret<b.max).length}));
  return <div className="workbench"><Card title="유사 조건의 과거 결과" hint="현재와 같은 시장 상태·종합 시그널이었던 과거 관측을 찾습니다. 같은 조건의 미래 수익률 예측값이 아닙니다.">
    <div className="wb-grid"><Field label="관측 보유기간"><select className="ctrl" value={horizon} onChange={e=>setHorizon(Number(e.target.value))}>{[5,10,20].map(n=><option key={n} value={n}>{n}거래일</option>)}</select></Field><NumberField label="편도 비용·슬리피지 (bp)" value={cost} max={1000} onChange={setCost} /></div>
    <p>{REGIMES[regimeOf(rows.at(-1))].name} · {result.cases.length}개 독립 구간 · 평가 구간 시작 {result.from || '자료 부족'}</p>
    {sourceType === 'sample' && <p className="wb-note">시뮬레이션 데이터 결과입니다. 실제 시장 성과 검증에 사용할 수 없습니다.</p>}
    {result.insufficient ? <p className="wb-note">자료 부족: 30개 미만의 관측으로 요약 통계·도달 비율을 표시하지 않습니다. 30개는 화면 표시 최소 기준이며 통계적 신뢰를 보장하지 않습니다. 장기 OHLCV CSV를 업로드하세요.</p> : <>
      <div className="wb-metrics"><div><span>기간 수익률 중앙값 (비용 후)</span><strong>{percent(result.median)}</strong></div><div><span>10~90백분위 구간</span><strong>{percent(result.low)} ~ {percent(result.high)}</strong></div><div><span>관측 중 최대 진입가 대비 하락</span><strong>{percent(result.worst)}</strong></div></div>
      <ResponsiveContainer width="100%" height={260}><BarChart data={bins}><CartesianGrid stroke="var(--gridline)" /><XAxis dataKey="label" tick={{fontSize:10,fill:'var(--text-muted)'}} /><YAxis allowDecimals={false} tick={{fontSize:10,fill:'var(--text-muted)'}} /><Tooltip contentStyle={{background:'var(--surface-card)'}} /><Bar name="관측 수" dataKey="count" fill="var(--accent-strong)" isAnimationActive={false} /></BarChart></ResponsiveContainer>
      <div className="wb-metrics">{['목표 먼저','손절 먼저','순서 불명','미도달'].map(outcome=><div key={outcome}><span>{outcome}</span><strong>{percent(result.cases.filter(c=>c.outcome===outcome).length/result.cases.length)}</strong></div>)}</div>
    </>}
    <details><summary>관측 사례와 계산 방법</summary><p className="wb-muted">전체 데이터의 최근 1/3만 평가하며, 신호 다음 봉 시가에 진입한 것으로 가정합니다. 중첩 구간은 제외합니다. 손절 2 ATR·목표 3 ATR은 신호 시점 값으로 고정합니다. 한 일봉에서 양쪽 가격에 모두 닿고 시가로 순서를 알 수 없으면 ‘순서 불명’으로 남깁니다. 기간 수익률은 청산선을 적용한 전략 수익률과 다릅니다. 화면을 보고 반복 조정하면 평가 구간도 과최적화될 수 있습니다.</p><div className="wb-scroll"><table><thead><tr><th>신호일</th><th>기간 수익률</th><th>진입가 대비 최대 하락</th><th>선도달</th></tr></thead><tbody>{result.cases.map(c=><tr key={c.date}><td>{c.date}</td><td>{percent(c.ret)}</td><td>{percent(c.worst)}</td><td>{c.outcome}</td></tr>)}</tbody></table></div></details>
  </Card></div>;
}
