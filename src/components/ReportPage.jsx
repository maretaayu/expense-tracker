import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, PieChart } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, formatCurrency } from '../utils/constants.jsx';

export default function ReportPage({ expenses }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [reportType, setReportType] = useState('expense'); // 'expense' or 'income'

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      const d = e.createdAt?.toDate ? e.createdAt.toDate() : new Date(e.date || Date.now());
      return d.getFullYear() === year && d.getMonth() === month && 
             (reportType === 'expense' ? e.type !== 'income' : e.type === 'income');
    });
  }, [expenses, year, month, reportType]);

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
        icon: def?.icon || PieChart,
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

  const monthName = new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(new Date(year, month, 1));
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  // Chart Data: Group by Month for the selected Year
  const yearlyChartData = useMemo(() => {
    const map = {};
    for (let i = 0; i < 12; i++) {
        map[i] = 0;
    }
    
    expenses.forEach((e) => {
      const d = e.createdAt?.toDate ? e.createdAt.toDate() : new Date(e.date || Date.now());
      if (d.getFullYear() === year && (reportType === 'expense' ? e.type !== 'income' : e.type === 'income')) {
          map[d.getMonth()] += Number(e.amount);
      }
    });

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];

    return Object.keys(map).map(m => ({
        monthIndex: Number(m),
        month: monthNames[m],
        value: map[m]
    }));
  }, [expenses, year, reportType]);

  // Calculate insights
  const highestCategory = breakdown.length > 0 ? breakdown[0] : null;

  return (
    <div className="report-page" style={{ paddingBottom: '100px' }}>
      {/* Month Selector */}
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
      </div>

      {/* Type Toggle */}
      <div className="report-type-tabs" style={{ marginBottom: 24 }}>
        <button 
          className={`report-type-tab${reportType === 'expense' ? ' active' : ''}`}
          onClick={() => setReportType('expense')}
        >
          Pengeluaran
        </button>
        <button 
          className={`report-type-tab${reportType === 'income' ? ' active' : ''}`}
          onClick={() => setReportType('income')}
        >
          Pemasukan
        </button>
      </div>

      {/* Monthly Chart */}
      <div style={{ background: 'var(--card)', borderRadius: 'var(--r-2xl)', padding: '24px 16px', marginBottom: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid var(--border)' }}>
        <p style={{fontSize:'1.1rem', fontWeight:800, color:'var(--ink)', letterSpacing:'-0.01em', marginBottom: '24px', paddingLeft: '8px'}}>Perbandingan per Bulan</p>
        <div style={{ width: '100%', height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={yearlyChartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
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
                  yearlyChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={
                        index === month 
                        ? (reportType === 'expense' ? '#334155' : '#16A34A') 
                        : (reportType === 'expense' ? '#F1F5F9' : '#DCFCE7')
                    } />
                  ))
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
          Total {reportType === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
        </p>
        <p style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
          {formatCurrency(total)}
        </p>

        {highestCategory && total > 0 && (
          <div style={{ marginTop: '20px', display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'rgba(255,255,255,0.7)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.5)' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--ink-2)', lineHeight: 1.4 }}>
              Sebagian besar {reportType === 'expense' ? 'pengeluaran' : 'pemasukan'} bulan ini ada di kategori <strong style={{color:'var(--ink)'}}>{highestCategory.label}</strong> ({highestCategory.pct}%).
            </p>
          </div>
        )}
      </div>

      {/* Category List */}
      <div className="report-list-header" style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 16}}>
        <p style={{fontSize:'1.1rem', fontWeight:800, color:'var(--ink)', letterSpacing:'-0.01em'}}>Rincian Kategori</p>
        <p style={{fontSize:'0.85rem', fontWeight:600, color:'var(--ink-3)'}}>{breakdown.length} Kategori</p>
      </div>

      <div className="report-cat-list" style={{display:'flex', flexDirection:'column', gap: 16}}>
        {breakdown.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px 20px', background:'var(--card)', borderRadius:'var(--r-xl)', border:'1px dashed var(--border)' }}>
            <p style={{color:'var(--ink-3)', fontSize:'0.9rem', fontWeight:500}}>
              Belum ada data untuk bulan ini.
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
                  <p style={{fontSize:'0.8rem', fontWeight:600, color:'var(--ink-3)'}}>{item.pct}% dari total</p>
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
