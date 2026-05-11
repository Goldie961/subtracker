import webpush from 'web-push';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

webpush.setVapidDetails(
  'mailto:contact@subtracker.app',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).end();

  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const keys = await redis.keys('push:*');
  if (!keys.length) return res.status(200).json({ sent: 0 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let sent = 0;
  let errors = 0;

  for (const key of keys) {
    const data = await redis.get(key);
    if (!data) continue;

    const { subscription, subscriptions } = typeof data === 'string' ? JSON.parse(data) : data;
    if (!subscription || !subscriptions?.length) continue;

    for (const sub of subscriptions) {
      if (!sub.renewalDate) continue;

      const renewal = new Date(sub.renewalDate);
      renewal.setHours(0, 0, 0, 0);
      const daysLeft = Math.round((renewal - today) / (1000 * 60 * 60 * 24));
      const reminder = sub.reminderDays ?? 3;

      if (daysLeft !== reminder && daysLeft !== 1 && daysLeft !== 0) continue;

      let title, body;
      if (daysLeft < 0) continue;
      else if (daysLeft === 0) {
        title = `⚠️ ${sub.name} expiră AZI`;
        body = `${sub.amount} ${sub.currency} — acționează acum!`;
      } else if (daysLeft === 1) {
        title = `🔔 ${sub.name} expiră mâine`;
        body = `${sub.amount} ${sub.currency} — mai ai o zi`;
      } else {
        title = `📅 ${sub.name} se reînnoiește în ${daysLeft} zile`;
        body = `${sub.amount} ${sub.currency} pe ${sub.cycle === 'monthly' ? 'lună' : 'an'}`;
      }

      const payload = JSON.stringify({
        title,
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: { url: `/subscription/${sub.id}` }
      });

      try {
        await webpush.sendNotification(subscription, payload);
        sent++;
      } catch (err) {
        console.error('PUSH_ERROR:', err?.statusCode, err?.message, JSON.stringify(err?.body));
        errors++;
        if (err.statusCode === 410) await redis.del(key);
      }
    }
  }

  res.status(200).json({ sent, errors });
}
