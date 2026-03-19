import { Home, BarChart2, Briefcase, Clock, Plus } from 'lucide-react';

const TABS = [
  { id: 'home',     label: 'Home',      Icon: Home },
  { id: 'expenses', label: 'Expenses',  Icon: Briefcase },
  { id: 'budget',   label: 'Budget',    Icon: Clock },
  { id: 'analytics',label: 'Analytics', Icon: BarChart2 },
];

export default function BottomNav({ activeTab, setActiveTab, onFab, showFab }) {
  const half = Math.ceil(TABS.length / 2);
  const leftTabs  = TABS.slice(0, half);
  const rightTabs = TABS.slice(half);

  return (
    <nav className="bottom-nav">
      {leftTabs.map(({ id, label, Icon }) => (
        <button
          key={id}
          className={`bottom-nav-btn${activeTab === id ? ' active' : ''}`}
          onClick={() => setActiveTab(id)}
        >
          <span className="bottom-nav-icon">
            <Icon size={22} strokeWidth={activeTab === id ? 2.5 : 1.8} />
          </span>
          <span className="bottom-nav-label">{label}</span>
        </button>
      ))}

      {/* Center FAB slot */}
      <div className="bottom-nav-fab-slot">
        <button className="fab" onClick={onFab} aria-label="Add">
          <Plus size={28} strokeWidth={2.5} />
        </button>
      </div>

      {rightTabs.map(({ id, label, Icon }) => (
        <button
          key={id}
          className={`bottom-nav-btn${activeTab === id ? ' active' : ''}`}
          onClick={() => setActiveTab(id)}
        >
          <span className="bottom-nav-icon">
            <Icon size={22} strokeWidth={activeTab === id ? 2.5 : 1.8} />
          </span>
          <span className="bottom-nav-label">{label}</span>
        </button>
      ))}
    </nav>
  );
}
