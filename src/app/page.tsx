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

async function requestJson<T>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, init);

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
  } catch {
    return {
      ok: false,
      status: 0,
      error: "네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    };
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
  const [launchpadError, setLaunchpadError] = useState<string | null>(null);
  const [launchpadNotice, setLaunchpadNotice] = useState<string | null>(null);

  const doneRate = useMemo(() => {
    if (!stats || stats.totalTasks === 0) return 0;
    return Math.round((stats.doneTasks / stats.totalTasks) * 100);
  }, [stats]);

  const clearLaunchpadFeedback = () => {
    setLaunchpadError(null);
    setLaunchpadNotice(null);
  };

  const refresh = useCallback(async () => {
    setIsRefreshing(true);

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
      setLaunchpad(launchpadRes.data);
      setLaunchpadError((prev) => {
        if (prev?.startsWith("런치패드 목록")) {
          return null;
        }
        return prev;
      });
    } else if (!launchpadRes.ok) {
      setLaunchpadError(`런치패드 목록을 불러오지 못했어요: ${launchpadRes.error}`);
    }

    if (failedSections.length > 0) {
      setPageError(`일부 데이터를 불러오지 못했어요 (${failedSections.join(", ")}). 잠시 후 다시 시도해주세요.`);
    } else {
      setPageError(null);
    }

    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
      setLaunchpadError(`저장 실패: ${result.error}`);
      setLaunchpadSaving(false);
      return;
    }

    setLpName("");
    setLpUrl("");
    setLpDescription("");
    setEditingLpId(null);
    setLaunchpadNotice(editingLpId ? "런치패드 항목을 수정했어요." : "런치패드 항목을 추가했어요.");

    await refresh();
    setLaunchpadSaving(false);
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

    const result = await requestJson<{ ok: true }>(`/api/launchpad/${id}`, { method: "DELETE" });

    if (!result.ok) {
      setLaunchpadError(`삭제 실패: ${result.error}`);
      setLaunchpadBusyId(null);
      return;
    }

    if (editingLpId === id) {
      cancelEditLaunchpad();
    }

    setLaunchpadNotice("런치패드 항목을 삭제했어요.");
    await refresh();
    setLaunchpadBusyId(null);
  };

  const toggleLaunchpadEnabled = async (item: LaunchpadItem) => {
    clearLaunchpadFeedback();
    setLaunchpadBusyId(item.id);

    const result = await requestJson<LaunchpadItem>(`/api/launchpad/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !item.enabled }),
    });

    if (!result.ok) {
      setLaunchpadError(`상태 변경 실패: ${result.error}`);
      setLaunchpadBusyId(null);
      return;
    }

    setLaunchpadNotice(item.enabled ? "런치패드를 비활성화했어요." : "런치패드를 활성화했어요.");
    await refresh();
    setLaunchpadBusyId(null);
  };

  const runLaunchpad = async (item: LaunchpadItem) => {
    if (!item.enabled) return;

    clearLaunchpadFeedback();
    setLaunchpadBusyId(item.id);

    const launchWindow = window.open("about:blank", "_blank");
    if (!launchWindow) {
      setLaunchpadError("팝업이 차단되어 실행할 수 없어요. 브라우저 팝업 설정을 확인해주세요.");
      setLaunchpadBusyId(null);
      return;
    }

    launchWindow.document.title = "런치패드 실행 중";
    launchWindow.document.body.innerHTML = "<p style='font-family:sans-serif;padding:16px'>런치패드 실행 중...</p>";

    const result = await requestJson<LaunchpadItem>(`/api/launchpad/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "launch" }),
    });

    if (!result.ok) {
      launchWindow.close();
      setLaunchpadError(`실행 실패: ${result.error}`);
      setLaunchpadBusyId(null);
      return;
    }

    launchWindow.location.href = result.data.url;
    setLaunchpadNotice(`"${result.data.name}" 실행 완료`);
    await refresh();
    setLaunchpadBusyId(null);
  };

  const copyLaunchpadUrl = async (url: string) => {
    clearLaunchpadFeedback();

    try {
      if (!navigator.clipboard) {
        throw new Error("clipboard api unavailable");
      }

      await navigator.clipboard.writeText(url);
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
            disabled={launchpadSaving}
          />
          <input
            placeholder="https://..."
            value={lpUrl}
            onChange={(e) => setLpUrl(e.target.value)}
            disabled={launchpadSaving}
          />
          <input
            placeholder="설명 (선택)"
            value={lpDescription}
            maxLength={LAUNCHPAD_DESCRIPTION_MAX}
            onChange={(e) => setLpDescription(e.target.value)}
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
          {launchpad.map((item) => {
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
                    {isBusy ? "처리 중..." : "실행"}
                  </button>
                  <button disabled={isBusy} onClick={() => void toggleLaunchpadEnabled(item)}>
                    {item.enabled ? "비활성화" : "활성화"}
                  </button>
                  <button disabled={isBusy} onClick={() => editLaunchpad(item)}>
                    수정
                  </button>
                  <button disabled={isBusy} onClick={() => void copyLaunchpadUrl(item.url)}>
                    링크 복사
                  </button>
                  <button disabled={isBusy} onClick={() => void removeLaunchpad(item.id)}>
                    삭제
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
