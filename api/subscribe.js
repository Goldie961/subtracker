import webpush from 'web-push';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:contact@subtracker.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { subscription, subscriptions } = req.body;
  if (!subscription) return res.status(400).json({ error: 'No subscription' });

  const endpointKey = Buffer.from(subscription.endpoint).toString('base64').slice(0, 60);
  const key = `push:${endpointKey}`;

  await redis.set(key, JSON.stringify({
    subscription,
    subscriptions: subscriptions || [],
    updatedAt: new Date().toISOString()
  }));

  res.status(200).json({ ok: true });
}
