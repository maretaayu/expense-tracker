import { useState, useMemo } from 'react';
import { 
  ChevronLeft, Search, Share2, ArrowUpRight, ArrowDownRight, 
  Download, FileSpreadsheet, PieChart as PieIcon 
} from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, formatCurrency } from '../utils/constants.jsx';

export default function ReportPage({ expenses, budgets }) {
  const [timeRange, setTimeRange] = useState('6 Months'); // 'Week', 'Month', '6 Months', 'Year'
  const [showPie, setShowPie] = useState(false);

  const ranges = ['Week', 'Month', '6 Months', 'Year'];

  // Calculate generic stats for the selected range
  const { total, incomeTotal, expenseTotal, chartData, breakdown } = useMemo(() => {
    const now = new Date();
    let filteredItems = [];
    let labels = [];
    
    if (timeRange === 'Week') {
      const start = new Date();
      start.setDate(now.getDate() - 7);
      filteredItems = expenses.filter(e => {
        const d = e.date ? new Date(e.date) : (e.createdAt?.toDate ? e.createdAt.toDate() : new Date());
        return d >= start;
      });
      // Daily labels for last 7 days
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(now.getDate() - i);
        labels.push({ name: d.toLocaleDateString('en-US', { weekday: 'short' }), dateStr: d.toDateString() });
      }
    } else if (timeRange === '6 Months') {
      const start = new Date();
      start.setMonth(now.getMonth() - 5);
      start.setDate(1);
      filteredItems = expenses.filter(e => {
        const d = e.date ? new Date(e.date) : (e.createdAt?.toDate ? e.createdAt.toDate() : new Date());
        return d >= start;
      });
      // Last 6 month labels
      for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(now.getMonth() - i);
        labels.push({ name: d.toLocaleDateString('en-US', { month: 'short' }), month: d.getMonth(), year: d.getFullYear() });
      }
    } else if (timeRange === 'Month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      filteredItems = expenses.filter(e => {
        const d = e.date ? new Date(e.date) : (e.createdAt?.toDate ? e.createdAt.toDate() : new Date());
        return d >= start;
      });
      // Weekly labels for current month
      labels = [{name: 'W1'}, {name: 'W2'}, {name: 'W3'}, {name: 'W4'}, {name: 'W5'}];
    } else {
      // Year
      const start = new Date(now.getFullYear(), 0, 1);
      filteredItems = expenses.filter(e => {
        const d = e.date ? new Date(e.date) : (e.createdAt?.toDate ? e.createdAt.toDate() : new Date());
        return d >= start;
      });
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), i, 1);
        labels.push({ name: d.toLocaleDateString('en-US', { month: 'short' }), month: i });
      }
    }

    const income = filteredItems.filter(e => e.type === 'income').reduce((s, e) => s + Number(e.amount), 0);
    const expense = filteredItems.filter(e => e.type !== 'income').reduce((s, e) => s + Number(e.amount), 0);

    // Prepare chart data
    const data = labels.map(label => {
      let val = 0;
      if (timeRange === '6 Months' || timeRange === 'Year') {
        val = filteredItems.filter(e => {
          const d = e.date ? new Date(e.date) : (e.createdAt?.toDate ? e.createdAt.toDate() : new Date());
          return d.getMonth() === label.month && (timeRange === 'Year' || d.getFullYear() === label.year) && e.type !== 'income';
        }).reduce((s, e) => s + Number(e.amount), 0);
      } else if (timeRange === 'Week') {
        val = filteredItems.filter(e => {
          const d = e.date ? new Date(e.date) : (e.createdAt?.toDate ? e.createdAt.toDate() : new Date());
          return d.toDateString() === label.dateStr && e.type !== 'income';
        }).reduce((s, e) => s + Number(e.amount), 0);
      } else {
        // Month breakdown by weeks (simplified)
        const weekIdx = parseInt(label.name.slice(1)) - 1;
        val = filteredItems.filter(e => {
          const d = e.date ? new Date(e.date) : (e.createdAt?.toDate ? e.createdAt.toDate() : new Date());
          const week = Math.floor((d.getDate() - 1) / 7);
          return week === weekIdx && e.type !== 'income';
        }).reduce((s, e) => s + Number(e.amount), 0);
      }
      return { name: label.name, val, isCurrent: label.name === now.toLocaleDateString('en-US', { month: 'short' }) || label.name === now.toLocaleDateString('en-US', { weekday: 'short' }) };
    });

    // Breakdown for category list
    const catSums = {};
    filteredItems.filter(e => e.type !== 'income').forEach(e => {
      catSums[e.category] = (catSums[e.category] || 0) + Number(e.amount);
    });
    const brk = Object.keys(catSums).map(c => {
      const def = EXPENSE_CATEGORIES.find(x => x.value === c);
      const budget = budgets?.find(b => b.category === c);
      return { 
        id: c,
        label: def?.label || c,
        icon: def?.icon || PieIcon,
        color: def?.color || '#8D61FF',
        bg: def?.bg || '#F0F0F6',
        amount: catSums[c],
        budget: budget?.limit || 0
      };
    }).sort((a, b) => b.amount - a.amount);

    return { total: expense, incomeTotal: income, expenseTotal: expense, chartData: data, breakdown: brk };
  }, [expenses, timeRange, budgets]);

  const exportToCSV = () => {
    const headers = ['Date', 'Title', 'Category', 'Amount', 'Type', 'Note'];
    const rows = expenses.map(e => [
      e.date || '',
      `"${e.title}"`,
      e.category,
      e.amount,
      e.type,
      `"${e.note || ''}"`
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'analytics_report.csv'; a.click();
  };

  return (
    <div className="analytics-page" style={{ paddingBottom: '100px' }}>
      {/* Content area - starting with white sheet logic */}
      <div style={{ padding: '0 24px 24px' }}>
        
        {/* Time Filters */}
        <div style={{ display: 'flex', background: '#F1F5F9', padding: '4px', borderRadius: '100px', marginBottom: '32px' }}>
          {ranges.map(r => (
            <button 
              key={r}
              onClick={() => setTimeRange(r)}
              style={{
                flex: 1, padding: '10px 0', borderRadius: '100px', border: 'none',
                background: timeRange === r ? '#111' : 'transparent',
                color: timeRange === r ? 'white' : '#64748B',
                fontSize: '0.8rem', fontWeight: 700, transition: '0.2s'
              }}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Total Amount Focus */}
        <div style={{ marginBottom: '32px' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#94A3B8', fontWeight: 600 }}>Total amount - Past {timeRange}</p>
          <h2 style={{ margin: '4px 0 0', fontSize: '2.4rem', fontWeight: 900, color: '#111' }}>{formatCurrency(total)}</h2>
        </div>

        {/* Bar Chart */}
        <div style={{ width: '100%', height: 200, marginBottom: '32px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 600 }} dy={10} />
              <Bar dataKey="val" radius={[8, 8, 8, 8]} barSize={34}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.isCurrent ? '#111' : '#E0E7FF'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Mini Cards */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '40px' }}>
          <div style={{ flex: 1, background: '#F8FAFC', padding: '16px', borderRadius: '20px', border: '1px solid #F1F5F9' }}>
            <p style={{ margin: 0, fontSize: '0.7rem', color: '#94A3B8', fontWeight: 700 }}>Income in {timeRange}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
              <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#111' }}>{formatCurrency(incomeTotal)}</p>
              <ArrowUpRight size={18} color="#16A34A" />
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.65rem', color: '#16A34A', fontWeight: 700 }}>+12.8% increase</p>
          </div>
          <div style={{ flex: 1, background: '#F8FAFC', padding: '16px', borderRadius: '20px', border: '1px solid #F1F5F9' }}>
            <p style={{ margin: 0, fontSize: '0.7rem', color: '#94A3B8', fontWeight: 700 }}>Expense in {timeRange}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
              <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#111' }}>{formatCurrency(expenseTotal)}</p>
              <ArrowDownRight size={18} color="#EF4444" />
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.65rem', color: '#EF4444', fontWeight: 700 }}>-8.2% decrease</p>
          </div>
        </div>

        {/* Spent on List */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#111' }}>Spent on</h3>
          <button style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '0.85rem', fontWeight: 600 }}>see all</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {breakdown.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#94A3B8', padding: '20px' }}>No spending yet for this period.</p>
          ) : (
            breakdown.map(item => {
              const Icon = item.icon;
              return (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '16px', background: item.bg, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={24} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#111' }}>{item.label}</p>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#94A3B8', fontWeight: 500 }}>
                      {item.budget > 0 ? `Monthly budget - ${formatCurrency(item.budget)}` : 'No budget set'}
                    </p>
                  </div>
                  <p style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#EF4444' }}>-{formatCurrency(item.amount)}</p>
                </div>
              );
            })
          )}
        </div>

        {/* Keep Pie Chart and Export CSV as requested */}
        <div style={{ marginTop: '48px', paddingTop: '32px', borderTop: '1px dashed #E2E8F0' }}>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <button 
              onClick={() => setShowPie(!showPie)}
              style={{ 
                flex: 1, padding: '14px', borderRadius: '16px', border: '1px solid #E2E8F0',
                background: 'white', color: '#111', fontSize: '0.85rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              <PieIcon size={18} /> {showPie ? 'Hide Pie' : 'Show Breakdown Pie'}
            </button>
            <button 
              onClick={exportToCSV}
              style={{ 
                flex: 1, padding: '14px', borderRadius: '16px', border: '1px solid #E2E8F0',
                background: 'white', color: '#16A34A', fontSize: '0.85rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              <FileSpreadsheet size={18} /> Export CSV
            </button>
          </div>

          {showPie && breakdown.length > 0 && (
            <div style={{ width: '100%', height: 240, background: '#F8FAFC', borderRadius: '24px', padding: '20px' }}>
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={breakdown}
                      dataKey="amount"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                    >
                      {breakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val) => formatCurrency(val)} />
                  </PieChart>
               </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
