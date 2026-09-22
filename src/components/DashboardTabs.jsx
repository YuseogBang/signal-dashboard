const TABS = [
  ['signal', '시그널'],
  ['paper', '모의투자'],
  ['backtest', '백테스트'],
  ['journal', '매매일지'],
];

export default function DashboardTabs({ activeTab, onChange, competitionMode, onCompetitionModeChange }) {
  return (
    <nav style={styles.wrap} aria-label="대시보드 보기 전환">
      <div style={styles.tabs}>
        {TABS.map(([id, label]) => <button key={id} type="button" className="ctrl" style={activeTab === id ? styles.active : {}} onClick={() => onChange(id)} aria-pressed={activeTab === id}>{label}</button>)}
      </div>
      <label style={styles.mode}><input type="checkbox" checked={competitionMode} onChange={(e) => onCompetitionModeChange(e.target.checked)} /> 대회 모드</label>
    </nav>
  );
}

const styles = {
  wrap: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '4px 0' },
  tabs: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  active: { color: 'var(--seafoam)', borderColor: 'var(--accent-strong)', background: 'var(--accent-soft)' },
  mode: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-secondary)', cursor: 'pointer' },
};

