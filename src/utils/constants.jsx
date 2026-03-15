import {
  Utensils, Car, ShoppingBag, Gamepad2, HeartPulse, BookOpen,
  Zap, TrendingUp, Package, Briefcase, DollarSign, Gift, Wallet,
} from 'lucide-react';

export const EXPENSE_CATEGORIES = [
  { label: 'Food',          value: 'food',          icon: Utensils,    color: '#475569', bg: '#F1F5F9' },
  { label: 'Transport',     value: 'transport',      icon: Car,         color: '#475569', bg: '#F1F5F9' },
  { label: 'Shopping',      value: 'shopping',       icon: ShoppingBag, color: '#475569', bg: '#F1F5F9' },
  { label: 'Entertainment', value: 'entertainment',  icon: Gamepad2,    color: '#475569', bg: '#F1F5F9' },
  { label: 'Health',        value: 'health',         icon: HeartPulse,  color: '#475569', bg: '#F1F5F9' },
  { label: 'Education',     value: 'education',      icon: BookOpen,    color: '#475569', bg: '#F1F5F9' },
  { label: 'Bills',         value: 'bills',          icon: Zap,         color: '#475569', bg: '#F1F5F9' },
  { label: 'Investment',    value: 'investment',     icon: TrendingUp,  color: '#475569', bg: '#F1F5F9' },
  { label: 'Others',        value: 'other',          icon: Package,     color: '#475569', bg: '#F1F5F9' },
];

export const INCOME_CATEGORIES = [
  { label: 'Salary',      value: 'salary',    icon: Briefcase,   color: '#475569', bg: '#F1F5F9' },
  { label: 'Freelance',   value: 'freelance', icon: DollarSign,  color: '#475569', bg: '#F1F5F9' },
  { label: 'Bonus',       value: 'bonus',     icon: Gift,        color: '#475569', bg: '#F1F5F9' },
  { label: 'Investment',  value: 'inv_income',icon: TrendingUp,  color: '#475569', bg: '#F1F5F9' },
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
