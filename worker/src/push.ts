// Wysyłka Web Push z Workera (Web Crypto, biblioteka kompatybilna z runtime Workers).
// buildPushPayload tworzy podpisany+zaszyfrowany payload; POST na endpoint subskrypcji → 201 = przyjęte.

import { buildPushPayload, type PushSubscription } from "@block65/webcrypto-web-push";
import type { Env } from "./index";

export interface StoredSubscription {
  id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushMessage {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

function toPushSubscription(s: StoredSubscription): PushSubscription {
  return {
    endpoint: s.endpoint,
    expirationTime: null,
    keys: { p256dh: s.p256dh, auth: s.auth },
  } as unknown as PushSubscription;
}

// Wysyła jedno powiadomienie do jednej subskrypcji. Zwraca status HTTP od push service.
export async function sendPush(env: Env, sub: StoredSubscription, message: PushMessage): Promise<number> {
  const payload = await buildPushPayload(
    { data: JSON.stringify(message), options: { ttl: 3600, urgency: "high" } },
    toPushSubscription(sub),
    {
      subject: env.VAPID_SUBJECT,
      publicKey: env.VAPID_PUBLIC_KEY,
      privateKey: env.VAPID_PRIVATE_KEY,
    },
  );
  const res = await fetch(sub.endpoint, payload);
  return res.status;
}

// Wysyła do wszystkich subskrypcji; usuwa martwe (404/410). Zwraca liczbę udanych wysyłek.
export async function sendToAll(env: Env, message: PushMessage): Promise<{ sent: number; statuses: number[] }> {
  const res = await env.DB.prepare(
    "SELECT id, endpoint, p256dh, auth FROM push_subscriptions",
  ).all<StoredSubscription>();
  const subs = res.results ?? [];
  const statuses: number[] = [];
  let sent = 0;

  for (const sub of subs) {
    try {
      const status = await sendPush(env, sub, message);
      statuses.push(status);
      if (status >= 200 && status < 300) sent++;
      if (status === 404 || status === 410) {
        await env.DB.prepare("DELETE FROM push_subscriptions WHERE id = ?").bind(sub.id).run();
      }
    } catch {
      statuses.push(0); // 0 = wyjątek po stronie wysyłki
    }
  }
  return { sent, statuses };
}
