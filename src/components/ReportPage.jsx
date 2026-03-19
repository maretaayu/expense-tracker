import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, PieChart as PieIcon, Download, FileSpreadsheet } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, formatCurrency } from '../utils/constants.jsx';

export default function ReportPage({ expenses }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [reportType, setReportType] = useState('expense'); // 'expense' or 'income'
  const [range, setRange] = useState('monthly'); // 'daily', 'weekly', 'monthly'

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      const d = e.date ? new Date(e.date) : (e.createdAt?.toDate ? e.createdAt.toDate() : new Date());
      const isMatch = reportType === 'expense' ? e.type !== 'income' : e.type === 'income';
      if (!isMatch) return false;

      const dateStr = d.toISOString().split('T')[0];
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      if (range === 'daily') {
        return dateStr === todayStr;
      }
      if (range === 'weekly') {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        startOfWeek.setHours(0,0,0,0);
        return d >= startOfWeek && d <= today;
      }
      return d.getFullYear() === year && d.getMonth() === month;
    });
  }, [expenses, year, month, reportType, range]);

  const total = filtered.reduce((acc, curr) => acc + Number(curr.amount), 0);
  const categoriesDefinition = reportType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  // Breakdown by category
  const breakdown = useMemo(() => {
    const sums = {};
    filtered.forEach((e) => {
      sums[e.category] = (sums[e.category] || 0) + Number(e.amount);
    });

    const arr = Object.keys(sums).map((cat) => {
      const def = categoriesDefinition.find((c) => c.value === cat);
      return {
        cat,
        label: def?.label || cat,
        icon: def?.icon || PieIcon,
        color: def?.color || '#8D61FF',
        bg: def?.bg || '#F0F0F6',
        amount: sums[cat],
        pct: total > 0 ? Math.round((sums[cat] / total) * 100) : 0,
      };
    });
    return arr.sort((a, b) => b.amount - a.amount);
  }, [filtered, total, categoriesDefinition]);

  const changeMonth = (delta) => {
    let m = month + delta;
    let y = year;
    if (m < 0) { m = 11; y--; }
    else if (m > 11) { m = 0; y++; }
    setMonth(m); setYear(y);
  };

  const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(year, month, 1));
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  // Comparison logic
  const { prevTotal, diffPct } = useMemo(() => {
    const today = new Date();
    const isMatch = (e) => reportType === 'expense' ? e.type !== 'income' : e.type === 'income';
    
    let prevFiltered = [];
    if (range === 'daily') {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const yestStr = yesterday.toISOString().split('T')[0];
      prevFiltered = expenses.filter(e => {
        const d = e.date ? new Date(e.date) : (e.createdAt?.toDate ? e.createdAt.toDate() : new Date());
        return d.toISOString().split('T')[0] === yestStr && isMatch(e);
      });
    } else if (range === 'weekly') {
      const startOfPrevWeek = new Date(today);
      startOfPrevWeek.setDate(today.getDate() - today.getDay() - 7);
      const endOfPrevWeek = new Date(startOfPrevWeek);
      endOfPrevWeek.setDate(startOfPrevWeek.getDate() + 6);
      prevFiltered = expenses.filter(e => {
        const d = e.date ? new Date(e.date) : (e.createdAt?.toDate ? e.createdAt.toDate() : new Date());
        return d >= startOfPrevWeek && d <= endOfPrevWeek && isMatch(e);
      });
    } else {
      let prevMonth = month - 1;
      let prevYear = year;
      if (prevMonth < 0) { prevMonth = 11; prevYear--; }
      prevFiltered = expenses.filter(e => {
        const d = e.date ? new Date(e.date) : (e.createdAt?.toDate ? e.createdAt.toDate() : new Date());
        return d.getFullYear() === prevYear && d.getMonth() === prevMonth && isMatch(e);
      });
    }

    const pTotal = prevFiltered.reduce((s, e) => s + Number(e.amount), 0);
    const diff = total - pTotal;
    const dPct = pTotal > 0 ? Math.round((diff / pTotal) * 100) : (total > 0 ? 100 : 0);
    return { prevTotal: pTotal, diffPct: dPct };
  }, [expenses, range, reportType, total, month, year]);

  const exportToCSV = () => {
    const headers = ['Date', 'Title', 'Category', 'Amount', 'Type', 'Note'];
    const rows = filtered.map(e => [
      e.date || (e.createdAt?.toDate ? e.createdAt.toDate().toISOString().split('T')[0] : ''),
      `"${e.title.replace(/"/g, '""')}"`,
      e.category,
      e.amount,
      e.type,
      `"${(e.note || '').replace(/"/g, '""')}"`
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `expense_report_${year}_${month + 1}.csv`);
    link.click();
  };

  const chartData = useMemo(() => {
    if (range === 'monthly') {
      const map = {};
      for (let i = 0; i < 12; i++) map[i] = 0;
      expenses.forEach((e) => {
        const d = e.date ? new Date(e.date) : (e.createdAt?.toDate ? e.createdAt.toDate() : new Date());
        if (d.getFullYear() === year && (reportType === 'expense' ? e.type !== 'income' : e.type === 'income')) {
          map[d.getMonth()] += Number(e.amount);
        }
      });
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return Object.keys(map).map(m => ({ monthIndex: Number(m), month: monthNames[m], value: map[m] }));
    }
    
    if (range === 'weekly') {
      const weeks = { 'W1': 0, 'W2': 0, 'W3': 0, 'W4': 0, 'W5': 0 };
      
      expenses.forEach(e => {
        const d = e.date ? new Date(e.date) : (e.createdAt?.toDate ? e.createdAt.toDate() : new Date());
        const isMatch = reportType === 'expense' ? e.type !== 'income' : e.type === 'income';
        
        if (d.getFullYear() === year && d.getMonth() === month && isMatch) {
          const dayOfMonth = d.getDate();
          let weekKey;
          if (dayOfMonth <= 7) weekKey = 'W1';
          else if (dayOfMonth <= 14) weekKey = 'W2';
          else if (dayOfMonth <= 21) weekKey = 'W3';
          else if (dayOfMonth <= 28) weekKey = 'W4';
          else weekKey = 'W5';
          
          weeks[weekKey] += Number(e.amount);
        }
      });
      
      return Object.keys(weeks).map(key => ({ month: key, value: weeks[key] }));
    }
    
    // Default / Daily: Show last 7 days specifically
    const last7Days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      last7Days.push({
        date: d.toISOString().split('T')[0],
        label: d.getDate().toString(),
        value: 0
      });
    }

    expenses.forEach(e => {
      const d = e.date ? new Date(e.date) : (e.createdAt?.toDate ? e.createdAt.toDate() : new Date());
      const isMatch = reportType === 'expense' ? e.type !== 'income' : e.type === 'income';
      if (isMatch) {
        const dateStr = d.toISOString().split('T')[0];
        const found = last7Days.find(day => day.date === dateStr);
        if (found) found.value += Number(e.amount);
      }
    });

    return last7Days.map(d => ({ month: d.label, value: d.value, fullDate: d.date }));
  }, [expenses, filtered, range, reportType, year, total, prevTotal]);

  // Calculate insights
  const highestCategory = breakdown.length > 0 ? breakdown[0] : null;

  return (
    <div className="report-page" style={{ paddingBottom: '100px' }}>

      {/* Month Selector (only for monthly) */}
      {range === 'monthly' && (
        <div className="month-selector" style={{ padding: '0 4px', boxShadow:'none', background:'none', marginBottom: 16 }}>
          <button className="month-nav-btn" onClick={() => changeMonth(-1)}>
            <ChevronLeft size={18} />
          </button>
          <div className="month-label">
            <p className="month-name">{monthName} <span style={{fontWeight:500, color:'var(--ink-3)'}}>{year}</span></p>
          </div>
          <button className="month-nav-btn" onClick={() => changeMonth(1)} disabled={isCurrentMonth} style={{ opacity: isCurrentMonth ? 0.3 : 1 }}>
            <ChevronRight size={18} />
          </button>
          
          <button 
            onClick={exportToCSV}
            style={{ 
              marginLeft: 'auto', background: 'white', border: '1px solid var(--border)', 
              padding: '8px 12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '6px',
              fontSize: '0.75rem', fontWeight: 700, color: 'var(--ink-2)', cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}
          >
            <FileSpreadsheet size={16} color="#16A34A" />
            Export
          </button>
        </div>
      )}

      {/* Type Toggle */}
      <div className="report-type-tabs" style={{ marginBottom: 24 }}>
        <button 
          className={`report-type-tab${reportType === 'expense' ? ' active' : ''}`}
          onClick={() => setReportType('expense')}
        >
          Expenses
        </button>
        <button 
          className={`report-type-tab${reportType === 'income' ? ' active' : ''}`}
          onClick={() => setReportType('income')}
        >
          Income
        </button>
      </div>

      {/* Chart */}
      <div style={{ background: 'var(--card)', borderRadius: 'var(--r-2xl)', padding: '24px 16px', marginBottom: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', padding: '0 8px' }}>
          <p style={{fontSize:'1.1rem', fontWeight:800, color:'var(--ink)', letterSpacing:'-0.01em', margin:0}}>
            {range === 'monthly' ? 'Monthly Comparison' : range === 'weekly' ? 'Daily Spending' : 'Spending Analysis'}
          </p>
          
          <div style={{ display: 'flex', gap: '4px', background: 'var(--bg)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border)' }}>
            {['daily', 'weekly', 'monthly'].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                style={{
                  padding: '6px 12px', borderRadius: '8px', border: 'none',
                  background: range === r ? 'white' : 'transparent',
                  color: range === r ? 'var(--violet)' : 'var(--ink-3)',
                  fontSize: '0.7rem', fontWeight: 800, textTransform: 'capitalize',
                  cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: range === r ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                {r === 'monthly' ? 'M' : r === 'weekly' ? 'W' : 'D'}
              </button>
            ))}
          </div>
        </div>
        <div style={{ width: '100%', height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--ink-3)', fontWeight: 600 }} dy={10} />
              <Tooltip 
                cursor={{ fill: 'var(--muted)', opacity: 0.5, radius: 8 }}
                formatter={(val) => [formatCurrency(val), 'Total']}
                labelStyle={{ fontWeight: 700, color: 'var(--ink)' }}
                contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--sh)', padding: '10px 14px' }}
                itemStyle={{ color: reportType === 'expense' ? '#334155' : '#16A34A', fontWeight: 800, marginTop: 4 }}
              />
              <Bar dataKey="value" radius={[6, 6, 6, 6]} barSize={20}>
                {
                  chartData.map((entry, index) => {
                    let isHighlighted = false;
                    const today = new Date();
                    
                    if (range === 'monthly') {
                      isHighlighted = index === month;
                    } else if (range === 'weekly') {
                      const today = new Date();
                      const dayOfMonth = today.getDate();
                      let currentWeek;
                      if (dayOfMonth <= 7) currentWeek = 0;
                      else if (dayOfMonth <= 14) currentWeek = 1;
                      else if (dayOfMonth <= 21) currentWeek = 2;
                      else if (dayOfMonth <= 28) currentWeek = 3;
                      else currentWeek = 4;
                      isHighlighted = index === currentWeek && isCurrentMonth;
                    } else {
                      // Daily: check if fullDate is today
                      isHighlighted = entry.fullDate === today.toISOString().split('T')[0];
                    }

                    return (
                      <Cell key={`cell-${index}`} fill={
                        isHighlighted 
                          ? (reportType === 'expense' ? '#334155' : '#16A34A') 
                          : (reportType === 'expense' ? '#F1F5F9' : '#DCFCE7')
                      } />
                    );
                  })
                }
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Insight Summary Card */}
      <div style={{
        background: reportType === 'expense' ? 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)' : 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
        borderRadius: 'var(--r-2xl)',
        padding: '24px',
        marginBottom: '32px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        border: `1px solid ${reportType === 'expense' ? '#E2E8F0' : '#BBF7D0'}`,
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative background element */}
        <div style={{
          position: 'absolute', top: -20, right: -20,
          width: 100, height: 100, borderRadius: '50%',
          background: reportType === 'expense' ? '#94A3B8' : '#86EFAC',
          opacity: 0.15, filter: 'blur(20px)'
        }} />

        <p style={{ fontSize: '0.85rem', fontWeight: 600, color: reportType === 'expense' ? '#334155' : '#16A34A', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '8px' }}>
          Total {range} {reportType === 'expense' ? 'Expenses' : 'Income'}
        </p>
        <p style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
          {formatCurrency(total)}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
          <span style={{ 
            fontSize: '0.85rem', fontWeight: 700, 
            color: diffPct > 0 ? '#EF4444' : '#16A34A',
            background: diffPct > 0 ? '#FEF2F2' : '#F0FDF4',
            padding: '2px 10px', borderRadius: '20px',
            display: 'inline-flex', alignItems: 'center', gap: '4px'
          }}>
            {diffPct > 0 ? '↗' : '↘'} {Math.abs(diffPct)}%
          </span>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-3)' }}>
            vs last {range === 'daily' ? 'day' : range === 'weekly' ? 'week' : 'month'}
          </span>
        </div>

        {highestCategory && total > 0 && (
          <div style={{ marginTop: '20px', display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'rgba(255,255,255,0.7)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.5)' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--ink-2)', lineHeight: 1.4 }}>
              Most of your {reportType === 'expense' ? 'expenses' : 'income'} this {range === 'daily' ? 'day' : range === 'weekly' ? 'week' : 'month'} is in the <strong style={{color:'var(--ink)'}}>{highestCategory.label}</strong> category ({highestCategory.pct}%).
            </p>
          </div>
        )}
      </div>

      {/* ── DOUGHNUT CHART ── */}
      {breakdown.length > 0 && (
        <div style={{ 
          background: 'var(--card)', borderRadius: 'var(--r-2xl)', padding: '24px 16px', 
          marginBottom: '32px', border: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative'
        }}>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={breakdown}
                  dataKey="amount"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={90}
                  paddingAngle={6}
                  stroke="none"
                >
                  {breakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(val) => formatCurrency(val)}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--sh-lg)', fontSize: '0.8rem', fontWeight: 700 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Legend / Overlay text */}
          <div style={{ 
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -15%)', 
            textAlign: 'center', pointerEvents: 'none' 
          }}>
            <p style={{ fontSize: '0.65rem', color: 'var(--ink-3)', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total {reportType}
            </p>
            <p style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--ink)', margin: '2px 0 0' }}>
              {formatCurrency(total)}
            </p>
          </div>
        </div>
      )}

      {/* Category List */}
      <div className="report-list-header" style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 16}}>
        <p style={{fontSize:'1.1rem', fontWeight:800, color:'var(--ink)', letterSpacing:'-0.01em'}}>Category Breakdown</p>
        <p style={{fontSize:'0.85rem', fontWeight:600, color:'var(--ink-3)'}}>{breakdown.length} Categories</p>
      </div>

      <div className="report-cat-list" style={{display:'flex', flexDirection:'column', gap: 16}}>
        {breakdown.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px 20px', background:'var(--card)', borderRadius:'var(--r-xl)', border:'1px dashed var(--border)' }}>
            <p style={{color:'var(--ink-3)', fontSize:'0.9rem', fontWeight:500}}>
              No data for this month.
            </p>
          </div>
        ) : breakdown.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.cat} className="report-cat-item" style={{
              background:'var(--card)', borderRadius:'var(--r-xl)', padding:'20px',
              border:'1px solid var(--border)', boxShadow:'0 2px 10px rgba(0,0,0,0.02)',
              display: 'flex', flexDirection: 'column', gap: '14px'
            }}>
              <div style={{display:'flex', alignItems:'center', gap: 16}}>
                <div style={{width: 46, height: 46, borderRadius: '14px', background: item.bg, color: item.color, display:'flex', alignItems:'center', justifyContent:'center'}}>
                   <Icon size={22} strokeWidth={2.5}/>
                </div>
                <div style={{flex: 1}}>
                  <p style={{fontSize:'0.95rem', fontWeight:800, color:'var(--ink)', marginBottom: 2}}>{item.label}</p>
                  <p style={{fontSize:'0.8rem', fontWeight:600, color:'var(--ink-3)'}}>{item.pct}% of total</p>
                </div>
                <div style={{textAlign:'right'}}>
                  <p style={{fontSize:'1.05rem', fontWeight:800, color:'var(--ink)', letterSpacing:'-0.01em'}}>{formatCurrency(item.amount)}</p>
                </div>
              </div>
              <div className="cat-bar-track" style={{ height: 8, background: 'var(--muted)', borderRadius: 100, overflow: 'hidden' }}>
                <div className="cat-bar-fill" style={{ height: '100%', width: `${item.pct}%`, background: item.color, borderRadius: 100, transition: 'width 0.5s ease-out' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
