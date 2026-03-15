import { Info, HandCoins, Wallet } from 'lucide-react';
import { formatCurrency } from '../utils/constants.jsx';

export default function SummarySection({ totalIncome, totalExpense, onDetail }) {
  return (
    <div className="money-card">
      <div className="money-card-header">
        <p className="money-card-title">Your Balance <Info size={14} color="var(--ink-3)" /></p>
        <button className="money-card-action" onClick={onDetail}>Detail <span>›</span></button>
      </div>

      <div className="money-cols">
        {/* Income */}
        <div className="money-col">
          <div className="money-icon" style={{ background: '#F0FDF4', color: '#16A34A' }}>
            <HandCoins size={18} strokeWidth={2.5} />
          </div>
          <div className="money-col-body">
            <p className="money-col-label">Income <Info size={12} color="var(--ink-3)" /></p>
            <p className="money-col-value">{formatCurrency(totalIncome)}</p>
          </div>
        </div>

        {/* Expense */}
        <div className="money-col">
          <div className="money-icon" style={{ background: '#FEF2F2', color: '#EF4444' }}>
            <Wallet size={18} strokeWidth={2.5} />
          </div>
          <div className="money-col-body">
            <p className="money-col-label">Expenses <Info size={12} color="var(--ink-3)" /></p>
            <p className="money-col-value">{formatCurrency(totalExpense)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
