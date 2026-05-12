import webpush from 'web-push';
import { Redis } from '@upstash/redis';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).end();
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const missingVars = ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'].filter(k => !process.env[k]);
  if (missingVars.length) return res.status(500).json({ error: 'Missing env vars', missing: missingVars });
  const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
  webpush.setVapidDetails('mailto:contact@subtracker.app', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  const keys = await redis.keys('push:*');
  if (!keys.length) return res.status(200).json({ sent: 0 });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let sent = 0;
  let errors = 0;

  for (const key of keys) {
    const data = await redis.get(key);
    if (!data) continue;
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    const subscription = parsed.subscription;
    const subscriptions = parsed.subscriptions;
    if (!subscription || !subscriptions || !subscriptions.length) continue;

    // 1. Read global reminder array
    const globalReminder = parsed.reminderDays || [3, 1];

    const endpointHash = key.replace('push:', '');
    const eligibleSubs = [];

    for (const sub of subscriptions) {
      if (!sub.renewalDate) continue;

      // 2. Compute daysLeft, skip if past
      const renewal = new Date(sub.renewalDate);
      renewal.setHours(0, 0, 0, 0);
      const daysLeft = Math.round((renewal - today) / 86400000);
      if (daysLeft < 0) continue;

      // 3. Deduplication check
      const dedupKey = `notif:${endpointHash}:${sub.id}:${daysLeft}`;
      const alreadySent = await redis.get(dedupKey).catch(() => null);
      if (alreadySent) continue;

      // 4. Eligibility check
      const effectiveReminder = sub.reminderOverride || globalReminder;
      if (!effectiveReminder.includes(daysLeft)) continue;

      // 5. Collect eligible sub (attach daysLeft for batching)
      eligibleSubs.push({ ...sub, daysLeft });
    }

    // 6. Skip if nothing eligible
    if (!eligibleSubs.length) continue;

    let title;
    let body;

    if (eligibleSubs.length === 1) {
      // 7. Single notification
      const s = eligibleSubs[0];
      const dl = s.daysLeft;
      if (dl === 0) {
        title = `${s.name} se reînnoiește AZI`;
        body = `${s.amount} ${s.currency} - acționează acum!`;
      } else if (dl === 1) {
        title = `${s.name} expiră mâine`;
        body = `${s.amount} ${s.currency} - mai ai o zi`;
      } else {
        title = `${s.name} se reînnoiește în ${dl} zile`;
        body = `${s.amount} ${s.currency}`;
      }
    } else {
      // 8. Batched notification
      const total = eligibleSubs.reduce((sum, s) => sum + Number(s.amount), 0);
      const currency = eligibleSubs[0].currency;
      const names = eligibleSubs.map(s => s.name).join(', ');
      const minDaysLeft = Math.min(...eligibleSubs.map(s => s.daysLeft));
      if (minDaysLeft === 0) {
        title = `${names} se reînnoiesc AZI`;
      } else if (minDaysLeft === 1) {
        title = `${names} expiră mâine`;
      } else {
        title = `${names} se reînnoiesc în ${minDaysLeft} zile`;
      }
      body = `Total: ${total} ${currency}`;
    }

    // 9. Send ONE push for the entire endpoint
    const payload = JSON.stringify({
      title,
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: '/' }
    });

    try {
      await webpush.sendNotification(subscription, payload);
      sent++;

      // 10. Mark dedup for each eligible sub
      for (const s of eligibleSubs) {
        const dk = `notif:${endpointHash}:${s.id}:${s.daysLeft}`;
        await redis.set(dk, '1', { ex: 86400 });
      }
    } catch (err) {
      errors++;
      // 11. Clean up stale subscription on 410 Gone
      if (err.statusCode === 410) await redis.del(key);
    }
  }

  return res.status(200).json({ sent, errors });
}