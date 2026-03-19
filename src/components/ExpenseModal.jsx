import { useState, useEffect, useRef } from 'react';
import { ArrowDownLeft, ArrowUpRight, X, Save, DollarSign, Calendar, Type, Camera, Sparkles, AlertCircle, CheckCircle2, ImagePlus, Plus } from 'lucide-react';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../utils/constants.jsx';
import { parseReceiptWithGemini } from '../utils/geminiOcr.js';

const today = new Date().toISOString().split('T')[0];
const defaultForm = { title: '', amount: '', category: 'food', date: today, note: '', type: 'expense' };

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export default function ExpenseModal({ isOpen, onClose, onSave, expense, autoScan, customCategories = [], onAddCategory }) {
  const [form, setForm] = useState(defaultForm);
  const [newCatName, setNewCatName] = useState('');
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState(null); // null | 'success' | 'error'
  const [previewUrl, setPreviewUrl] = useState(null);
  const [scanError, setScanError] = useState('');
  const fileInputRef = useRef(null);

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
    setScanStatus(null);
    setPreviewUrl(null);
    setScanError('');

    // If autoScan is true and we're not editing, trigger file input
    if (isOpen && autoScan && !expense && fileInputRef.current) {
      setTimeout(() => {
        fileInputRef.current.click();
      }, 100);
    }
  }, [expense, isOpen, autoScan]);

  if (!isOpen) return null;

  const isExpense = form.type === 'expense';
  const cats = isExpense ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const handleTypeToggle = (newType) => {
    const defaultCat = newType === 'expense' ? 'food' : 'salary';
    setForm({ ...form, type: newType, category: defaultCat });
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    await onAddCategory(newCatName);
    setForm({ ...form, category: newCatName.toLowerCase().replace(/\s+/g, '_') });
    setNewCatName('');
    setIsAddingCat(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.amount) return;
    setSaving(true);
    await onSave({ ...form, amount: Number(form.amount) });
    setSaving(false);
    onClose();
  };

  const handleReceiptUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setScanning(true);
    setScanStatus(null);
    setScanError('');

    if (!GEMINI_API_KEY || GEMINI_API_KEY.includes('your_')) {
      setScanError('API Key belum terpasang di sistem.');
      setScanStatus('error');
      setScanning(false);
      return;
    }

    try {
      const parsed = await parseReceiptWithGemini(file, GEMINI_API_KEY);
      setForm((prev) => ({
        ...prev,
        ...parsed,
        type: 'expense',
      }));
      setScanStatus('success');
    } catch (err) {
      console.error('Receipt scan error:', err);
      setScanError(err.message || 'Gagal menghubungi AI.');
      setScanStatus('error');
    } finally {
      setScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-head">
          <div>
            <div className="modal-icon-ring" style={{
              background: isExpense ? '#FEF2F2' : '#F0FDF4',
              color: isExpense ? '#EF4444' : '#16A34A',
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

        {/* ── RECEIPT SCANNER ── */}
        {!expense && (
          <div style={{ marginBottom: 18 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleReceiptUpload}
              id="receipt-upload"
            />

            {/* Scan button (shown when no preview) */}
            {!previewUrl && !scanning && (
              <label
                htmlFor="receipt-upload"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  padding: '14px 20px',
                  borderRadius: 16,
                  border: '1.5px dashed var(--border)',
                  background: 'var(--muted)',
                  cursor: 'pointer',
                  transition: 'all .18s',
                  color: 'var(--ink-2)',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--violet)';
                  e.currentTarget.style.background = 'rgba(141,97,255,0.06)';
                  e.currentTarget.style.color = 'var(--violet)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.background = 'var(--muted)';
                  e.currentTarget.style.color = 'var(--ink-2)';
                }}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: 'rgba(141,97,255,0.1)', color: 'var(--violet)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Camera size={18} />
                </div>
                Scan Receipt / Upload Struk
                <Sparkles size={14} style={{ color: 'var(--violet)', marginLeft: 'auto' }} />
              </label>
            )}

            {/* Scanning state */}
            {scanning && (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 12, padding: '20px',
                borderRadius: 16, background: 'rgba(141,97,255,0.05)',
                border: '1.5px solid rgba(141,97,255,0.2)',
              }}>
                {previewUrl && (
                  <img
                    src={previewUrl} alt="Receipt preview"
                    style={{ width: '100%', maxHeight: 140, objectFit: 'contain', borderRadius: 10, opacity: 0.85 }}
                  />
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--violet)' }}>
                  <div className="spinner-sm" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>AI sedang membaca struk kamu…</span>
                </div>
              </div>
            )}

            {/* Preview + status (after scan) */}
            {!scanning && previewUrl && (
              <div style={{
                borderRadius: 16,
                border: `1.5px solid ${scanStatus === 'success' ? '#BBF7D0' : scanStatus === 'error' ? '#FECACA' : 'var(--border)'}`,
                overflow: 'hidden',
                background: scanStatus === 'success' ? '#F0FDF4' : scanStatus === 'error' ? '#FEF2F2' : 'var(--muted)',
              }}>
                <img
                  src={previewUrl} alt="Receipt"
                  style={{ width: '100%', maxHeight: 130, objectFit: 'contain', display: 'block', padding: '10px' }}
                />
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderTop: '1px solid rgba(0,0,0,0.04)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    {scanStatus === 'success' ? (
                      <>
                        <CheckCircle2 size={15} color="#16A34A" />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#16A34A' }}>Struk berhasil dibaca!</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={15} color="#EF4444" />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#EF4444' }}>
                          {scanError || 'Gagal membaca. Isi manual ya.'}
                        </span>
                      </>
                    )}
                  </div>
                  <label
                    htmlFor="receipt-upload"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      fontSize: '0.75rem', fontWeight: 700,
                      color: 'var(--ink-2)', cursor: 'pointer',
                      padding: '4px 10px', borderRadius: 8,
                      background: 'var(--muted)',
                    }}
                  >
                    <ImagePlus size={13} /> Ganti
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

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
              <div style={{ position: 'relative' }}>
                <span style={{ 
                  position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', 
                  fontWeight: 800, color: 'var(--ink-2)', fontSize: '0.85rem' 
                }}>
                  Rp
                </span>
                <input
                  className="f-input"
                  style={{ paddingLeft: '40px' }}
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={form.amount ? Number(form.amount).toLocaleString('id-ID') : ''}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setForm({ ...form, amount: val });
                  }}
                  required
                />
              </div>
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
            <label className="f-label">
              Category
              {scanStatus === 'success' && (
                <span style={{
                  marginLeft: 8, fontSize: '0.62rem', fontWeight: 700,
                  background: 'rgba(141,97,255,0.12)', color: 'var(--violet)',
                  padding: '2px 7px', borderRadius: 20,
                  display: 'inline-flex', alignItems: 'center', gap: 3
                }}>
                  <Sparkles size={9} /> AI picked
                </span>
              )}
            </label>
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
                      <Icon size={17} strokeWidth={2.5} />
                    </span>
                    <span className="cat-option-label">{cat.label}</span>
                  </button>
                );
              })}

              {isExpense && customCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`cat-option${form.category === cat.value ? ' selected' : ''}`}
                  style={{ '--cat-color': '#64748B' }}
                  onClick={() => setForm({ ...form, category: cat.value })}
                >
                  <span className="cat-option-icon" style={{
                    background: form.category === cat.value ? '#F8FAFC' : 'var(--raised)',
                    color: form.category === cat.value ? '#64748B' : 'var(--ink-3)',
                  }}>
                    <cat.icon size={17} strokeWidth={2.5} />
                  </span>
                  <span className="cat-option-label">{cat.label}</span>
                </button>
              ))}

              {isExpense && (
                <div style={{ alignSelf: 'center' }}>
                  {!isAddingCat ? (
                    <button 
                      type="button" 
                      onClick={() => setIsAddingCat(true)}
                      style={{ 
                        fontSize: '0.7rem', 
                        fontWeight: 700, 
                        color: 'var(--violet)', 
                        background: 'rgba(141,97,255,0.1)',
                        border: 'none',
                        padding: '6px 10px',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Plus size={12} /> Add
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <input 
                        type="text" 
                        value={newCatName} 
                        onChange={(e) => setNewCatName(e.target.value)}
                        placeholder="Name..."
                        autoFocus
                        style={{ width: '70px', fontSize: '0.7rem', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px' }}
                      />
                      <button 
                        type="button" 
                        onClick={handleAddCategory}
                        className="btn-save"
                        style={{ padding: '6px', minWidth: 'auto', borderRadius: '6px' }}
                      >
                        OK
                      </button>
                    </div>
                  )}
                </div>
              )}
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
            <button type="submit" className="btn-save" disabled={saving || scanning}
              style={{ background: isExpense ? '#334155' : '#16A34A' }}
            >
              <Save size={16} />
              {saving ? 'Saving…' : scanning ? 'Scanning…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
