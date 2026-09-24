const ITEMS = [
  ['문제 정의', '여러 지표를 한 화면에 나열하는 대신 추세·모멘텀·가격 위치·거래량을 함께 확인해 매수·매도 판단의 근거를 설명합니다.'],
  ['신호 계산', 'RSI와 MACD를 기본 축으로 사용하고 ADX 추세 강도에 따라 가중치를 조정합니다. EMA·볼린저·스토캐스틱·지지/저항은 타이밍 확인에 사용합니다.'],
  ['리스크 관리', 'ATR을 이용해 손절 참고선과 목표가, 계좌 규모를 입력한 포지션 사이징을 계산합니다. 모든 계산은 브라우저 안에서 처리됩니다.'],
  ['데이터 한계', '실시간 캔들, 샘플 시뮬레이션, CSV 업로드를 구분합니다. ETF 편입 비중·선물 미결제약정·옵션 내재변동성처럼 별도 API가 필요한 값은 임의 생성하지 않습니다.'],
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
