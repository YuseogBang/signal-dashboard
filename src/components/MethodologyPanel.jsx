const ITEMS = [
  ['문제 정의', '여러 지표를 한 화면에 나열하는 대신 추세·모멘텀·가격 위치·거래량을 함께 확인해 매수·매도 판단의 근거를 설명합니다.'],
  ['신호 계산', 'RSI와 MACD를 기본 축으로 사용하고 ADX 추세 강도에 따라 가중치를 조정합니다. EMA·볼린저·스토캐스틱·지지/저항은 타이밍 확인에 사용합니다.'],
  ['리스크 관리', 'ATR을 이용해 손절 참고선과 목표가, 계좌 규모를 입력한 포지션 사이징을 계산합니다. 모든 계산은 브라우저 안에서 처리됩니다.'],
  ['시장 영향 추정', 'ETF 편입 노출, 선물 방향, 옵션 콜·풋 구조를 함께 보고 상승 우호·하락 압력·중립으로 요약합니다. 인과관계가 아닌 동시점 시장 포지셔닝 기반 참고 지표입니다.'],
  ['데이터 신선도', '각 영역은 실시간 REST 조회, WebSocket 확장 영역, 최신 구성 데이터, 샘플·CSV를 구분합니다. API 응답이 없으면 임의 수치 대신 연결 대기 또는 조회 실패로 표시합니다.'],
  ['데이터 한계', 'ETF 편입 비중·미결제약정·옵션 내재변동성은 API가 실제로 반환하는 필드만 표시합니다. 호출 제한·만기·거래시간에 따라 일부 파생 데이터가 비어 있을 수 있습니다.'],
];

export default function MethodologyPanel() {
  return (
    <section aria-labelledby="methodology-heading">
      <div style={styles.header}>
        <div>
          <h2 id="methodology-heading" style={styles.title}>방법론·데이터 안내</h2>
          <p style={styles.description}>포트폴리오 제출용으로 분석 로직과 데이터 한계를 투명하게 공개합니다.</p>
        </div>
        <span style={styles.badge}>검증 가능한 분석 구조</span>
      </div>
      <div className="methodology-grid" style={styles.grid}>
        {ITEMS.map(([title, body]) => <article key={title} style={styles.item}><h3 style={styles.itemTitle}>{title}</h3><p style={styles.body}>{body}</p></article>)}
      </div>
    </section>
  );
}

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  title: { margin: 0, fontSize: 15, color: 'var(--text-primary)' },
  description: { margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' },
  badge: { color: 'var(--accent-strong)', background: 'var(--accent-soft)', borderRadius: 999, padding: '5px 9px', fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 9 },
  item: { background: 'var(--surface-card-alt)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 13px', minHeight: 132 },
  itemTitle: { margin: '0 0 7px', fontSize: 12, color: 'var(--text-primary)' },
  body: { margin: 0, fontSize: 11, lineHeight: 1.55, color: 'var(--text-secondary)' },
};
