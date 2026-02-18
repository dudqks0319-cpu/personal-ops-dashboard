"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LAUNCHPAD_DESCRIPTION_MAX,
  LAUNCHPAD_NAME_MAX,
  normalizeLaunchpadUrl,
} from "@/lib/launchpad";
import styles from "./page.module.css";

type Task = {
  id: string;
  title: string;
  done: boolean;
  priority: "high" | "medium" | "low";
};

type CalendarEvent = {
  id: string;
  title: string;
  when: string;
};

type Journal = {
  id: string;
  text: string;
  createdAt: string;
};

type LaunchpadItem = {
  id: string;
  name: string;
  url: string;
  description: string;
  enabled: boolean;
  launchCount: number;
  lastLaunchedAt: string | null;
};

type Stats = {
  totalTasks: number;
  doneTasks: number;
  focusMinutesToday: number;
  journalsCount: number;
};

type Weather = {
  city: string;
  currentTemp: number;
  apparentTemp: number;
  maxTemp: number;
  minTemp: number;
};

type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string };

type RequestJsonInit = RequestInit & {
  timeoutMs?: number;
};

type LaunchpadFilter = "all" | "enabled" | "disabled";

type LaunchpadDraft = {
  name: string;
  url: string;
  description: string;
};

const REQUEST_TIMEOUT_MS = 12000;
const LAUNCHPAD_DRAFT_STORAGE_KEY = "personal-ops-dashboard:launchpad:draft:v2";
const LAUNCHPAD_CACHE_STORAGE_KEY = "personal-ops-dashboard:launchpad:cache:v2";
const LAUNCHPAD_CACHE_SYNC_KEY = "personal-ops-dashboard:launchpad:cache-sync:v2";

function safeStorageGet(key: string): string | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key: string, value: string) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // localStorage unavailable (private mode / quota). ignore.
  }
}

function safeStorageRemove(key: string) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function toNonNegativeInteger(value: unknown): number {
  const next = Number(value);
  if (!Number.isFinite(next) || next < 0) {
    return 0;
  }

  return Math.floor(next);
}

function toOptionalIsoString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString();
}

function normalizeLaunchpadCacheItem(value: unknown): LaunchpadItem | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
  const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
  const url = normalizeLaunchpadUrl(candidate.url);

  if (!id || !name || !url) {
    return null;
  }

  return {
    id,
    name,
    url,
    description: typeof candidate.description === "string" ? candidate.description.trim() : "",
    enabled: typeof candidate.enabled === "boolean" ? candidate.enabled : true,
    launchCount: toNonNegativeInteger(candidate.launchCount),
    lastLaunchedAt: toOptionalIsoString(candidate.lastLaunchedAt),
  };
}

function readLaunchpadCacheFromStorage(): LaunchpadItem[] | null {
  const raw = safeStorageGet(LAUNCHPAD_CACHE_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return null;
    }

    const normalized = parsed.flatMap((item) => {
      const launchpadItem = normalizeLaunchpadCacheItem(item);
      return launchpadItem ? [launchpadItem] : [];
    });

    return normalized.length > 0 ? normalized : null;
  } catch {
    return null;
  }
}

function persistLaunchpadCache(items: LaunchpadItem[], syncedAt: string) {
  safeStorageSet(LAUNCHPAD_CACHE_STORAGE_KEY, JSON.stringify(items));
  safeStorageSet(LAUNCHPAD_CACHE_SYNC_KEY, syncedAt);
}

function readLaunchpadDraftFromStorage(): LaunchpadDraft | null {
  const raw = safeStorageGet(LAUNCHPAD_DRAFT_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }

    const candidate = parsed as Record<string, unknown>;
    return {
      name: typeof candidate.name === "string" ? candidate.name : "",
      url: typeof candidate.url === "string" ? candidate.url : "",
      description: typeof candidate.description === "string" ? candidate.description : "",
    };
  } catch {
    return null;
  }
}

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === "string" && payload.trim()) {
    return payload.trim();
  }

  if (typeof payload === "object" && payload !== null) {
    const candidate = payload as { error?: unknown; message?: unknown };
    if (typeof candidate.error === "string" && candidate.error.trim()) {
      return candidate.error.trim();
    }

    if (typeof candidate.message === "string" && candidate.message.trim()) {
      return candidate.message.trim();
    }
  }

  return fallback;
}

