/**
 * Standard formatting utilities for Pacific Restroom Cubicle Admin & ERP
 */

export const formatCurrency = (amount: number | string | null | undefined, currency = 'INR'): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount || 0);
  if (isNaN(num)) return '₹0.00';

  if (currency === 'AED') {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 2,
    }).format(num);
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(num);
};

export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTime = (date: string | Date | null | undefined): string => {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatNumber = (num: number | string | null | undefined): string => {
  const n = typeof num === 'string' ? parseFloat(num) : Number(num || 0);
  if (isNaN(n)) return '0';
  return new Intl.NumberFormat('en-IN').format(n);
};
