import { useState, useEffect } from 'react';
import { ArrowDownLeft, ArrowUpRight, X, Save, DollarSign, Calendar, Type, ToggleLeft, ToggleRight } from 'lucide-react';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../utils/constants.jsx';

const today = new Date().toISOString().split('T')[0];
const defaultForm = { title: '', amount: '', category: 'food', date: today, note: '', type: 'expense' };

export default function ExpenseModal({ isOpen, onClose, onSave, expense }) {
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (expense) {
      setForm({
        title: expense.title || '',
        amount: expense.amount || '',
        category: expense.category || 'food',
        date: expense.date || today,
        note: expense.note || '',
        type: expense.type || 'expense',
      });
    } else {
      setForm(defaultForm);
    }
  }, [expense, isOpen]);

  if (!isOpen) return null;

  const isExpense = form.type === 'expense';
  const cats = isExpense ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  // Auto-select first category of that type when toggling
  const handleTypeToggle = (newType) => {
    const defaultCat = newType === 'expense' ? 'food' : 'salary';
    setForm({ ...form, type: newType, category: defaultCat });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.amount) return;
    setSaving(true);
    await onSave({ ...form, amount: Number(form.amount) });
    setSaving(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-head">
          <div>
            <div className="modal-icon-ring" style={{
              background: isExpense ? '#F1F5F9' : '#F0FDF4',
              color: isExpense ? '#475569' : '#16A34A',
            }}>
              {isExpense
                ? <ArrowUpRight size={24} strokeWidth={2.5} />
                : <ArrowDownLeft size={24} strokeWidth={2.5} />
              }
            </div>
            <p className="modal-title">{expense ? 'Edit' : 'Add'} Transaction</p>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Type toggle */}
        <div className="type-toggle">
          <button
            type="button"
            className={`type-btn${isExpense ? ' active-expense' : ''}`}
            onClick={() => handleTypeToggle('expense')}
          >
            <ArrowUpRight size={16} /> Expense
          </button>
          <button
            type="button"
            className={`type-btn${!isExpense ? ' active-income' : ''}`}
            onClick={() => handleTypeToggle('income')}
          >
            <ArrowDownLeft size={16} /> Income
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="f-group">
            <label className="f-label"><Type size={13} /> Title</label>
            <input
              className="f-input"
              type="text"
              placeholder={isExpense ? 'e.g. Lunch' : 'e.g. Monthly salary'}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>

          <div className="f-row">
            <div className="f-group">
              <label className="f-label"><DollarSign size={13} /> Amount (IDR)</label>
              <input
                className="f-input"
                type="number"
                placeholder="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </div>
            <div className="f-group">
              <label className="f-label"><Calendar size={13} /> Date</label>
              <input
                className="f-input"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="f-group">
            <label className="f-label">Category</label>
            <div className="cat-grid">
              {cats.map((cat) => {
                const Icon = cat.icon;
                const selected = form.category === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    className={`cat-option${selected ? ' selected' : ''}`}
                    style={{ '--cat-color': cat.color }}
                    onClick={() => setForm({ ...form, category: cat.value })}
                  >
                    <span className="cat-option-icon" style={{
                      background: selected ? cat.bg : 'var(--raised)',
                      color: selected ? cat.color : 'var(--ink-3)',
                    }}>
                      <Icon size={17} strokeWidth={2} />
                    </span>
                    <span className="cat-option-label">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="f-group">
            <label className="f-label">Note (Optional)</label>
            <textarea
              className="f-input f-textarea"
              placeholder="Add details…"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              rows={2}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-save" disabled={saving}
              style={{ background: isExpense ? '#334155' : '#16A34A' }}
            >
              <Save size={16} />
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
