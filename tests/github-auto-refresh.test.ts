import assert from "node:assert/strict";
import test from "node:test";

type AutoRefreshModule = {
  GITHUB_AUTO_REFRESH_INTERVAL_MS: number;
  getAutoRefreshDelayMs: (lastRefreshAt: number, now: number) => number;
  getRefreshAnnouncement: (wasPending: boolean, isPending: boolean) => string | null;
  shouldAutoRefresh: (input: {
    lastRefreshAt: number;
    now: number;
    isVisible: boolean;
  }) => boolean;
};

async function loadAutoRefreshModule(): Promise<AutoRefreshModule | null> {
  try {
    return (await import("../src/lib/githubAutoRefresh.ts")) as AutoRefreshModule;
  } catch {
    return null;
  }
}

test("GitHub auto refresh module exists", async () => {
  const autoRefresh = await loadAutoRefreshModule();
  assert.ok(autoRefresh, "src/lib/githubAutoRefresh.ts must exist");
});

test("dashboard refreshes every ten minutes", async () => {
  const autoRefresh = await loadAutoRefreshModule();
  assert.ok(autoRefresh);
  assert.equal(autoRefresh.GITHUB_AUTO_REFRESH_INTERVAL_MS, 10 * 60 * 1000);
});

test("remaining delay never becomes negative", async () => {
  const autoRefresh = await loadAutoRefreshModule();
  assert.ok(autoRefresh);

  assert.equal(autoRefresh.getAutoRefreshDelayMs(1_000, 1_000), 600_000);
  assert.equal(autoRefresh.getAutoRefreshDelayMs(1_000, 600_999), 1);
  assert.equal(autoRefresh.getAutoRefreshDelayMs(1_000, 601_000), 0);
  assert.equal(autoRefresh.getAutoRefreshDelayMs(1_000, 900_000), 0);
});

test("automatic refresh only runs when the page is visible and due", async () => {
  const autoRefresh = await loadAutoRefreshModule();
  assert.ok(autoRefresh);

  assert.equal(
    autoRefresh.shouldAutoRefresh({ lastRefreshAt: 1_000, now: 601_000, isVisible: true }),
    true,
  );
  assert.equal(
    autoRefresh.shouldAutoRefresh({ lastRefreshAt: 1_000, now: 600_999, isVisible: true }),
    false,
  );
  assert.equal(
    autoRefresh.shouldAutoRefresh({ lastRefreshAt: 1_000, now: 900_000, isVisible: false }),
    false,
  );
});

test("refresh announcements only describe meaningful state changes", async () => {
  const autoRefresh = await loadAutoRefreshModule();
  assert.ok(autoRefresh);

  assert.equal(autoRefresh.getRefreshAnnouncement(false, false), null);
  assert.equal(autoRefresh.getRefreshAnnouncement(false, true), "최신 공개 데이터 새로고침 시작");
  assert.equal(autoRefresh.getRefreshAnnouncement(true, false), "최신 공개 데이터 새로고침 완료");
  assert.equal(autoRefresh.getRefreshAnnouncement(true, true), null);
});