async function requestJson<T>(url: string, init?: RequestJsonInit): Promise<ApiResult<T>> {
  const { timeoutMs = REQUEST_TIMEOUT_MS, ...fetchInit } = init ?? {};
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...fetchInit,
      signal: controller.signal,
    });

    let payload: unknown = null;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      payload = await response.json().catch(() => null);
    } else {
      payload = await response.text().catch(() => "");
    }

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: extractErrorMessage(payload, `요청 실패 (${response.status})`),
      };
    }

    return { ok: true, data: payload as T };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        ok: false,
        status: 0,
        error: "요청 시간이 초과되었어요. 잠시 후 다시 시도해주세요.",
      };
    }

    return {
      ok: false,
      status: 0,
      error: "네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    };
  } finally {
    window.clearTimeout(timeout);
  }
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [journals, setJournals] = useState<Journal[]>([]);
  const [launchpad, setLaunchpad] = useState<LaunchpadItem[]>([]);

  const [input, setInput] = useState("");
  const [journalInput, setJournalInput] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");

  const [eventTitle, setEventTitle] = useState("");
  const [eventWhen, setEventWhen] = useState("");

  const [lpName, setLpName] = useState("");
  const [lpUrl, setLpUrl] = useState("");
  const [lpDescription, setLpDescription] = useState("");
  const [editingLpId, setEditingLpId] = useState<string | null>(null);

  const [stats, setStats] = useState<Stats | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);

  const [addingTask, setAddingTask] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const [launchpadSaving, setLaunchpadSaving] = useState(false);
  const [launchpadBusyId, setLaunchpadBusyId] = useState<string | null>(null);
  const [launchpadBusyAction, setLaunchpadBusyAction] = useState<"run" | "toggle" | "delete" | null>(null);
  const [launchpadError, setLaunchpadError] = useState<string | null>(null);
  const [launchpadNotice, setLaunchpadNotice] = useState<string | null>(null);
  const [launchpadFilter, setLaunchpadFilter] = useState<LaunchpadFilter>("all");
  const [launchpadQuery, setLaunchpadQuery] = useState("");
  const [launchpadLastSyncedAt, setLaunchpadLastSyncedAt] = useState<string | null>(null);
  const [launchpadUsingCachedData, setLaunchpadUsingCachedData] = useState(false);

  const doneRate = useMemo(() => {
    if (!stats || stats.totalTasks === 0) return 0;
    return Math.round((stats.doneTasks / stats.totalTasks) * 100);
  }, [stats]);

  const filteredLaunchpad = useMemo(() => {
    const query = launchpadQuery.trim().toLowerCase();

    return launchpad.filter((item) => {
      if (launchpadFilter === "enabled" && !item.enabled) {
        return false;
      }

      if (launchpadFilter === "disabled" && item.enabled) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [item.name, item.url, item.description]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [launchpad, launchpadFilter, launchpadQuery]);

  const clearLaunchpadFeedback = () => {
    setLaunchpadError(null);
    setLaunchpadNotice(null);
  };

  const clearLaunchpadBusy = () => {
    setLaunchpadBusyId(null);
    setLaunchpadBusyAction(null);
  };

  const refresh = useCallback(async () => {
    setIsRefreshing(true);

    try {
      const [tasksRes, statsRes, weatherRes, eventsRes, journalsRes, launchpadRes] = await Promise.all([
        requestJson<Task[]>("/api/tasks"),
        requestJson<Stats>("/api/stats"),
        requestJson<Weather>("/api/weather"),
        requestJson<CalendarEvent[]>("/api/events"),
        requestJson<Journal[]>("/api/journals"),
        requestJson<LaunchpadItem[]>("/api/launchpad"),
      ]);

      const failedSections: string[] = [];

      if (tasksRes.ok && Array.isArray(tasksRes.data)) {
        setTasks(tasksRes.data);
      } else if (!tasksRes.ok) {
        failedSections.push("할 일");
      }

      if (statsRes.ok) {
        setStats(statsRes.data);
      } else {
        failedSections.push("요약");
      }

      if (eventsRes.ok && Array.isArray(eventsRes.data)) {
        setEvents(eventsRes.data);
      } else if (!eventsRes.ok) {
        failedSections.push("일정");
      }

      if (journalsRes.ok && Array.isArray(journalsRes.data)) {
        setJournals(journalsRes.data);
      } else if (!journalsRes.ok) {
        failedSections.push("메모");
      }

      if (weatherRes.ok) {
        setWeather(weatherRes.data);
      } else {
        setWeather(null);
      }

      if (launchpadRes.ok && Array.isArray(launchpadRes.data)) {
        const syncedAt = new Date().toISOString();
        setLaunchpad(launchpadRes.data);
        setLaunchpadUsingCachedData(false);
        setLaunchpadLastSyncedAt(syncedAt);
        persistLaunchpadCache(launchpadRes.data, syncedAt);
        setLaunchpadError((prev) => {
          if (prev?.startsWith("런치패드 목록")) {
            return null;
          }
          return prev;
        });
      } else if (!launchpadRes.ok) {
        const cachedLaunchpad = readLaunchpadCacheFromStorage();
        if (cachedLaunchpad && cachedLaunchpad.length > 0) {
          setLaunchpad(cachedLaunchpad);
          setLaunchpadUsingCachedData(true);
          setLaunchpadNotice(
            (prev) =>
              prev ?? "저장된 캐시 데이터로 런치패드를 표시 중입니다. 연결 복구 후 새로고침을 눌러주세요.",
          );
        }

        failedSections.push("런치패드");
        setLaunchpadError(`런치패드 목록을 불러오지 못했어요: ${launchpadRes.error}`);
      }

      if (failedSections.length > 0) {
        setPageError(`일부 데이터를 불러오지 못했어요 (${failedSections.join(", ")}). 잠시 후 다시 시도해주세요.`);
      } else {
        setPageError(null);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const cachedLaunchpad = readLaunchpadCacheFromStorage();
    if (cachedLaunchpad && cachedLaunchpad.length > 0) {
      setLaunchpad(cachedLaunchpad);
      setLaunchpadUsingCachedData(true);
    }

    const cachedSyncedAt = safeStorageGet(LAUNCHPAD_CACHE_SYNC_KEY);
    if (cachedSyncedAt && !Number.isNaN(Date.parse(cachedSyncedAt))) {
      setLaunchpadLastSyncedAt(new Date(cachedSyncedAt).toISOString());
    }

    const launchpadDraft = readLaunchpadDraftFromStorage();
    if (launchpadDraft) {
      setLpName(launchpadDraft.name);
      setLpUrl(launchpadDraft.url);
      setLpDescription(launchpadDraft.description);
    }

    void refresh();
  }, [refresh]);

  useEffect(() => {
    const hasDraft = Boolean(lpName.trim() || lpUrl.trim() || lpDescription.trim());

    if (!hasDraft) {
      safeStorageRemove(LAUNCHPAD_DRAFT_STORAGE_KEY);
      return;
    }

    const payload: LaunchpadDraft = {
      name: lpName,
      url: lpUrl,
      description: lpDescription,
    };

    safeStorageSet(LAUNCHPAD_DRAFT_STORAGE_KEY, JSON.stringify(payload));
  }, [lpDescription, lpName, lpUrl]);

  useEffect(() => {
    if (!launchpadNotice) return;

    const timeout = window.setTimeout(() => {
      setLaunchpadNotice((prev) => (prev === launchpadNotice ? null : prev));
    }, 4500);

    return () => window.clearTimeout(timeout);
  }, [launchpadNotice]);

  const addTask = async () => {
    if (!input.trim()) return;
    setAddingTask(true);

    const result = await requestJson<Task>("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: input, priority }),
    });

    if (!result.ok) {
      setPageError(`할 일 추가 실패: ${result.error}`);
      setAddingTask(false);
      return;
    }

    setInput("");
    await refresh();
    setAddingTask(false);
  };

  const toggleTask = async (task: Task) => {
    const result = await requestJson<Task>(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !task.done }),
    });

    if (!result.ok) {
      setPageError(`할 일 상태 변경 실패: ${result.error}`);
      return;
    }

    await refresh();
  };

  const removeTask = async (id: string) => {
    const result = await requestJson<{ ok: true }>(`/api/tasks/${id}`, { method: "DELETE" });

    if (!result.ok) {
      setPageError(`할 일 삭제 실패: ${result.error}`);
      return;
    }

    await refresh();
  };

  const addFocusSession = async (minutes: number) => {
    const result = await requestJson<{ id: string }>("/api/focus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minutes }),
    });

    if (!result.ok) {
      setPageError(`집중 시간 추가 실패: ${result.error}`);
      return;
    }

    await refresh();
  };

  const addEvent = async () => {
    if (!eventTitle.trim() || !eventWhen) return;

    const result = await requestJson<CalendarEvent>("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: eventTitle, when: eventWhen }),
    });

    if (!result.ok) {
      setPageError(`일정 추가 실패: ${result.error}`);
      return;
    }

    setEventTitle("");
    setEventWhen("");
    await refresh();
  };

  const removeEvent = async (id: string) => {
    const result = await requestJson<{ ok: true }>(`/api/events/${id}`, { method: "DELETE" });

    if (!result.ok) {
      setPageError(`일정 삭제 실패: ${result.error}`);
      return;
    }

    await refresh();
  };

  const addJournal = async () => {
    if (!journalInput.trim()) return;

    const result = await requestJson<Journal>("/api/journals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: journalInput }),
    });

    if (!result.ok) {
      setPageError(`메모 추가 실패: ${result.error}`);
      return;
    }

    setJournalInput("");
    await refresh();
  };

  const removeJournal = async (id: string) => {
    const result = await requestJson<{ ok: true }>(`/api/journals/${id}`, { method: "DELETE" });

    if (!result.ok) {
      setPageError(`메모 삭제 실패: ${result.error}`);
      return;
    }

    await refresh();
  };

  const saveLaunchpad = async () => {
    clearLaunchpadFeedback();

    const name = lpName.trim();
    const url = normalizeLaunchpadUrl(lpUrl);
    const description = lpDescription.trim();

    if (!name) {
      setLaunchpadError("도구 이름을 입력해주세요.");
      return;
    }

    if (name.length > LAUNCHPAD_NAME_MAX) {
      setLaunchpadError(`이름은 최대 ${LAUNCHPAD_NAME_MAX}자까지 입력할 수 있어요.`);
      return;
    }

    if (!url) {
      setLaunchpadError("URL은 http/https 형식으로 정확히 입력해주세요.");
      return;
    }

    if (description.length > LAUNCHPAD_DESCRIPTION_MAX) {
      setLaunchpadError(`설명은 최대 ${LAUNCHPAD_DESCRIPTION_MAX}자까지 입력할 수 있어요.`);
      return;
    }

    setLaunchpadSaving(true);

    try {
      const result = editingLpId
        ? await requestJson<LaunchpadItem>(`/api/launchpad/${editingLpId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, url, description }),
          })
        : await requestJson<LaunchpadItem>("/api/launchpad", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, url, description }),
          });

      if (!result.ok) {
        if (editingLpId && result.status === 404) {
          setEditingLpId(null);
          setLaunchpadError(
            "수정 중이던 런치패드 항목을 찾지 못했어요. 입력값은 유지했으니 확인 후 다시 저장해주세요.",
          );
          return;
        }

        setLaunchpadError(`저장 실패: ${result.error}`);
        return;
      }

      setLpName("");
      setLpUrl("");
      setLpDescription("");
      setEditingLpId(null);
      safeStorageRemove(LAUNCHPAD_DRAFT_STORAGE_KEY);
      setLaunchpadNotice(editingLpId ? "런치패드 항목을 수정했어요." : "런치패드 항목을 추가했어요.");

      await refresh();
    } finally {
      setLaunchpadSaving(false);
    }
  };

  const editLaunchpad = (item: LaunchpadItem) => {
    clearLaunchpadFeedback();
    setEditingLpId(item.id);
    setLpName(item.name);
    setLpUrl(item.url);
    setLpDescription(item.description);
  };

  const cancelEditLaunchpad = () => {
    clearLaunchpadFeedback();
    setEditingLpId(null);
    setLpName("");
    setLpUrl("");
    setLpDescription("");
  };

  const removeLaunchpad = async (id: string) => {
    if (!window.confirm("이 런치패드 항목을 삭제할까요?")) {
      return;
    }

    clearLaunchpadFeedback();
    setLaunchpadBusyId(id);
    setLaunchpadBusyAction("delete");

    try {
      const result = await requestJson<{ ok: true }>(`/api/launchpad/${id}`, { method: "DELETE" });

      if (!result.ok) {
        setLaunchpadError(`삭제 실패: ${result.error}`);
        return;
      }

      if (editingLpId === id) {
        setEditingLpId(null);
        setLpName("");
        setLpUrl("");
        setLpDescription("");
        safeStorageRemove(LAUNCHPAD_DRAFT_STORAGE_KEY);
      }

      setLaunchpadNotice("런치패드 항목을 삭제했어요.");
      await refresh();
    } finally {
      clearLaunchpadBusy();
    }
  };

  const toggleLaunchpadEnabled = async (item: LaunchpadItem) => {
    clearLaunchpadFeedback();
    setLaunchpadBusyId(item.id);
    setLaunchpadBusyAction("toggle");

    try {
      const result = await requestJson<LaunchpadItem>(`/api/launchpad/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !item.enabled }),
      });

      if (!result.ok) {
        setLaunchpadError(`상태 변경 실패: ${result.error}`);
        return;
      }

      setLaunchpadNotice(item.enabled ? "런치패드를 비활성화했어요." : "런치패드를 활성화했어요.");
      await refresh();
    } finally {
      clearLaunchpadBusy();
    }
  };

  const runLaunchpad = async (item: LaunchpadItem) => {
    if (!item.enabled) return;

    clearLaunchpadFeedback();
    setLaunchpadBusyId(item.id);
    setLaunchpadBusyAction("run");

    const launchWindow = window.open("about:blank", "_blank", "noopener,noreferrer");

    const closeLaunchWindow = () => {
      if (launchWindow && !launchWindow.closed) {
        launchWindow.close();
      }
    };

    const openTarget = (url: string) => {
      if (launchWindow) {
        launchWindow.location.href = url;
      } else {
        window.location.assign(url);
      }
    };

    try {
      if (launchWindow) {
        launchWindow.document.title = "런치패드 실행 중";
        launchWindow.document.body.innerHTML =
          "<p style='font-family:sans-serif;padding:16px'>런치패드 실행 중...</p>";
      }

      const result = await requestJson<LaunchpadItem>(`/api/launchpad/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "launch" }),
      });

      if (!result.ok) {
        const recoverableError = result.status === 0 || result.status >= 500;

        if (recoverableError) {
          openTarget(item.url);
          setLaunchpadError(`실행 기록 저장에 실패했어요: ${result.error}`);
          setLaunchpadNotice(
            launchWindow
              ? `"${item.name}" 링크는 바로 열어드렸어요.`
              : `"${item.name}" 링크를 현재 탭에서 열었어요. (팝업 차단)`,
          );
          return;
        }

        closeLaunchWindow();
        setLaunchpadError(`실행 실패: ${result.error}`);
        return;
      }

      openTarget(result.data.url);
      setLaunchpadNotice(
        launchWindow
          ? `"${result.data.name}" 실행 완료`
          : `"${result.data.name}" 실행 완료 (팝업 차단으로 현재 탭에서 열었어요).`,
      );

      if (launchWindow) {
        await refresh();
      }
    } catch {
      try {
        openTarget(item.url);
        setLaunchpadError("실행 기록 저장에는 실패했지만, 링크는 직접 열었어요.");
        if (!launchWindow) {
          setLaunchpadNotice(`"${item.name}" 링크를 현재 탭에서 열었어요. (팝업 차단)`);
        }
      } catch {
        closeLaunchWindow();
        setLaunchpadError("실행 중 예기치 못한 오류가 발생했어요. 다시 시도해주세요.");
      }
    } finally {
      clearLaunchpadBusy();
    }
  };

  const copyLaunchpadUrl = async (url: string) => {
    clearLaunchpadFeedback();

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setLaunchpadNotice("링크를 클립보드에 복사했어요.");
        return;
      }

      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      const copied = document.execCommand("copy");
      document.body.removeChild(textarea);

      if (!copied) {
        throw new Error("execCommand copy failed");
      }

      setLaunchpadNotice("링크를 클립보드에 복사했어요.");
    } catch {
      setLaunchpadError("링크 복사에 실패했어요. 브라우저 권한을 확인해주세요.");
    }
  };

  return (
    <main className={styles.page}>
      <h1>개인 운영 대시보드</h1>
      <p className={styles.sub}>오늘 해야 할 일, 집중 시간, 울산 날씨를 한 번에 확인해요.</p>
      {pageError && <p className={styles.errorBanner}>{pageError}</p>}

      <section className={styles.grid}>
        <div className={styles.card}>
          <h2>오늘 요약</h2>
          <ul>
            <li>
              할 일 완료율: <b>{doneRate}%</b>
            </li>
            <li>
              오늘 집중 시간: <b>{stats?.focusMinutesToday ?? 0}분</b>
            </li>
            <li>
              등록된 할 일: <b>{stats?.totalTasks ?? 0}개</b>
            </li>
            <li>
              오늘 기록 메모: <b>{stats?.journalsCount ?? 0}개</b>
            </li>
          </ul>
          <div className={styles.focusButtons}>
            <button onClick={() => addFocusSession(25)}>+25분 집중</button>
            <button onClick={() => addFocusSession(50)}>+50분 집중</button>
          </div>
        </div>

        <div className={styles.card}>
          <h2>울산 날씨</h2>
          {weather ? (
            <ul>
              <li>
                현재: <b>{weather.currentTemp}°C</b> (체감 {weather.apparentTemp}°C)
              </li>
              <li>
                최고/최저: <b>{weather.maxTemp}°C / {weather.minTemp}°C</b>
              </li>
            </ul>
          ) : (
            <p>날씨 정보를 불러오는 중...</p>
          )}
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.sectionHeader}>
          <h2>런치패드</h2>
          <button
            className={styles.secondaryButton}
            onClick={() => void refresh()}
            disabled={isRefreshing}
          >
            {isRefreshing ? "동기화 중..." : "새로고침"}
          </button>
        </div>

        <div className={styles.addRowLaunchpad}>
          <input
            placeholder="도구 이름 (예: Github Issues)"
            value={lpName}
            maxLength={LAUNCHPAD_NAME_MAX}
            onChange={(e) => setLpName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void saveLaunchpad()}
            disabled={launchpadSaving}
          />
          <input
            placeholder="https://..."
            value={lpUrl}
            onChange={(e) => setLpUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void saveLaunchpad()}
            disabled={launchpadSaving}
          />
          <input
            placeholder="설명 (선택)"
            value={lpDescription}
            maxLength={LAUNCHPAD_DESCRIPTION_MAX}
            onChange={(e) => setLpDescription(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void saveLaunchpad()}
            disabled={launchpadSaving}
          />
          <button disabled={launchpadSaving} onClick={saveLaunchpad}>
            {launchpadSaving ? "저장 중..." : editingLpId ? "수정 저장" : "추가"}
          </button>
          {editingLpId && (
            <button
              onClick={cancelEditLaunchpad}
              className={styles.secondaryButton}
              disabled={launchpadSaving}
            >
              수정 취소
            </button>
          )}
        </div>

        <p className={styles.helperText}>
          이름 {lpName.trim().length}/{LAUNCHPAD_NAME_MAX} · 설명 {lpDescription.trim().length}/
          {LAUNCHPAD_DESCRIPTION_MAX}
        </p>

        <div className={styles.launchpadFilterRow}>
          <input
            className={styles.launchpadSearchInput}
            placeholder="런치패드 검색 (이름, 설명, URL)"
            value={launchpadQuery}
            onChange={(e) => setLaunchpadQuery(e.target.value)}
            disabled={launchpadSaving}
          />
          <select
            className={styles.launchpadFilterSelect}
            value={launchpadFilter}
            onChange={(e) => setLaunchpadFilter(e.target.value as LaunchpadFilter)}
            disabled={launchpadSaving}
          >
            <option value="all">전체</option>
            <option value="enabled">활성만</option>
            <option value="disabled">비활성만</option>
          </select>
          <span className={styles.launchpadCountText}>
            표시 {filteredLaunchpad.length} / 전체 {launchpad.length}
          </span>
        </div>

        <p className={styles.syncText}>
          {launchpadLastSyncedAt
            ? `${launchpadUsingCachedData ? "캐시 데이터 표시 중 · " : ""}최근 동기화 ${new Date(launchpadLastSyncedAt).toLocaleString("ko-KR")}`
            : launchpadUsingCachedData
              ? "캐시 데이터 표시 중 (동기화 시각 정보 없음)"
              : "동기화 시각 정보 없음"}
        </p>

        {launchpadNotice && (
          <p className={styles.noticeText} role="status">
            {launchpadNotice}
          </p>
        )}
        {launchpadError && (
          <p className={styles.errorText} role="alert">
            {launchpadError}
          </p>
        )}

        <div className={styles.tasks}>
          {launchpad.length === 0 && <p>런치패드 항목이 없습니다. 자주 여는 링크를 등록해보세요.</p>}
          {launchpad.length > 0 && filteredLaunchpad.length === 0 && (
            <p>검색/필터 조건에 맞는 런치패드가 없습니다.</p>
          )}
          {filteredLaunchpad.map((item) => {
            const isBusy = launchpadBusyId === item.id;

            return (
              <div key={item.id} className={styles.taskItem}>
                <div>
                  <b>{item.name}</b>
                  <p className={styles.eventTime}>{item.description || "설명 없음"}</p>
                  <p className={styles.linkLine}>
                    <a href={item.url} target="_blank" rel="noreferrer">
                      {item.url}
                    </a>
                  </p>
                  <p className={styles.eventTime}>
                    실행 {item.launchCount}회 · 최근 실행{" "}
                    {item.lastLaunchedAt ? new Date(item.lastLaunchedAt).toLocaleString("ko-KR") : "없음"}
                  </p>
                </div>
                <span className={`${styles.priority} ${item.enabled ? styles.activeStatus : styles.inactiveStatus}`}>
                  {item.enabled ? "활성" : "비활성"}
                </span>
                <div className={styles.rowActions}>
                  <button disabled={!item.enabled || isBusy} onClick={() => void runLaunchpad(item)}>
                    {isBusy && launchpadBusyAction === "run" ? "실행 중..." : "실행"}
                  </button>
                  <button disabled={isBusy} onClick={() => void toggleLaunchpadEnabled(item)}>
                    {isBusy && launchpadBusyAction === "toggle"
                      ? "변경 중..."
                      : item.enabled
                        ? "비활성화"
                        : "활성화"}
                  </button>
                  <button disabled={isBusy} onClick={() => editLaunchpad(item)}>
                    수정
                  </button>
                  <button disabled={isBusy} onClick={() => void copyLaunchpadUrl(item.url)}>
                    링크 복사
                  </button>
                  <button disabled={isBusy} onClick={() => void removeLaunchpad(item.id)}>
                    {isBusy && launchpadBusyAction === "delete" ? "삭제 중..." : "삭제"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className={styles.card}>
        <h2>오늘 할 일</h2>
        <div className={styles.addRow}>
          <input
            placeholder="예: 오늘 제안서 1차안 완성"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void addTask()}
          />
          <select value={priority} onChange={(e) => setPriority(e.target.value as "high" | "medium" | "low")}>
            <option value="high">중요</option>
            <option value="medium">보통</option>
            <option value="low">낮음</option>
          </select>
          <button disabled={addingTask} onClick={() => void addTask()}>
            {addingTask ? "추가 중..." : "추가"}
          </button>
        </div>

        <div className={styles.tasks}>
          {tasks.length === 0 && <p>아직 할 일이 없습니다. 하나 추가해볼까요?</p>}
          {tasks.map((task) => (
            <div key={task.id} className={styles.taskItem}>
              <label>
                <input type="checkbox" checked={task.done} onChange={() => void toggleTask(task)} />
                <span className={task.done ? styles.done : ""}>{task.title}</span>
              </label>
              <span className={styles.priority}>
                {task.priority === "high" ? "중요" : task.priority === "medium" ? "보통" : "낮음"}
              </span>
              <button onClick={() => void removeTask(task.id)}>삭제</button>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.card}>
        <h2>하루 메모</h2>
        <div className={styles.addRowJournal}>
          <input
            placeholder="예: 오전엔 집중 잘됐고, 오후엔 회의가 길어짐"
            value={journalInput}
            onChange={(e) => setJournalInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void addJournal()}
          />
          <button onClick={() => void addJournal()}>메모 추가</button>
        </div>

        <div className={styles.tasks}>
          {journals.length === 0 && <p>아직 메모가 없습니다.</p>}
          {journals.map((journal) => (
            <div key={journal.id} className={styles.taskItem}>
              <div>
                <b>{journal.text}</b>
                <p className={styles.eventTime}>{new Date(journal.createdAt).toLocaleString("ko-KR")}</p>
              </div>
              <span className={styles.priority}>메모</span>
              <button onClick={() => void removeJournal(journal.id)}>삭제</button>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.card}>
        <h2>캘린더 일정</h2>
        <div className={styles.addRowCalendar}>
          <input
            placeholder="예: 오후 3시 팀 미팅"
            value={eventTitle}
            onChange={(e) => setEventTitle(e.target.value)}
          />
          <input
            type="datetime-local"
            value={eventWhen}
            onChange={(e) => setEventWhen(e.target.value)}
          />
          <button onClick={() => void addEvent()}>일정 추가</button>
        </div>

        <div className={styles.tasks}>
          {events.length === 0 && <p>등록된 일정이 없습니다.</p>}
          {events.map((event) => (
            <div key={event.id} className={styles.taskItem}>
              <div>
                <b>{event.title}</b>
                <p className={styles.eventTime}>{new Date(event.when).toLocaleString("ko-KR")}</p>
              </div>
              <span className={styles.priority}>일정</span>
              <button onClick={() => void removeEvent(event.id)}>삭제</button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
