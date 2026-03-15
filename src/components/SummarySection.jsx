import { Info, HandCoins, Wallet } from 'lucide-react';
import { formatCurrency } from '../utils/constants.jsx';

export default function SummarySection({ totalIncome, totalExpense, onDetail }) {
  return (
    <div className="money-card">
      <div className="money-card-header">
        <p className="money-card-title">Keuanganmu <Info size={14} color="var(--ink-3)" /></p>
        <button className="money-card-action" onClick={onDetail}>Detail <span>›</span></button>
      </div>

      <div className="money-cols">
        {/* Income */}
        <div className="money-col">
          <div className="money-icon" style={{ background: '#E0F2FE', color: '#0284C7' }}>
            <HandCoins size={18} strokeWidth={2.5} />
          </div>
          <div className="money-col-body">
            <p className="money-col-label">Pemasukan <Info size={12} color="var(--ink-3)" /></p>
            <p className="money-col-value">{formatCurrency(totalIncome)}</p>
          </div>
        </div>

        {/* Expense */}
        <div className="money-col">
          <div className="money-icon" style={{ background: '#FEE2E2', color: '#DC2626' }}>
            <Wallet size={18} strokeWidth={2.5} />
          </div>
          <div className="money-col-body">
            <p className="money-col-label">Pengeluaran <Info size={12} color="var(--ink-3)" /></p>
            <p className="money-col-value">{formatCurrency(totalExpense)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
