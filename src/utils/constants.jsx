import {
  Utensils, Car, ShoppingBag, Gamepad2, HeartPulse, BookOpen,
  Zap, TrendingUp, Package, Briefcase, DollarSign, Gift, Wallet,
} from 'lucide-react';

export const EXPENSE_CATEGORIES = [
  { label: 'Makanan',      value: 'food',          icon: Utensils,    color: '#E05C5C', bg: '#FDF5F5' },
  { label: 'Transportasi', value: 'transport',      icon: Car,         color: '#4B7CF3', bg: '#F2F5FE' },
  { label: 'Belanja',      value: 'shopping',       icon: ShoppingBag, color: '#7C5FD4', bg: '#F5F4FD' },
  { label: 'Hiburan',      value: 'entertainment',  icon: Gamepad2,    color: '#D4853A', bg: '#FDF7F1' },
  { label: 'Kesehatan',    value: 'health',         icon: HeartPulse,  color: '#C4578A', bg: '#FDF3F8' },
  { label: 'Pendidikan',   value: 'education',      icon: BookOpen,    color: '#3B9E78', bg: '#F2FAF6' },
  { label: 'Tagihan',      value: 'bills',          icon: Zap,         color: '#C49A3A', bg: '#FDF9F0' },
  { label: 'Investasi',    value: 'investment',     icon: TrendingUp,  color: '#3A9EC4', bg: '#F0F9FD' },
  { label: 'Lainnya',      value: 'other',          icon: Package,     color: '#8A94A6', bg: '#F6F7F9' },
];

export const INCOME_CATEGORIES = [
  { label: 'Gaji',      value: 'salary',    icon: Briefcase,   color: '#3B9E78', bg: '#F2FAF6' },
  { label: 'Freelance', value: 'freelance', icon: DollarSign,  color: '#3A9EC4', bg: '#F0F9FD' },
  { label: 'Bonus',     value: 'bonus',     icon: Gift,        color: '#C49A3A', bg: '#FDF9F0' },
  { label: 'Investasi', value: 'inv_income',icon: TrendingUp,  color: '#7C5FD4', bg: '#F5F4FD' },
  { label: 'Lainnya',   value: 'inc_other', icon: Wallet,      color: '#8A94A6', bg: '#F6F7F9' },
];

// Combined for lookups
export const CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

export const getCategoryByValue = (value) =>
  CATEGORIES.find((c) => c.value === value) || CATEGORIES[CATEGORIES.length - 1];

export const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);

export const formatDate = (timestamp) => {
  if (!timestamp) return '-';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const QUOTES = [
  'Kelola hari ini, nikmati masa depan.',
  'Satu langkah kecil menuju kebebasan finansial.',
  'Uang yang dicatat adalah uang yang dikendalikan.',
  'Kesuksesan finansial dimulai dari kebiasaan kecil.',
  'Hidup hemat bukan berarti miskin, tapi cerdas.',
  'Setiap rupiah yang kamu catat adalah investasi untuk masa depan.',
];

export const getDailyQuote = () => {
  const idx = new Date().getDate() % QUOTES.length;
  return QUOTES[idx];
};

export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5  && hour < 11) return 'Selamat Pagi';
  if (hour >= 11 && hour < 15) return 'Selamat Siang';
  if (hour >= 15 && hour < 18) return 'Selamat Sore';
  return 'Selamat Malam';
};
