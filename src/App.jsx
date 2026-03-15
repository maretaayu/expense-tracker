import { useState, useMemo, useEffect } from 'react';
import { Plus, LogOut, ChevronDown, Bell, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { useRef } from 'react';
import { onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, db } from './firebase';
import { useExpenses } from './hooks/useExpenses';
import SummarySection from './components/SummarySection';
import FilterBar from './components/FilterBar';
import ExpenseCard from './components/ExpenseCard';
import ExpenseModal from './components/ExpenseModal';
import LoginPage from './components/LoginPage';
import ReportPage from './components/ReportPage';
import BudgetPage from './components/BudgetPage';
import BottomNav from './components/BottomNav';
import { useCategories } from './hooks/useCategories';
import { useBudgets } from './hooks/useBudgets';
import { getGreeting, getDailyQuote, formatCurrency, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from './utils/constants.jsx';
import EntryMethodPicker from './components/EntryMethodPicker';
import { parseReceiptWithGemini } from './utils/geminiOcr';
import { getDoc, doc } from 'firebase/firestore';
import './App.css';

const FULL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function groupByDate(expenses) {
  const today = new Date(); today.setHours(0,0,0,0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const groups = {};

  expenses.forEach((e) => {
    // Priority: e.date (transaction date) then fallbacks
    // e.date is usually 'YYYY-MM-DD' from the modal
    const d = e.date ? new Date(e.date) : (e.createdAt?.toDate ? e.createdAt.toDate() : new Date());
    const day = new Date(d); day.setHours(0,0,0,0);
    
    let label;
    if (day.getTime() === today.getTime()) {
      label = 'Today';
    } else if (day.getTime() === yesterday.getTime()) {
      label = 'Yesterday';
    } else {
      label = new Intl.DateTimeFormat('en-US', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      }).format(d);
    }

    const key = day.getTime(); // Use timestamp as key for better sorting
    if (!groups[key]) {
      groups[key] = { label, items: [], ts: day.getTime(), total: 0 };
    }
    groups[key].items.push(e);
    if (e.type !== 'income') groups[key].total += Number(e.amount);
  });

  // Sort groups by timestamp descending
  return Object.values(groups).sort((a, b) => b.ts - a.ts);
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isMagicScanning, setIsMagicScanning] = useState(false);
  const [showMagicSuccess, setShowMagicSuccess] = useState(false);
  const [magicError, setMagicError] = useState(null);
  const [filter, setFilter] = useState({ search: '', category: '', type: '' });
  const [autoScan, setAutoScan] = useState(false);
  
  const magicFileInputRef = useRef(null);

  const { expenses, loading, addExpense, deleteExpense, updateExpense } = useExpenses(user);
  const { customCategories, addCategory } = useCategories(user);
  const { budgets } = useBudgets();

  const allExpenseCategories = useMemo(() => [
    ...EXPENSE_CATEGORIES,
    ...customCategories
  ], [customCategories]);

  const allCategories = useMemo(() => [
    ...allExpenseCategories,
    ...INCOME_CATEGORIES
  ], [allExpenseCategories]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { 
      setUser(u); 
      setAuthLoading(false); 
    });
    return unsub;
  }, []);


  const { balance, totalIncome, totalExpense, totalBudget, spendPercent, monthTransCount } = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthItems = expenses.filter(e => {
      const d = e.date ? new Date(e.date) : (e.createdAt?.toDate ? e.createdAt.toDate() : new Date());
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const totalIncome  = monthItems.filter(e => e.type === 'income').reduce((s, e) => s + Number(e.amount), 0);
    const totalExpense = monthItems.filter(e => e.type !== 'income').reduce((s, e) => s + Number(e.amount), 0);
    const totalBudget = budgets.reduce((acc, b) => acc + b.limit, 0);
    const spendPercent = totalBudget > 0 ? Math.min((totalExpense / totalBudget) * 100, 100) : 0;
    
    return { 
      totalIncome, 
      totalExpense, 
      balance: totalIncome - totalExpense, 
      totalBudget, 
      spendPercent,
      monthTransCount: monthItems.length
    };
  }, [expenses, budgets]);

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      const matchSearch = !filter.search || e.title.toLowerCase().includes(filter.search.toLowerCase());
      const matchCat   = !filter.category || e.category === filter.category;
      const matchType  = !filter.type     || e.type === filter.type;
      return matchSearch && matchCat && matchType;
    });
  }, [expenses, filter]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  const handleMagicScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsMagicScanning(true);
    setMagicError(null);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      const parsed = await parseReceiptWithGemini(file, apiKey);
      
      // Auto save
      await addExpense({
        ...parsed,
        type: 'expense'
      });

      setIsMagicScanning(false);
      setShowMagicSuccess(true);
      setTimeout(() => setShowMagicSuccess(false), 3000);
    } catch (err) {
      console.error('Magic scan failed:', err);
      setMagicError(err.message || 'Gagal membaca struk');
      setIsMagicScanning(false);
      // Fallback: open manual modal if AI fails?
    } finally {
      if (magicFileInputRef.current) magicFileInputRef.current.value = '';
    }
  };

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
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="hero-notif" onClick={() => signOut(auth)} title="Logout" style={{ border: 'none', background: 'transparent' }}>
                <LogOut size={20} color="var(--ink)" />
              </button>
            </div>
          </div>

          {/* Balance */}
          <div className="hero-balance-area">
            <p className="hero-label">Monthly Spending</p>
            <p className={`hero-amount neg`}>
              -{formatCurrency(totalExpense)}
            </p>
            
            {totalBudget > 0 && (
              <div style={{ width: '80%', margin: '14px auto 0', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontWeight: 700, color: 'var(--ink-3)', marginBottom: '4px' }}>
                  <span>Budget Progress</span>
                  <span>{Math.round(spendPercent)}%</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(0,0,0,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${spendPercent}%`, 
                    background: spendPercent > 100 ? 'var(--r)' : 'var(--violet)',
                    borderRadius: '10px',
                    transition: 'width 0.5s ease'
                  }} />
                </div>
              </div>
            )}

            <div className="hero-metrics">
              <span className="hero-sub">Balance {formatCurrency(balance)}</span>
              <span className="hero-sub-divider">•</span>
              <span className="hero-sub">{monthTransCount} Trans.</span>
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

            <div className="section-head">
              <h3 className="section-title">Today's Activity</h3>
              <button 
                className="section-link" 
                onClick={() => setActiveTab('transactions')}
                style={{ background: 'none', border: 'none', color: 'var(--violet)', fontWeight: 700, fontSize: '0.85rem' }}
              >
                See All
              </button>
            </div>

            <div className="expense-list">
              {loading ? (
                <p className="list-state-msg">Fetching data…</p>
              ) : expenses.length === 0 ? (
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
                (() => {
                  const today = new Date();
                  today.setHours(0,0,0,0);
                  
                  const todayTransactions = expenses.filter(e => {
                    const d = e.date ? new Date(e.date) : (e.createdAt?.toDate ? e.createdAt.toDate() : new Date());
                    const dNorm = new Date(d);
                    dNorm.setHours(0,0,0,0);
                    return dNorm.getTime() === today.getTime();
                  }).sort((a,b) => {
                    const da = a.date ? new Date(a.date) : (a.createdAt?.toDate ? a.createdAt.toDate() : new Date());
                    const db = b.date ? new Date(b.date) : (b.createdAt?.toDate ? b.createdAt.toDate() : new Date());
                    return db - da;
                  });

                  if (todayTransactions.length === 0) {
                    return (
                      <div className="empty-state" style={{ padding: '20px 0' }}>
                        <div className="empty-emoji" style={{ opacity: 0.5 }}>
                          <CheckCircle2 size={40} color="var(--violet)" />
                        </div>
                        <p className="empty-title" style={{ fontSize: '1rem' }}>Today is empty</p>
                        <p className="empty-sub">No transactions recorded today.</p>
                      </div>
                    );
                  }

                  return todayTransactions.map((expense) => (
                    <ExpenseCard
                      key={expense.id}
                      expense={expense}
                      category={allCategories.find(c => c.value === expense.category)}
                      onEdit={(e) => { setEditingExpense(e); setModalOpen(true); }}
                      onDelete={deleteExpense}
                    />
                  ));
                })()
              )}
            </div>
          </>
        )}

        {activeTab === 'transactions' && (
          <>
            <div className="section-head" style={{ marginBottom: '16px' }}>
              <h3 className="section-title" style={{ fontSize: '1.4rem' }}>Transaction History</h3>
            </div>
            
            <FilterBar filter={filter} setFilter={setFilter} />

            <div className="expense-list" style={{ marginTop: '20px' }}>
              {grouped.length === 0 ? (
                <p className="list-state-msg">No transactions found matching your filters.</p>
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
                          category={allCategories.find(c => c.value === expense.category)}
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

        {activeTab === 'budget' && (
          <BudgetPage 
            expenses={expenses} 
            categories={allExpenseCategories}
          />
        )}

        {activeTab === 'report' && <ReportPage expenses={expenses} />}
      </div>

      {/* ── BOTTOM NAV (contains FAB) ── */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onFab={() => { setEditingExpense(null); setPickerOpen(true); }}
        showFab={activeTab === 'home'}
      />

      <EntryMethodPicker
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(method) => {
          setPickerOpen(false);
          if (method === 'scan') {
            magicFileInputRef.current?.click();
          } else {
            setModalOpen(true);
          }
        }}
      />

      <input
        type="file"
        ref={magicFileInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={handleMagicScan}
      />

      {/* Magic Scanning Overlay */}
      {isMagicScanning && (
        <div className="magic-overlay">
          <div className="magic-card">
            <div className="magic-spinner" />
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Magic Scanning...</h3>
              <p style={{ margin: '5px 0 0', fontSize: '0.85rem', color: 'var(--ink-3)' }}>
                AI sedang membaca & mencatat struk kamu
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Magic Success Toast */}
      {showMagicSuccess && (
        <div className="magic-success">
          <CheckCircle2 size={20} />
          <span>Expense Saved Automatically!</span>
        </div>
      )}

      {/* Magic Error Fallback */}
      {magicError && (
        <div className="magic-overlay" onClick={() => setMagicError(null)}>
          <div className="magic-card" style={{ borderColor: '#FEE2E2' }}>
            <AlertCircle size={40} color="#EF4444" />
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ margin: 0, color: '#EF4444' }}>Gagal Membaca</h3>
              <p style={{ margin: '5px 0 0', fontSize: '0.85rem' }}>{magicError}</p>
            </div>
            <button 
              className="btn-save" 
              style={{ padding: '10px 20px', fontSize: '0.85rem' }}
              onClick={() => { setMagicError(null); setModalOpen(true); }}
            >
              Masukan Manual Saja
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL ── */}
      <ExpenseModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingExpense(null); setAutoScan(false); }}
        onSave={(data) => editingExpense ? updateExpense(editingExpense.id, data) : addExpense(data)}
        expense={editingExpense}
        autoScan={autoScan}
        customCategories={customCategories}
        onAddCategory={addCategory}
      />
    </div>
  );
}
