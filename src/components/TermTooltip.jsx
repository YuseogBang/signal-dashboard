const TERM_DEFINITIONS = {
  RSI: '최근 상승·하락 폭을 0~100으로 나타냅니다. 70 이상은 과매수, 30 이하는 과매도로 해석합니다.',
  MACD: '단기·장기 이동평균의 차이로 추세와 모멘텀 변화를 봅니다. 히스토그램이 양수면 상승 모멘텀이 우세합니다.',
  ADX: '추세의 방향이 아니라 강도를 0~100으로 측정합니다. 보통 25 이상이면 추세가 강하다고 봅니다.',
  ATR: '최근 일정 기간의 평균적인 가격 변동폭입니다. 변동성에 맞춘 손절 거리와 포지션 크기 계산에 활용합니다.',
  EMA: '최근 가격에 더 큰 가중치를 주는 이동평균입니다. EMA 20과 50의 배열로 단기·중기 추세를 확인합니다.',
  볼린저: '이동평균과 변동성 밴드로 가격의 상대적 위치를 봅니다. %B가 0%에 가까우면 하단, 100%에 가까우면 상단입니다.',
  스토캐스틱: '현재 종가가 최근 고가·저가 범위에서 어디에 있는지 나타냅니다. 20 이하는 과매도, 80 이상은 과매수 구간입니다.',
  상대거래량: '현재 거래량을 최근 평균 거래량으로 나눈 값입니다. 1보다 크면 평소보다 거래가 활발합니다.',
};

export default function TermTooltip({ term, children, className = '' }) {
  const description = TERM_DEFINITIONS[term];
  if (!description) return children;

  return (
    <span className={`term-tooltip ${className}`} tabIndex="0" aria-label={`${term} 설명`}>
      {children}
      <span className="term-tooltip__mark" aria-hidden="true">?</span>
      <span className="term-tooltip__content" role="tooltip">{description}</span>
    </span>
  );
}
