"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { GitHubDashboardData } from "@/lib/githubDashboard";
import {
  GITHUB_AUTO_REFRESH_INTERVAL_MS,
  getAutoRefreshDelayMs,
  shouldAutoRefresh,
} from "@/lib/githubAutoRefresh";
import { GitHubDashboardClient } from "./GitHubDashboardClient";
import styles from "./GitHubDashboardAutoRefresh.module.css";

const TIMER_TICK_MS = 1_000;

function formatCountdown(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) return `${seconds}초`;
  return `${minutes}분 ${String(seconds).padStart(2, "0")}초`;
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 11a8 8 0 1 0-2.3 5.7" />
      <path d="M20 5v6h-6" />
    </svg>
  );
}

export function GitHubDashboardAutoRefresh({ data }: { data: GitHubDashboardData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [remainingMs, setRemainingMs] = useState(GITHUB_AUTO_REFRESH_INTERVAL_MS);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const lastRefreshAtRef = useRef<number | null>(null);
  const refreshInFlightRef = useRef(false);

  const refreshDashboard = useCallback(() => {
    if (refreshInFlightRef.current) return;

    refreshInFlightRef.current = true;
    lastRefreshAtRef.current = Date.now();
    setRemainingMs(GITHUB_AUTO_REFRESH_INTERVAL_MS);

    startTransition(() => {
      router.refresh();
    });
  }, [router]);

  useEffect(() => {
    if (!isPending) refreshInFlightRef.current = false;
  }, [isPending]);

  useEffect(() => {
    const now = Date.now();
    lastRefreshAtRef.current = now;
    setRemainingMs(GITHUB_AUTO_REFRESH_INTERVAL_MS);
    setIsPageVisible(document.visibilityState === "visible");

    const tick = () => {
      const currentTime = Date.now();
      const visible = document.visibilityState === "visible";
      const lastRefreshAt = lastRefreshAtRef.current ?? currentTime;

      setIsPageVisible(visible);
      setRemainingMs(getAutoRefreshDelayMs(lastRefreshAt, currentTime));

      if (
        !refreshInFlightRef.current &&
        shouldAutoRefresh({
          lastRefreshAt,
          now: currentTime,
          isVisible: visible,
        })
      ) {
        refreshDashboard();
      }
    };

    const timer = window.setInterval(tick, TIMER_TICK_MS);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, [refreshDashboard]);

  const statusText = !isPageVisible
    ? "탭으로 돌아오면 즉시 확인"
    : isPending
      ? "최신 공개 데이터 확인 중"
      : `다음 확인 ${formatCountdown(remainingMs)}`;

  return (
    <>
      <section className={styles.refreshShell} aria-label="GitHub 자동 갱신">
        <div className={styles.refreshIdentity}>
          <span className={styles.liveDot} aria-hidden="true" />
          <div>
            <strong>자동 갱신 켜짐</strong>
            <small>페이지가 보이는 동안 10분마다 · 서버 캐시 최대 5분</small>
          </div>
        </div>

        <div className={styles.refreshActions}>
          <span className={styles.refreshStatus} aria-live="polite">
            {statusText}
          </span>
          <button type="button" onClick={refreshDashboard} disabled={isPending}>
            <RefreshIcon />
            {isPending ? "확인 중" : "지금 갱신"}
          </button>
        </div>
      </section>

      <GitHubDashboardClient data={data} />
    </>
  );
}
