export function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback pentru HTTP (non-secure context)
  return Date.now().toString(36) + '-' + 
    Math.random().toString(36).substring(2, 9) + '-' + 
    Math.random().toString(36).substring(2, 9);
}

export function getDaysRemaining(renewalDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const renewal = new Date(renewalDate);
  renewal.setHours(0, 0, 0, 0);
  return Math.ceil((renewal - today) / 86400000);
}

export function getUrgencyClass(days) {
  if (days <= 3) return 'urgency-danger';
  if (days <= 7) return 'urgency-warning';
  return 'urgency-safe';
}

export function formatCurrency(amount, currency) {
  return `${Number(amount).toFixed(2)} ${currency}`;
}

export function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function getMonthlyEquivalent(amount, cycle) {
  if (cycle === 'yearly') return amount / 12;
  return amount;
}

export function sortByUrgency(subscriptions) {
  return [...subscriptions].sort(
    (a, b) => getDaysRemaining(a.renewalDate) - getDaysRemaining(b.renewalDate)
  );
}
