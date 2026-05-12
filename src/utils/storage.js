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
  autoSync();
}

export function updateSubscription(id, updates) {
  const subs = getSubscriptions();
  const idx = subs.findIndex((s) => s.id === id);
  if (idx !== -1) {
    subs[idx] = { ...subs[idx], ...updates };
    saveSubscriptions(subs);
    autoSync();
  }
}

export function deleteSubscription(id) {
  const subs = getSubscriptions().filter((s) => s.id !== id);
  saveSubscriptions(subs);
  autoSync();
}

export function getSubscriptionById(id) {
  return getSubscriptions().find((s) => s.id === id) || null;
}

export async function autoSync() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const pushSub = await registration.pushManager.getSubscription();
    if (pushSub === null) return;
    await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: pushSub, subscriptions: getSubscriptions() }),
    });
  } catch (err) {
    console.error('autoSync failed:', err);
  }
}
