import { useState } from 'react';
import { Wallet, AlertTriangle, CheckCircle2, Plus, Trash2, Target } from 'lucide-react';
import { EXPENSE_CATEGORIES, formatCurrency } from '../utils/constants';
import { useBudgets } from '../hooks/useBudgets';

export default function BudgetPage({ expenses, categories = [] }) {
  const { budgets, saveBudget, deleteBudget } = useBudgets();
  const [isAdding, setIsAdding] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(categories[0]?.value || 'food');
  const [amount, setAmount] = useState('');

  // Calculate spending this month per category
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const spendingPerCategory = expenses.reduce((acc, curr) => {
    const d = new Date(curr.date);
    if (d.getMonth() === currentMonth && d.getFullYear() === currentYear && curr.type !== 'income') {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
    }
    return acc;
  }, {});

  const handleSave = async (e) => {
    e.preventDefault();
    if (!amount || amount <= 0) return;
    await saveBudget(selectedCategory, amount);
    setAmount('');
    setIsAdding(false);
  };

  const totalBudget = budgets.reduce((acc, b) => acc + b.limit, 0);
  const totalSpent = Object.values(spendingPerCategory).reduce((a, b) => a + b, 0);
  const overallPercent = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;

  return (
    <div className="budget-page" style={{ paddingBottom: '100px' }}>
      {/* Quick Action Area */}
      {!isAdding && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
          <button 
            className="btn-save" 
            onClick={() => setIsAdding(true)}
            style={{ 
              padding: '10px 18px', 
              borderRadius: '14px', 
              fontSize: '0.85rem',
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
            }}
          >
            <Plus size={18} style={{ marginRight: '6px' }} /> Set Budget
          </button>
        </div>
      )}

      {/* ── TOTAL PROGRESS CARD ── */}
      {budgets.length > 0 && !isAdding && (
        <div style={{
          background: 'linear-gradient(135deg, #8D61FF 0%, #6D43E0 100%)',
          padding: '24px',
          borderRadius: '28px',
          color: 'white',
          marginBottom: '32px',
          boxShadow: '0 20px 25px -5px rgba(109, 67, 224, 0.25)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Decorative Circles */}
          <div style={{
            position: 'absolute', right: '-20px', top: '-20px',
            width: '120px', height: '120px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)', pointerEvents: 'none'
          }} />
          <div style={{
            position: 'absolute', left: '-10px', bottom: '-10px',
            width: '60px', height: '60px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)', pointerEvents: 'none'
          }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.7rem', opacity: 0.8, fontWeight: 700, letterSpacing: '0.05em' }}>TOTAL MONTHLY BUDGET</p>
              <h2 style={{ margin: '8px 0', fontSize: '2rem', fontWeight: 800 }}>
                {formatCurrency(totalBudget)}
              </h2>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '12px', borderRadius: '18px' }}>
              <Wallet size={26} />
            </div>
          </div>

          <div style={{ marginTop: '24px', position: 'relative' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '10px' }}>
               <span style={{ opacity: 0.9, fontWeight: 600 }}>Spending Progress</span>
               <span style={{ fontWeight: 800 }}>{Math.round(overallPercent)}%</span>
             </div>
             <div style={{ height: '10px', background: 'rgba(255,255,255,0.2)', borderRadius: '6px', overflow: 'hidden' }}>
               <div style={{ 
                 height: '100%', 
                 width: `${overallPercent}%`,
                 background: 'white',
                 borderRadius: '6px',
                 transition: 'width 1.2s cubic-bezier(0.1, 0.7, 0.1, 1)'
               }} />
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px', alignItems: 'center' }}>
                <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.9, fontWeight: 600 }}>
                  {formatCurrency(totalSpent)} spent
                </p>
                <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.9, fontWeight: 600 }}>
                  {totalSpent > totalBudget 
                    ? `Over by ${formatCurrency(totalSpent - totalBudget)}` 
                    : `${formatCurrency(totalBudget - totalSpent)} remaining`}
                </p>
             </div>
          </div>
        </div>
      )}

      {/* ── FORM ── */}
      {isAdding && (
        <div className="add-budget-card" style={{ 
          background: 'white', 
          padding: '24px', 
          borderRadius: '28px', 
          marginBottom: '32px',
          border: '1px solid var(--border)',
          boxShadow: '0 20px 40px -10px rgba(0,0,0,0.06)'
        }}>
          <h4 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', fontWeight: 800 }}>Set Category Limit</h4>
          
          <form onSubmit={handleSave}>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '12px', color: 'var(--ink-3)', letterSpacing: '0.05em' }}>
                WHICH CATEGORY?
              </label>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(4, 1fr)', 
                gap: '10px',
                padding: '4px'
              }}>
                {categories.map(cat => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategory === cat.value;
                  return (
                    <div 
                      key={cat.value}
                      onClick={() => setSelectedCategory(cat.value)}
                      style={{
                        padding: '12px 6px',
                        borderRadius: '16px',
                        border: '2px solid',
                        borderColor: isSelected ? cat.color : '#F1F5F9',
                        background: isSelected ? cat.bg : 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        transform: isSelected ? 'scale(1.05)' : 'scale(1)'
                      }}
                    >
                      <Icon size={18} color={isSelected ? cat.color : 'var(--ink-3)'} />
                      <span style={{ 
                        fontSize: '0.6rem', 
                        fontWeight: 700, 
                        textAlign: 'center', 
                        color: isSelected ? cat.color : 'var(--ink-2)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        width: '100%'
                      }}>
                        {cat.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '12px', color: 'var(--ink-3)', letterSpacing: '0.05em' }}>
                LIMIT AMOUNT
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: 'var(--ink-2)', fontSize: '1rem' }}>
                  Rp
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={amount ? Number(amount).toLocaleString('id-ID') : ''}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setAmount(val);
                  }}
                  placeholder="0"
                  style={{ width: '100%', paddingLeft: '48px', fontSize: '1.2rem', fontWeight: 800, height: '56px', borderRadius: '18px', border: 'none', background: '#F1F5F9' }}
                  autoFocus
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                type="button" 
                onClick={() => setIsAdding(false)} 
                className="btn-cancel" 
                style={{ flex: 1, height: '54px', borderRadius: '18px', fontWeight: 700, fontSize: '0.9rem' }}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-save" 
                style={{ flex: 1, height: '54px', borderRadius: '18px', fontWeight: 800, fontSize: '0.9rem' }}
              >
                Set Limit
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── GRID ── */}
      <div className="budget-grid" style={{ display: 'grid', gap: '20px' }}>
        {budgets.length === 0 && !isAdding && (
          <div className="empty-state" style={{ 
            padding: '60px 20px', 
            background: 'transparent',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center'
          }}>
            <div className="empty-emoji" style={{ 
              background: '#F5F3FF', 
              color: 'var(--violet)', 
              width: '90px', 
              height: '90px', 
              borderRadius: '24px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 14px' 
            }}>
              <Wallet size={44} />
            </div>
            <p className="empty-title" style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--ink)' }}>No Budgets Yet</p>
            <p className="empty-sub" style={{ maxWidth: '240px', margin: '8px 0 24px', lineHeight: 1.5, color: 'var(--ink-3)' }}>
              Set spending limits for your categories to stay financially healthy.
            </p>
            <button 
              className="btn-save" 
              onClick={() => setIsAdding(true)}
              style={{ padding: '12px 30px', borderRadius: '16px', fontWeight: 800, width: 'fit-content' }}
            >
              Set Your First Budget
            </button>
          </div>
        )}

        {budgets.sort((a,b) => a.category.localeCompare(b.category)).map(budget => {
          const spent = spendingPerCategory[budget.category] || 0;
          const percent = Math.min((spent / budget.limit) * 100, 100);
          const isOver = spent > budget.limit;
          const categoryObj = categories.find(c => c.value === budget.category);
          const Icon = categoryObj?.icon || Target;

          return (
            <div key={budget.id} className="budget-card" style={{
              background: 'white',
              padding: '20px',
              borderRadius: '26px',
              border: '1px solid var(--border)',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: '16px', 
                    background: categoryObj?.bg || '#F3F4F6', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: categoryObj?.color || 'var(--ink-2)'
                  }}>
                    <Icon size={24} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>{categoryObj?.label}</h4>
                    <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--ink-3)', fontWeight: 600 }}>
                      Limit {formatCurrency(budget.limit)}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => deleteBudget(budget.id)}
                  style={{ background: '#FEF2F2', border: 'none', color: '#EF4444', padding: '10px', borderRadius: '12px', height: 'fit-content' }}
                  title="Remove Budget"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.9rem' }}>
                  <span style={{ fontWeight: 800, color: isOver ? '#EF4444' : 'var(--ink)' }}>
                    {formatCurrency(spent)} <span style={{ fontWeight: 500, color: 'var(--ink-3)', fontSize: '0.8rem' }}>spent</span>
                  </span>
                  <span style={{ color: 'var(--ink-3)', fontWeight: 700 }}>{Math.round(percent)}%</span>
                </div>
                <div style={{ 
                  height: '10px', 
                  background: '#F1F5F9', 
                  borderRadius: '5px', 
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${percent}%`, 
                    background: isOver ? 'linear-gradient(90deg, #F87171, #EF4444)' : percent > 85 ? 'linear-gradient(90deg, #FBBF24, #F59E0B)' : 'linear-gradient(90deg, #34D399, #10B981)',
                    borderRadius: '5px',
                    transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
                  }} />
                </div>
              </div>

              <div style={{ 
                padding: '12px 16px', 
                borderRadius: '14px', 
                background: isOver ? '#FEF2F2' : percent > 85 ? '#FFFBEB' : '#F0FDF4',
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                fontSize: '0.8rem', 
                fontWeight: 700,
                color: isOver ? '#DC2626' : percent > 85 ? '#D97706' : '#16A34A'
              }}>
                {isOver ? <AlertTriangle size={16} /> : percent > 85 ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                <span>
                  {isOver 
                    ? `Over budget by ${formatCurrency(spent - budget.limit)}` 
                    : `${formatCurrency(budget.limit - spent)} remaining`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
