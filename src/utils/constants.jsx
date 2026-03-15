import {
  Utensils, Car, ShoppingBag, Gamepad2, HeartPulse, BookOpen,
  Zap, TrendingUp, Package, Briefcase, DollarSign, Gift, Wallet,
} from 'lucide-react';

export const EXPENSE_CATEGORIES = [
  { label: 'Food',          value: 'food',          icon: Utensils,    color: '#F97316', bg: '#FFF7ED' },
  { label: 'Transport',     value: 'transport',      icon: Car,         color: '#0EA5E9', bg: '#F0F9FF' },
  { label: 'Shopping',      value: 'shopping',       icon: ShoppingBag, color: '#D946EF', bg: '#FDF4FF' },
  { label: 'Entertainment', value: 'entertainment',  icon: Gamepad2,    color: '#8B5CF6', bg: '#F5F3FF' },
  { label: 'Health',        value: 'health',         icon: HeartPulse,  color: '#EF4444', bg: '#FEF2F2' },
  { label: 'Education',     value: 'education',      icon: BookOpen,    color: '#6366F1', bg: '#EEF2FF' },
  { label: 'Bills',         value: 'bills',          icon: Zap,         color: '#EAB308', bg: '#FEFCE8' },
  { label: 'Investment',    value: 'investment',     icon: TrendingUp,  color: '#10B981', bg: '#ECFDF5' },
  { label: 'Others',        value: 'other',          icon: Package,     color: '#64748B', bg: '#F8FAFC' },
];

export const INCOME_CATEGORIES = [
  { label: 'Salary',      value: 'salary',    icon: Briefcase,   color: '#16A34A', bg: '#F0FDF4' },
  { label: 'Freelance',   value: 'freelance', icon: DollarSign,  color: '#22C55E', bg: '#F0FDF4' },
  { label: 'Bonus',       value: 'bonus',     icon: Gift,        color: '#F43F5E', bg: '#FFF1F2' },
  { label: 'Investment',  value: 'inv_income',icon: TrendingUp,  color: '#10B981', bg: '#ECFDF5' },
  { label: 'Others',      value: 'inc_other', icon: Wallet,      color: '#475569', bg: '#F1F5F9' },
];

// Combined for lookups
export const CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

export const getCategoryByValue = (value) =>
  CATEGORIES.find((c) => c.value === value) || CATEGORIES[CATEGORIES.length - 1];

export const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount).replace('IDR', 'Rp');

export const formatDate = (timestamp) => {
  if (!timestamp) return '-';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const QUOTES = [
  'Manage today, enjoy tomorrow.',
  'One small step towards financial freedom.',
  'Tracked money is controlled money.',
  'Financial success starts with small habits.',
  'Frugality is not poverty, it is intelligence.',
  'Every expense tracked is an investment for the future.',
];

export const getDailyQuote = () => {
  const idx = new Date().getDate() % QUOTES.length;
  return QUOTES[idx];
};

export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5  && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 17) return 'Good Afternoon';
  if (hour >= 17 && hour < 21) return 'Good Evening';
  return 'Good Night';
};
