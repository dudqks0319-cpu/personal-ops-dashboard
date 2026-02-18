"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [loading, setLoading] = useState(false);

  const doneRate = useMemo(() => {
    if (!stats || stats.totalTasks === 0) return 0;
    return Math.round((stats.doneTasks / stats.totalTasks) * 100);
  }, [stats]);

  const refresh = async () => {
    const [tasksRes, statsRes, weatherRes, eventsRes, journalsRes, launchpadRes] = await Promise.all([
      fetch("/api/tasks"),
      fetch("/api/stats"),
      fetch("/api/weather"),
      fetch("/api/events"),
      fetch("/api/journals"),
      fetch("/api/launchpad"),
    ]);

    setTasks(await tasksRes.json());
    setStats(await statsRes.json());
    setEvents(await eventsRes.json());
    setJournals(await journalsRes.json());
    setLaunchpad(await launchpadRes.json());

    if (weatherRes.ok) {
      setWeather(await weatherRes.json());
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, []);

  const addTask = async () => {
    if (!input.trim()) return;
    setLoading(true);
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: input, priority }),
    });
    setInput("");
    await refresh();
    setLoading(false);
  };

  const toggleTask = async (task: Task) => {
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !task.done }),
    });
    await refresh();
  };

  const removeTask = async (id: string) => {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    await refresh();
  };

  const addFocusSession = async (minutes: number) => {
    await fetch("/api/focus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minutes }),
    });
    await refresh();
  };

  const addEvent = async () => {
    if (!eventTitle.trim() || !eventWhen) return;
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: eventTitle, when: eventWhen }),
    });
    setEventTitle("");
    setEventWhen("");
    await refresh();
  };

  const removeEvent = async (id: string) => {
    await fetch(`/api/events/${id}`, { method: "DELETE" });
    await refresh();
  };

  const addJournal = async () => {
    if (!journalInput.trim()) return;
    await fetch("/api/journals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: journalInput }),
    });
    setJournalInput("");
    await refresh();
  };

  const removeJournal = async (id: string) => {
    await fetch(`/api/journals/${id}`, { method: "DELETE" });
    await refresh();
  };

  const saveLaunchpad = async () => {
    if (!lpName.trim() || !lpUrl.trim()) return;

    if (editingLpId) {
      await fetch(`/api/launchpad/${editingLpId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: lpName, url: lpUrl, description: lpDescription }),
      });
    } else {
      await fetch("/api/launchpad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: lpName, url: lpUrl, description: lpDescription }),
      });
    }

    setLpName("");
    setLpUrl("");
    setLpDescription("");
    setEditingLpId(null);
    await refresh();
  };

  const editLaunchpad = (item: LaunchpadItem) => {
    setEditingLpId(item.id);
    setLpName(item.name);
    setLpUrl(item.url);
    setLpDescription(item.description);
  };

  const cancelEditLaunchpad = () => {
    setEditingLpId(null);
    setLpName("");
    setLpUrl("");
    setLpDescription("");
  };

  const removeLaunchpad = async (id: string) => {
    await fetch(`/api/launchpad/${id}`, { method: "DELETE" });
    if (editingLpId === id) {
      cancelEditLaunchpad();
    }
    await refresh();
  };

  const toggleLaunchpadEnabled = async (item: LaunchpadItem) => {
    await fetch(`/api/launchpad/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !item.enabled }),
    });
    await refresh();
  };

  const runLaunchpad = async (item: LaunchpadItem) => {
    if (!item.enabled) return;

    await fetch(`/api/launchpad/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "launch" }),
    });

    window.open(item.url, "_blank", "noopener,noreferrer");
    await refresh();
  };

  return (
    <main className={styles.page}>
      <h1>개인 운영 대시보드</h1>
      <p className={styles.sub}>오늘 해야 할 일, 집중 시간, 울산 날씨를 한 번에 확인해요.</p>

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
        <h2>런치패드</h2>
        <div className={styles.addRowLaunchpad}>
          <input
            placeholder="도구 이름 (예: Github Issues)"
            value={lpName}
            onChange={(e) => setLpName(e.target.value)}
          />
          <input
            placeholder="https://..."
            value={lpUrl}
            onChange={(e) => setLpUrl(e.target.value)}
          />
          <input
            placeholder="설명 (선택)"
            value={lpDescription}
            onChange={(e) => setLpDescription(e.target.value)}
          />
          <button onClick={saveLaunchpad}>{editingLpId ? "수정 저장" : "추가"}</button>
          {editingLpId && (
            <button onClick={cancelEditLaunchpad} className={styles.secondaryButton}>
              수정 취소
            </button>
          )}
        </div>

        <div className={styles.tasks}>
          {launchpad.length === 0 && <p>런치패드 항목이 없습니다. 자주 여는 링크를 등록해보세요.</p>}
          {launchpad.map((item) => (
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
                  실행 {item.launchCount}회 · 최근 실행 {item.lastLaunchedAt ? new Date(item.lastLaunchedAt).toLocaleString("ko-KR") : "없음"}
                </p>
              </div>
              <span className={`${styles.priority} ${item.enabled ? styles.activeStatus : styles.inactiveStatus}`}>
                {item.enabled ? "활성" : "비활성"}
              </span>
              <div className={styles.rowActions}>
                <button disabled={!item.enabled} onClick={() => runLaunchpad(item)}>
                  실행
                </button>
                <button onClick={() => toggleLaunchpadEnabled(item)}>{item.enabled ? "비활성화" : "활성화"}</button>
                <button onClick={() => editLaunchpad(item)}>수정</button>
                <button onClick={() => removeLaunchpad(item.id)}>삭제</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.card}>
        <h2>오늘 할 일</h2>
        <div className={styles.addRow}>
          <input
            placeholder="예: 오늘 제안서 1차안 완성"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
          />
          <select value={priority} onChange={(e) => setPriority(e.target.value as "high" | "medium" | "low")}>
            <option value="high">중요</option>
            <option value="medium">보통</option>
            <option value="low">낮음</option>
          </select>
          <button disabled={loading} onClick={addTask}>추가</button>
        </div>

        <div className={styles.tasks}>
          {tasks.length === 0 && <p>아직 할 일이 없습니다. 하나 추가해볼까요?</p>}
          {tasks.map((task) => (
            <div key={task.id} className={styles.taskItem}>
              <label>
                <input type="checkbox" checked={task.done} onChange={() => toggleTask(task)} />
                <span className={task.done ? styles.done : ""}>{task.title}</span>
              </label>
              <span className={styles.priority}>
                {task.priority === "high" ? "중요" : task.priority === "medium" ? "보통" : "낮음"}
              </span>
              <button onClick={() => removeTask(task.id)}>삭제</button>
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
            onKeyDown={(e) => e.key === "Enter" && addJournal()}
          />
          <button onClick={addJournal}>메모 추가</button>
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
              <button onClick={() => removeJournal(journal.id)}>삭제</button>
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
          <button onClick={addEvent}>일정 추가</button>
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
              <button onClick={() => removeEvent(event.id)}>삭제</button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
