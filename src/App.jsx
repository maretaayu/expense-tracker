import { useState, useMemo, useEffect } from 'react';
import { Plus, LogOut, ChevronDown, Bell, ChevronRight, CheckCircle2, AlertCircle, Wallet, Eye, EyeOff, ArrowUpRight } from 'lucide-react';
import { useRef } from 'react';
import { onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, db } from './firebase';
import { useExpenses } from './hooks/useExpenses';
// import SummarySection from './components/SummarySection';
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
import { LineChart, Line, XAxis, ResponsiveContainer } from 'recharts';
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
  const [showBalance, setShowBalance] = useState(true);
  
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

  const handleLogout = () => signOut(auth);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { 
      setUser(u); 
      setAuthLoading(false); 
    });
    return unsub;
  }, []);


  const { balance, totalIncome, totalExpense, totalIncomeWeek, totalExpenseWeek, incomePct, expensePct, totalBudget, spendPercent, monthTransCount, weeklyStats } = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    let prevIncomeWeek = 0;
    let prevExpenseWeek = 0;

    const monthItems = expenses.filter(e => {
      const d = e.date ? new Date(e.date) : (e.createdAt?.toDate ? e.createdAt.toDate() : new Date());
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const totalIncome  = monthItems.filter(e => e.type === 'income').reduce((s, e) => s + Number(e.amount), 0);
    const totalExpense = monthItems.filter(e => e.type !== 'income').reduce((s, e) => s + Number(e.amount), 0);
    
    // Main balance displays current month's net performance
    const balance = totalIncome - totalExpense;

    const totalBudget = budgets.reduce((acc, b) => acc + b.limit, 0);
    const spendPercent = totalBudget > 0 ? Math.min((totalExpense / totalBudget) * 100, 100) : 0;

    // Last 7 days spending stats for chart and cards
    const weeklyStats = [];
    let totalIncomeWeek = 0;
    let totalExpenseWeek = 0;
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      
      const dayIncome = expenses.filter(e => {
        const ed = e.date ? new Date(e.date) : (e.createdAt?.toDate ? e.createdAt.toDate() : new Date());
        return ed.toDateString() === d.toDateString() && e.type === 'income';
      }).reduce((s, e) => s + Number(e.amount), 0);

      const dayExpense = expenses.filter(e => {
        const ed = e.date ? new Date(e.date) : (e.createdAt?.toDate ? e.createdAt.toDate() : new Date());
        return ed.toDateString() === d.toDateString() && e.type !== 'income';
      }).reduce((s, e) => s + Number(e.amount), 0);

      totalIncomeWeek += dayIncome;
      totalExpenseWeek += dayExpense;
      weeklyStats.push({ name: dayName, val: dayExpense });
    }
    
    for (let i = 13; i >= 7; i--) {
      const d = new Date(); d.setDate(now.getDate() - i);
      const isMatch = (e) => {
        const ed = e.date ? new Date(e.date) : (e.createdAt?.toDate ? e.createdAt.toDate() : new Date());
        return ed.toDateString() === d.toDateString();
      };
      prevIncomeWeek += expenses.filter(e => isMatch(e) && e.type === 'income').reduce((s, e) => s + Number(e.amount), 0);
      prevExpenseWeek += expenses.filter(e => isMatch(e) && e.type !== 'income').reduce((s, e) => s + Number(e.amount), 0);
    }
    const incomePct = prevIncomeWeek > 0 ? Math.round(((totalIncomeWeek - prevIncomeWeek) / prevIncomeWeek) * 100) : (totalIncomeWeek > 0 ? 100 : 0);
    const expensePct = prevExpenseWeek > 0 ? Math.round(((totalExpenseWeek - prevExpenseWeek) / prevExpenseWeek) * 100) : (totalExpenseWeek > 0 ? 100 : 0);
    
    return { 
      totalIncome, 
      totalExpense, 
      totalIncomeWeek,
      totalExpenseWeek,
      incomePct,
      expensePct,
      balance, 
      totalBudget, 
      spendPercent,
      weeklyStats,
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

  const hour = new Date().getHours();
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
        <div className="hero-section" style={{ 
          padding: '32px 0 60px', 
          background: 'radial-gradient(at 0% 0%, #E0E7FF 0%, transparent 50%), radial-gradient(at 100% 0%, #FEE2E2 0%, transparent 50%), #F8F9FE',
          borderBottomLeftRadius: '0px', 
          borderBottomRightRadius: '0px',
          position: 'relative',
          color: 'var(--ink)',
          zIndex: 10
        }}>
          {/* Header Row */}
          <div style={{ padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {user.photoURL ? (
                <img src={user.photoURL} alt="p" style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid white' }} />
              ) : (
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--violet)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{initials}</div>
              )}
              <div style={{ textAlign: 'left' }}>
                <p style={{ margin: 0, fontSize: '0.7rem', opacity: 0.6 }}>Hello, {greeting}</p>
                <p style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>{firstName}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              style={{ border: 'none', background: 'white', width: 44, height: 44, borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', cursor: 'pointer' }}
            >
              <LogOut size={20} />
            </button>
          </div>

          {/* Balance Area */}
          <div style={{ padding: '0 24px', textAlign: 'left', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: 600, opacity: 0.4 }}>MONTHLY REMAINING</p>
              <button 
                onClick={() => setShowBalance(!showBalance)}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                {showBalance ? <Eye size={12} style={{ opacity: 0.4 }} /> : <EyeOff size={12} style={{ opacity: 0.4 }} />}
              </button>
            </div>
            <h1 style={{ margin: '4px 0 0', fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '12px' }}>
              {showBalance ? formatCurrency(balance) : '••••••••'}
            </h1>
          </div>

          {/* Graph Section */}
          <div style={{ width: '100%', height: '140px', padding: '0 10px', marginTop: '20px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyStats}>
                <Line type="monotone" dataKey="val" stroke="var(--violet)" strokeWidth={3} dot={false} strokeOpacity={0.4} />
                <XAxis dataKey="name" hide />
              </LineChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 24px', opacity: 0.3, fontSize: '0.65rem', color: 'var(--ink)' }}>
              {weeklyStats.map(s => <span key={s.name}>{s.name}</span>)}
            </div>
          </div>
          
          <p style={{ padding: '0 24px', margin: '16px 0 0', fontSize: '0.65rem', opacity: 0.3, textAlign: 'left', color: 'var(--ink)' }}>
            ⓘ Graph representing stats past one week
          </p>

          {/* Overlapping Cards Container */}
          <div style={{ 
            position: 'absolute', 
            bottom: '-40px', 
            left: 0, 
            width: '100%', 
            padding: '0 20px', 
            display: 'flex', 
            gap: '12px',
            zIndex: 100
          }}>
            <div style={{ 
              flex: 1, background: '#E0E7FF', 
              padding: '18px', borderRadius: '24px', boxShadow: '0 8px 16px rgba(0,0,0,0.05)',
              display: 'flex', flexDirection: 'column'
            }}>
               <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 700, color: 'var(--violet)', opacity: 0.8 }}>Income this month</p>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                 <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: 'var(--ink)' }}>{showBalance ? formatCurrency(totalIncome) : '••••••'}</p>
                 <ArrowUpRight size={18} color="#16A34A" />
               </div>
            </div>
            <div style={{ 
              flex: 1, background: '#FEE2E2', 
              padding: '18px', borderRadius: '24px', boxShadow: '0 8px 16px rgba(0,0,0,0.05)',
              display: 'flex', flexDirection: 'column'
            }}>
               <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 700, color: '#EF4444', opacity: 0.8 }}>Expense this month</p>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                 <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: 'var(--ink)' }}>{showBalance ? formatCurrency(totalExpense) : '••••••'}</p>
                 <ArrowUpRight size={18} color="#EF4444" style={{ rotate: '90deg' }} />
               </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SUB-PAGE HEADER (non-home tabs) ── */}
      {activeTab !== 'home' && (
        <div className="sub-header" style={{ 
          padding: '24px 24px 40px', 
          background: 'radial-gradient(at 0% 0%, #E0E7FF 0%, transparent 50%), radial-gradient(at 100% 0%, #FEE2E2 0%, transparent 50%), #F8F9FE',
          color: 'var(--ink)',
          textAlign: 'center',
          position: 'relative'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, textTransform: 'capitalize' }}>
            {activeTab === 'expenses' ? 'All Expenses' : activeTab}
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.75rem', opacity: 0.6 }}>{motivation}</p>
        </div>
      )}

      {/* ── CONTENT SHEET ── */}
      <div className="content-sheet" style={{ 
        background: '#FFFFFF', 
        paddingTop: activeTab === 'home' ? '90px' : '40px',
        borderTopLeftRadius: '32px',
        borderTopRightRadius: '32px',
        marginTop: '-32px',
        flex: 1,
        position: 'relative',
        zIndex: 5,
        boxShadow: '0 -20px 40px rgba(0,0,0,0.02)'
      }}>
        {activeTab === 'home' && (
          <>
            <div className="section-head" style={{ marginTop: '12px', marginBottom: '20px' }}>
              <h3 className="section-title">Recent Transactions</h3>
              <button 
                className="section-link" 
                onClick={() => setActiveTab('expenses')}
                style={{ background: 'none', border: 'none', color: 'var(--violet)', fontWeight: 700, fontSize: '0.85rem' }}
              >
                see all
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
                      category={EXPENSE_CATEGORIES.concat(INCOME_CATEGORIES).find(c => c.value === expense.category)}
                      onEdit={(e) => { setEditingExpense(e); setModalOpen(true); }}
                      onDelete={deleteExpense}
                    />
                  ));
                })()
              )}
            </div>
          </>
        )}

        {activeTab === 'expenses' && (
          <>
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

        {activeTab === 'analytics' && <ReportPage expenses={expenses} budgets={budgets} />}
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
