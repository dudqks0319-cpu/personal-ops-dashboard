export const GITHUB_AUTO_REFRESH_INTERVAL_MS = 10 * 60 * 1000;

export function getAutoRefreshDelayMs(lastRefreshAt: number, now: number): number {
  if (!Number.isFinite(lastRefreshAt) || !Number.isFinite(now)) {
    return GITHUB_AUTO_REFRESH_INTERVAL_MS;
  }

  return Math.max(0, GITHUB_AUTO_REFRESH_INTERVAL_MS - (now - lastRefreshAt));
}

export function shouldAutoRefresh({
  lastRefreshAt,
  now,
  isVisible,
}: {
  lastRefreshAt: number;
  now: number;
  isVisible: boolean;
}): boolean {
  return isVisible && getAutoRefreshDelayMs(lastRefreshAt, now) === 0;
}
