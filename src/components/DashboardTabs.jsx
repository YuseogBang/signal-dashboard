const TABS = [
  ['signal', '시그널'],
  ['plan', '매매 계획'],
  ['holdings', '보유 관리'],
  ['market', '시장 비교'],
  ['backtest', '백테스트'],
  ['about', '방법론'],
];

export default function DashboardTabs({ activeTab, onChange }) {
  return (
    <nav style={styles.wrap} aria-label="대시보드 보기 전환">
      <div style={styles.tabs}>
        {TABS.map(([id, label]) => <button key={id} type="button" className="ctrl" style={activeTab === id ? styles.active : {}} onClick={() => onChange(id)} aria-pressed={activeTab === id}>{label}</button>)}
      </div>
    </nav>
  );
}

const styles = {
  wrap: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '4px 0' },
  tabs: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  active: { color: 'var(--seafoam)', borderColor: 'var(--accent-strong)', background: 'var(--accent-soft)' },
  mode: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-secondary)', cursor: 'pointer' },
};
