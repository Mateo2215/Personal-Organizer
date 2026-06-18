import { describe, it, expect, vi, beforeEach } from "vitest";
import { syncPushSubscription } from "../push";

// Mock the api module — we don't want real network calls in tests.
vi.mock("../api", () => ({
  api: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, msg: string) { super(msg); this.status = status; }
  },
}));

import { api } from "../api";
const mockApi = vi.mocked(api);

const mockGetSubscription = vi.fn();
const mockPushManager = { getSubscription: mockGetSubscription };
const mockSWReg = { pushManager: mockPushManager };

function stubGranted() {
  Object.defineProperty(window, "Notification", {
    value: { permission: "granted" },
    writable: true,
    configurable: true,
  });
}

function stubDenied() {
  Object.defineProperty(window, "Notification", {
    value: { permission: "denied" },
    writable: true,
    configurable: true,
  });
}

function stubSW() {
  Object.defineProperty(navigator, "serviceWorker", {
    value: { ready: Promise.resolve(mockSWReg) },
    writable: true,
    configurable: true,
  });
  Object.defineProperty(window, "PushManager", {
    value: class PushManager {},
    writable: true,
    configurable: true,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  stubGranted();
  stubSW();
  mockApi.mockResolvedValue({} as never);
});

describe("syncPushSubscription", () => {
  it("zwraca active:true gdy subskrypcja istnieje i backend ją przyjął", async () => {
    mockGetSubscription.mockResolvedValue({
      toJSON: () => ({
        endpoint: "https://fcm.example/push/abc",
        keys: { p256dh: "key123", auth: "auth456" },
      }),
    });
    const result = await syncPushSubscription();
    expect(result.active).toBe(true);
    expect(mockApi).toHaveBeenCalledWith(
      "/api/subscribe",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("zwraca active:false z reason no_subscription gdy getSubscription() zwróci null", async () => {
    mockGetSubscription.mockResolvedValue(null);
    const result = await syncPushSubscription();
    expect(result.active).toBe(false);
    expect(result.reason).toBe("no_subscription");
    expect(mockApi).not.toHaveBeenCalled();
  });

  it("zwraca active:false gdy permission !== granted", async () => {
    stubDenied();
    const result = await syncPushSubscription();
    expect(result.active).toBe(false);
    expect(mockApi).not.toHaveBeenCalled();
  });

  it("zwraca active:false z reason sync_failed gdy backend rzuci błąd", async () => {
    mockGetSubscription.mockResolvedValue({
      toJSON: () => ({
        endpoint: "https://fcm.example/push/abc",
        keys: { p256dh: "key123", auth: "auth456" },
      }),
    });
    mockApi.mockRejectedValue(new Error("network error"));
    const result = await syncPushSubscription();
    expect(result.active).toBe(false);
    expect(result.reason).toBe("sync_failed");
  });

  it("zwraca active:false z reason sync_failed gdy getSubscription() rzuci błąd", async () => {
    mockGetSubscription.mockRejectedValue(new Error("SW error"));
    const result = await syncPushSubscription();
    expect(result.active).toBe(false);
    expect(result.reason).toBe("sync_failed");
  });
});
