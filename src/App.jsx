import { useState, useMemo, useEffect } from 'react';
import { Plus, LogOut, ChevronDown, Bell, ChevronRight } from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { useExpenses } from './hooks/useExpenses';
import SummarySection from './components/SummarySection';
import FilterBar from './components/FilterBar';
import ExpenseCard from './components/ExpenseCard';
import ExpenseModal from './components/ExpenseModal';
import LoginPage from './components/LoginPage';
import ReportPage from './components/ReportPage';
import BottomNav from './components/BottomNav';
import { getGreeting, getDailyQuote, formatCurrency } from './utils/constants.jsx';
import './App.css';

const FULL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function groupByDate(expenses) {
  const today = new Date(); today.setHours(0,0,0,0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const groups = {};
  expenses.forEach((e) => {
    const d = e.createdAt?.toDate ? e.createdAt.toDate() : new Date(e.date || Date.now());
    const day = new Date(d); day.setHours(0,0,0,0);
    let label;
    if (day.getTime() === today.getTime()) label = 'Today';
    else if (day.getTime() === yesterday.getTime()) label = 'Yesterday';
    else label = new Intl.DateTimeFormat('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
    const key = `${day.getTime()}__${label}`;
    if (!groups[key]) groups[key] = { label, items: [], ts: day.getTime(), total: 0 };
    groups[key].items.push(e);
    if (e.type !== 'income') groups[key].total += Number(e.amount);
  });
  return Object.values(groups).sort((a, b) => b.ts - a.ts);
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [filter, setFilter] = useState({ search: '', category: '', type: '' });

  const { expenses, loading, addExpense, deleteExpense, updateExpense } = useExpenses(user);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setAuthLoading(false); });
    return unsub;
  }, []);

  const { balance, totalIncome, totalExpense } = useMemo(() => {
    const totalIncome  = expenses.filter(e => e.type === 'income').reduce((s, e) => s + Number(e.amount), 0);
    const totalExpense = expenses.filter(e => e.type !== 'income').reduce((s, e) => s + Number(e.amount), 0);
    return { totalIncome, totalExpense, balance: totalIncome - totalExpense };
  }, [expenses]);

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      const matchSearch = !filter.search || e.title.toLowerCase().includes(filter.search.toLowerCase());
      const matchCat   = !filter.category || e.category === filter.category;
      const matchType  = !filter.type     || e.type === filter.type;
      return matchSearch && matchCat && matchType;
    });
  }, [expenses, filter]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  const now = new Date();
  const monthLabel = `${FULL_MONTHS[now.getMonth()]} ${now.getFullYear()}`;

  if (authLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p className="loading-txt">Loading data…</p>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  const firstName = user.displayName?.split(' ')[0] || 'You';
  const initials  = (user.displayName || 'U').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();

  const hour = now.getHours();
  let greeting = 'Good Morning';
  let motivation = 'Manage your finances with confidence today.';
  if (hour >= 12 && hour < 17) {
      greeting = 'Good Afternoon';
      motivation = 'Stay productive, control your spending.';
  } else if (hour >= 17 && hour < 21) {
      greeting = 'Good Evening';
      motivation = 'A good time to review today’s budget.';
  } else if (hour >= 21) {
      greeting = 'Good Night';
      motivation = 'Track your expenses before you rest.';
  }

  return (
    <div className="app-container">
      {/* ── HERO GRADIENT HEADER (home only) ── */}
      {activeTab === 'home' && (
        <div className="hero-header">
          {/* Top bar */}
          <div className="hero-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left' }}>
              {user.photoURL
                ? <img className="hero-avatar" src={user.photoURL} alt={firstName} />
                : <div className="hero-avatar-placeholder">{initials}</div>
              }
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--ink)' }}>{greeting}, {firstName}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--ink-3)', marginTop: '2px' }}>{motivation}</span>
              </div>
            </div>
            
            <button className="hero-notif" onClick={() => signOut(auth)} title="Logout" style={{ border: 'none', background: 'transparent' }}>
              <LogOut size={20} color="var(--ink)" />
            </button>
          </div>

          {/* Balance */}
          <div className="hero-balance-area">
            <p className="hero-label">Current Balance</p>
            <p className={`hero-amount${balance < 0 ? ' neg' : ''}`}>
              {formatCurrency(balance)}
            </p>
            <div className="hero-metrics">
              <span className="hero-sub">+ {formatCurrency(totalIncome)} this month</span>
              <span className="hero-sub-divider">•</span>
              <span className="hero-sub">{expenses.length} Transactions</span>
            </div>
          </div>
        </div>
      )}

      {/* ── CONTENT SHEET ── */}
      <div className={`content-sheet${activeTab !== 'home' ? ' plain' : ''}`}>
        {activeTab === 'home' && (
          <>
            {/* Your Money Card */}
            <SummarySection 
              totalIncome={totalIncome} 
              totalExpense={totalExpense} 
              onDetail={() => setActiveTab('report')} 
            />

            {/* Transaction section */}

            {/* No filter bar on home to match reference exactly */}

            <div className="expense-list">
              {loading ? (
                <p className="list-state-msg">Fetching data…</p>
              ) : grouped.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-emoji">
                    <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
                      <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
                    </svg>
                  </div>
                  <p className="empty-title">No transactions yet</p>
                  <p className="empty-sub">Tap + to start tracking</p>
                </div>
              ) : (
                grouped.map((group) => (
                  <div key={group.label} className="date-group">
                    <div className="date-group-top">
                      <p className="date-group-label">{group.label}</p>
                      {group.total > 0 && (
                        <p className="date-group-total">Total -{formatCurrency(group.total)}</p>
                      )}
                    </div>
                    {group.items.map((expense) => (
                      <ExpenseCard
                        key={expense.id}
                        expense={expense}
                        onEdit={(e) => { setEditingExpense(e); setModalOpen(true); }}
                        onDelete={deleteExpense}
                      />
                    ))}
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {activeTab === 'report' && <ReportPage expenses={expenses} />}
      </div>

      {/* ── BOTTOM NAV (contains FAB) ── */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onFab={() => { setEditingExpense(null); setModalOpen(true); }}
        showFab={activeTab === 'home'}
      />

      {/* ── MODAL ── */}
      <ExpenseModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={async (data) => {
          if (editingExpense) await updateExpense(editingExpense.id, data);
          else await addExpense(data);
        }}
        expense={editingExpense}
      />
    </div>
  );
}
