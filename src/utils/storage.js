import { PRESETS } from '../data/presets';

const STORAGE_KEY = 'subscriptions';

export function getSubscriptions() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const subs = data ? JSON.parse(data) : [];
    return subs.map(sub => {
      if (!sub.category) {
        const preset = PRESETS.find(p => p.name === sub.name);
        return { ...sub, category: preset?.category || 'online' };
      }
      return sub;
    });
  } catch {
    return [];
  }
}

export function saveSubscriptions(subs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(subs));
}

export function addSubscription(sub) {
  const subs = getSubscriptions();
  subs.push(sub);
  saveSubscriptions(subs);
}

export function updateSubscription(id, updates) {
  const subs = getSubscriptions();
  const idx = subs.findIndex((s) => s.id === id);
  if (idx !== -1) {
    subs[idx] = { ...subs[idx], ...updates };
    saveSubscriptions(subs);
  }
}

export function deleteSubscription(id) {
  const subs = getSubscriptions().filter((s) => s.id !== id);
  saveSubscriptions(subs);
}

export function getSubscriptionById(id) {
  return getSubscriptions().find((s) => s.id === id) || null;
}
