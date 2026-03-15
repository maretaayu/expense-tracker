import { Trash2, MessageSquare } from 'lucide-react';
import { getCategoryByValue, formatCurrency, formatDate } from '../utils/constants.jsx';

export default function ExpenseCard({ expense, category, onEdit, onDelete }) {
  const cat = category || getCategoryByValue(expense.category);
  const Icon = cat.icon;
  const isIncome = expense.type === 'income';

  return (
    <div className="expense-card" onClick={() => onEdit(expense)}>
      {/* Category badge */}
      <div className="cat-badge" style={{ background: cat.bg, color: cat.color }}>
        <Icon size={21} strokeWidth={2} />
      </div>

      {/* Body */}
      <div className="card-body">
        <p className="card-title">{expense.title}</p>
        <div className="card-tags">
          <span className="card-tag">{cat.label}</span>
          {expense.note && <span className="card-tag">{expense.note.slice(0,16)}</span>}
        </div>
      </div>

      {/* Right: amount + date */}
      <div className="card-right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
        <p className="card-amount" style={{ color: 'var(--ink)' }}>
          {isIncome ? '+' : '-'}{formatCurrency(expense.amount)}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
          <p className="card-balance" style={{ margin: 0 }}>{formatDate(expense.createdAt || expense.date)}</p>
          <button
            className="delete-btn"
            style={{ margin: 0, padding: '4px', display: 'flex' }}
            title="Delete transaction"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm('Delete this transaction?')) onDelete(expense.id);
            }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
