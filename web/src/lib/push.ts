// Włączanie Web Push na froncie: zgoda → subskrypcja (z kluczem VAPID z serwera) → zapis w API.

import { api } from "./api";

// VAPID public key (base64url) → format wymagany przez pushManager.subscribe.
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function notificationsGranted(): boolean {
  return "Notification" in window && Notification.permission === "granted";
}

// Checks the real browser push subscription and syncs it with the backend.
// Called silently on app load — if the sub expired or was cleared, re-registers it.
export async function syncPushSubscription(): Promise<{
  active: boolean;
  reason?: "no_subscription" | "sync_failed";
}> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { active: false };
  }
  if (Notification.permission !== "granted") {
    return { active: false };
  }
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) {
      return { active: false, reason: "no_subscription" };
    }
    const json = sub.toJSON();
    await api("/api/subscribe", {
      method: "POST",
      body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
    });
    return { active: true };
  } catch {
    return { active: false, reason: "sync_failed" };
  }
}

export async function enablePush(): Promise<{ ok: boolean; reason?: string }> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, reason: "Ta przeglądarka nie wspiera powiadomień push." };
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, reason: "Nie udzielono zgody na powiadomienia." };
  }

  const reg = await navigator.serviceWorker.ready;
  const { vapidPublicKey } = await api<{ vapidPublicKey: string }>("/api/config");

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  }

  const json = sub.toJSON();
  await api("/api/subscribe", {
    method: "POST",
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
  });
  return { ok: true };
}
