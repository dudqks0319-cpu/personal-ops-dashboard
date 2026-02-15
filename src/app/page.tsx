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

  const [input, setInput] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");

  const [eventTitle, setEventTitle] = useState("");
  const [eventWhen, setEventWhen] = useState("");

  const [stats, setStats] = useState<Stats | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(false);

  const doneRate = useMemo(() => {
    if (!stats || stats.totalTasks === 0) return 0;
    return Math.round((stats.doneTasks / stats.totalTasks) * 100);
  }, [stats]);

  const refresh = async () => {
    const [tasksRes, statsRes, weatherRes, eventsRes] = await Promise.all([
      fetch("/api/tasks"),
      fetch("/api/stats"),
      fetch("/api/weather"),
      fetch("/api/events"),
    ]);

    setTasks(await tasksRes.json());
    setStats(await statsRes.json());
    setEvents(await eventsRes.json());

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
