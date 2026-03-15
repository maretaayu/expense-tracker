import { Camera, PenLine, Sparkles, X } from 'lucide-react';

export default function EntryMethodPicker({ isOpen, onClose, onSelect }) {
  if (!isOpen) return null;

  return (
    <div className="picker-overlay" onClick={onClose}>
      <div className="picker-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="picker-handle" />
        <div className="picker-header">
          <div>
            <h3 className="picker-title">Add Transaction</h3>
            <p className="picker-subtitle">How would you like to add it?</p>
          </div>
          <button className="picker-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="picker-options">
          <button className="picker-option scan" onClick={() => onSelect('scan')}>
            <div className="picker-option-icon">
              <Camera size={24} strokeWidth={2.5} />
            </div>
            <div className="picker-option-text">
              <span className="option-label">
                Scan Receipt <Sparkles size={12} className="ai-sparkle" />
              </span>
              <span className="option-desc">AI will auto-fill everything for you</span>
            </div>
          </button>

          <button className="picker-option manual" onClick={() => onSelect('manual')}>
            <div className="picker-option-icon">
              <PenLine size={24} strokeWidth={2.5} />
            </div>
            <div className="picker-option-text">
              <span className="option-label">Manual Entry</span>
              <span className="option-desc">Type your transaction details in</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
