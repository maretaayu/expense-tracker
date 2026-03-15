import { Search } from 'lucide-react';
import { EXPENSE_CATEGORIES } from '../utils/constants.jsx';

export default function FilterBar({ filter, setFilter }) {
  return (
    <>
      <div className="search-wrap">
        <Search size={16} />
        <input
          type="text"
          className="search-input"
          placeholder="Search transactions…"
          value={filter.search}
          onChange={(e) => setFilter((p) => ({ ...p, search: e.target.value }))}
        />
      </div>

      <div className="type-tabs">
        {[
          { value: '',        label: 'All' },
          { value: 'expense', label: 'Expense' },
          { value: 'income',  label: 'Income' },
        ].map((t) => (
          <button
            key={t.value}
            className={`type-tab${filter.type === t.value ? ' active' : ''}`}
            onClick={() => setFilter((p) => ({ ...p, type: t.value }))}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="filter-row">
        <button
          className={`filter-chip${filter.category === '' ? ' active' : ''}`}
          onClick={() => setFilter((p) => ({ ...p, category: '' }))}
        >All</button>
        {EXPENSE_CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            className={`filter-chip${filter.category === cat.value ? ' active' : ''}`}
            onClick={() => setFilter((p) => ({ ...p, category: p.category === cat.value ? '' : cat.value }))}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </>
  );
}
