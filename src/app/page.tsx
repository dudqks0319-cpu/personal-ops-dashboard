"use client";

import { useEffect, useState } from "react";
import {
  calculateGoalProgress,
  getMonthKey,
  normalizeStoredMonthlyGoals,
  type MonthlyGoalItem,
  type MonthlyGoalsByMonth,
} from "@/lib/monthlyGoals";
import styles from "./page.module.css";

type Priority = "high" | "medium" | "low";

type TodoItem = {
  id: string;
  text: string;
  done: boolean;
  priority: Priority;
};

type GithubRepo = {
  id: number;
  name: string;
  htmlUrl: string;
  description: string;
  stars: number;
  updatedAt: string;
};

type CalendarCell = {
  day: number;
  inCurrentMonth: boolean;
  isToday: boolean;
};

const TODOS_STORAGE_KEY = "personal_dashboard_todos";
const GITHUB_USER_STORAGE_KEY = "personal_dashboard_github_user";
const MONTHLY_GOALS_STORAGE_KEY = "personal_dashboard_monthly_goals_by_month";
const DEFAULT_GITHUB_USER = "dudqks0319-cpu";
const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

function formatDateWithWeekday(date: Date): string {
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function buildCalendarCells(referenceDate: Date): CalendarCell[] {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const firstDayWeekIndex = new Date(year, month, 1).getDay();
  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
  const daysInPreviousMonth = new Date(year, month, 0).getDate();
  const today = new Date();

  const cells: CalendarCell[] = [];

  for (let i = firstDayWeekIndex - 1; i >= 0; i -= 1) {
    cells.push({
      day: daysInPreviousMonth - i,
      inCurrentMonth: false,
      isToday: false,
    });
  }

  for (let day = 1; day <= daysInCurrentMonth; day += 1) {
    const isToday =
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day;

    cells.push({
      day,
      inCurrentMonth: true,
      isToday,
    });
  }

  while (cells.length < 42) {
    cells.push({
      day: cells.length - (firstDayWeekIndex + daysInCurrentMonth) + 1,
      inCurrentMonth: false,
      isToday: false,
    });
  }

  return cells;
}

function normalizeStoredTodos(raw: unknown): TodoItem[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;

    const text = typeof record.text === "string" ? record.text.trim() : "";
    if (!text) return [];

    const priority =
      record.priority === "high" || record.priority === "low" || record.priority === "medium"
        ? record.priority
        : "medium";

    const id =
      typeof record.id === "string" && record.id.trim()
        ? record.id
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    return [
      {
        id,
        text,
        done: Boolean(record.done),
        priority,
      },
    ];
  });
}

export default function DashboardPage() {
  const [now, setNow] = useState(() => new Date());
  const [todoInput, setTodoInput] = useState("");
  const [todoPriority, setTodoPriority] = useState<Priority>("medium");
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  const [goalInput, setGoalInput] = useState("");
  const [monthlyGoalsByMonth, setMonthlyGoalsByMonth] = useState<MonthlyGoalsByMonth>({});

  const [githubUserInput, setGithubUserInput] = useState(DEFAULT_GITHUB_USER);
  const [githubUser, setGithubUser] = useState(DEFAULT_GITHUB_USER);
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [isRepoLoading, setIsRepoLoading] = useState(false);
  const [repoError, setRepoError] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      const savedTodos = localStorage.getItem(TODOS_STORAGE_KEY);
      if (savedTodos) {
        const parsed = JSON.parse(savedTodos) as unknown;
        setTodos(normalizeStoredTodos(parsed));
      }

      const savedMonthlyGoals = localStorage.getItem(MONTHLY_GOALS_STORAGE_KEY);
      if (savedMonthlyGoals) {
        const parsed = JSON.parse(savedMonthlyGoals) as unknown;
        setMonthlyGoalsByMonth(normalizeStoredMonthlyGoals(parsed));
      }

      const savedGithubUser = localStorage.getItem(GITHUB_USER_STORAGE_KEY);
      if (savedGithubUser && savedGithubUser.trim()) {
        setGithubUser(savedGithubUser.trim());
        setGithubUserInput(savedGithubUser.trim());
      }
    } catch {
      setTodos([]);
      setMonthlyGoalsByMonth({});
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(TODOS_STORAGE_KEY, JSON.stringify(todos));
  }, [todos, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(MONTHLY_GOALS_STORAGE_KEY, JSON.stringify(monthlyGoalsByMonth));
  }, [monthlyGoalsByMonth, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(GITHUB_USER_STORAGE_KEY, githubUser);
  }, [githubUser, isHydrated]);

  useEffect(() => {
    const controller = new AbortController();

    const loadRepos = async () => {
      setIsRepoLoading(true);
      setRepoError("");

      try {
        const response = await fetch(
          `https://api.github.com/users/${encodeURIComponent(githubUser)}/repos?sort=updated&per_page=12`,
          {
            signal: controller.signal,
            headers: {
              Accept: "application/vnd.github+json",
            },
          },
        );

        if (!response.ok) {
          throw new Error("GitHub 저장소 목록을 불러오지 못했습니다.");
        }

        const payload = (await response.json()) as unknown;
        if (!Array.isArray(payload)) {
          throw new Error("GitHub 응답 형식이 올바르지 않습니다.");
        }

        const nextRepos: GithubRepo[] = payload.flatMap((item) => {
          if (!item || typeof item !== "object") return [];
          const record = item as Record<string, unknown>;

          if (
            typeof record.id !== "number" ||
            typeof record.name !== "string" ||
            typeof record.html_url !== "string" ||
            typeof record.updated_at !== "string"
          ) {
            return [];
          }

          return [
            {
              id: record.id,
              name: record.name,
              htmlUrl: record.html_url,
              description: typeof record.description === "string" ? record.description : "",
              stars: typeof record.stargazers_count === "number" ? record.stargazers_count : 0,
              updatedAt: record.updated_at,
            },
          ];
        });

        setRepos(nextRepos);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setRepoError("저장소를 불러오지 못했습니다. 사용자명 또는 네트워크를 확인해주세요.");
        setRepos([]);
      } finally {
        setIsRepoLoading(false);
      }
    };

    void loadRepos();
    return () => controller.abort();
  }, [githubUser]);

  const monthLabel = now.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
  });

  const currentMonthKey = getMonthKey(now);
  const currentMonthGoals = monthlyGoalsByMonth[currentMonthKey] ?? [];
  const currentMonthGoalProgress = calculateGoalProgress(currentMonthGoals);
  const calendarCells = buildCalendarCells(now);

  const updateCurrentMonthGoals = (updater: (goals: MonthlyGoalItem[]) => MonthlyGoalItem[]) => {
    setMonthlyGoalsByMonth((prev) => {
      const currentGoals = prev[currentMonthKey] ?? [];
      const nextGoals = updater(currentGoals);

      if (nextGoals.length === 0) {
        const { [currentMonthKey]: removed, ...rest } = prev;
        void removed;
        return rest;
      }

      return {
        ...prev,
        [currentMonthKey]: nextGoals,
      };
    });
  };

  const addTodo = () => {
    const text = todoInput.trim();
    if (!text) return;

    setTodos((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text,
        done: false,
        priority: todoPriority,
      },
      ...prev,
    ]);
    setTodoInput("");
    setTodoPriority("medium");
  };

  const addMonthlyGoal = () => {
    const text = goalInput.trim();
    if (!text) return;

    updateCurrentMonthGoals((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text,
        done: false,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);

    setGoalInput("");
  };

  const toggleTodo = (id: string) => {
    setTodos((prev) => prev.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo)));
  };

  const toggleMonthlyGoal = (id: string) => {
    updateCurrentMonthGoals((prev) =>
      prev.map((goal) => (goal.id === id ? { ...goal, done: !goal.done } : goal)),
    );
  };

  const deleteTodo = (id: string) => {
    setTodos((prev) => prev.filter((todo) => todo.id !== id));
  };

  const deleteMonthlyGoal = (id: string) => {
    updateCurrentMonthGoals((prev) => prev.filter((goal) => goal.id !== id));
  };

  const submitGithubUser = () => {
    const next = githubUserInput.trim();
    if (!next) return;
    setGithubUser(next);
  };

  return (
    <main className={styles.page}>
      <h1>개인 운영 대시보드</h1>
      <p className={styles.sub}>현재 날짜/시간, 할 일, 월간 목표, GitHub 저장소를 한 화면에서 확인합니다.</p>

      <section className={styles.card} style={{ marginBottom: 16 }}>
        <div className={styles.sectionHeader}>
          <h2>현재 시간</h2>
        </div>
        <p style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>{formatDateWithWeekday(now)}</p>
        <p style={{ color: "var(--muted)", fontSize: 18 }}>{formatTime(now)}</p>
      </section>

      <div className={styles.grid}>
        <section className={styles.card}>
          <div className={styles.sectionHeader}>
            <h2>이번 달 달력</h2>
            <span className={styles.priority}>{monthLabel}</span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
              gap: 6,
              marginBottom: 8,
            }}
          >
            {WEEKDAY_KO.map((day, idx) => (
              <div
                key={day}
                style={{
                  textAlign: "center",
                  color: idx === 0 ? "#ef4444" : idx === 6 ? "#3b82f6" : "var(--muted)",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {day}
              </div>
            ))}
            {calendarCells.map((cell, index) => {
              const colIndex = index % 7;
              const isSunday = colIndex === 0;
              const isSaturday = colIndex === 6;
              const weekendColor = isSunday ? "#ef4444" : isSaturday ? "#3b82f6" : "var(--text)";
              return (
                <div
                  key={`${cell.day}-${index}`}
                  style={{
                    minHeight: 34,
                    borderRadius: 10,
                    border: "1px solid rgba(15, 23, 42, 0.08)",
                    background: cell.isToday ? "#dbeafe" : "rgba(255,255,255,0.78)",
                    color: cell.inCurrentMonth ? weekendColor : "var(--muted)",
                    opacity: cell.inCurrentMonth ? 1 : 0.65,
                    display: "grid",
                    placeItems: "center",
                    fontWeight: cell.isToday ? 700 : 500,
                  }}
                >
                  {cell.day}
                </div>
              );
            })}
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.sectionHeader}>
            <h2>투두리스트</h2>
            <span className={styles.priority}>{todos.filter((todo) => !todo.done).length}개 남음</span>
          </div>

          <div className={styles.addRow}>
            <input
              value={todoInput}
              onChange={(event) => setTodoInput(event.target.value)}
              placeholder="할 일을 입력해주세요"
              onKeyDown={(event) => {
                if (event.key === "Enter") addTodo();
              }}
            />
            <select
              value={todoPriority}
              onChange={(event) => setTodoPriority(event.target.value as Priority)}
            >
              <option value="high">높음</option>
              <option value="medium">보통</option>
              <option value="low">낮음</option>
            </select>
            <button onClick={addTodo}>추가</button>
          </div>

          <div className={styles.tasks}>
            {todos.length === 0 ? (
              <p style={{ color: "var(--muted)" }}>등록된 할 일이 없습니다.</p>
            ) : (
              todos.map((todo) => (
                <div className={styles.taskItem} key={todo.id}>
                  <label>
                    <input type="checkbox" checked={todo.done} onChange={() => toggleTodo(todo.id)} />
                    <span className={todo.done ? styles.done : ""}>{todo.text}</span>
                  </label>
                  <span
                    className={`${styles.priority} ${
                      todo.priority === "high"
                        ? styles.priorityHigh
                        : todo.priority === "low"
                          ? styles.priorityLow
                          : styles.priorityMedium
                    }`}
                  >
                    {todo.priority === "high" ? "높음" : todo.priority === "low" ? "낮음" : "보통"}
                  </span>
                  <button onClick={() => deleteTodo(todo.id)}>삭제</button>
                </div>
              ))
            )}
          </div>
          {todos.some((todo) => todo.done) && (
            <button
              className={styles.clearCompletedBtn}
              onClick={() => setTodos((prev) => prev.filter((t) => !t.done))}
            >
              완료된 항목 모두 삭제
            </button>
          )}
        </section>

        <section className={styles.card}>
          <div className={styles.sectionHeader}>
            <h2>월간 목표</h2>
            <span className={styles.priority}>{monthLabel}</span>
          </div>

          <div className={styles.addRowJournal}>
            <input
              value={goalInput}
              onChange={(event) => setGoalInput(event.target.value)}
              placeholder="이번 달 목표를 입력해주세요"
              onKeyDown={(event) => {
                if (event.key === "Enter") addMonthlyGoal();
              }}
            />
            <button onClick={addMonthlyGoal}>추가</button>
          </div>

          <div className={styles.goalProgressWrap}>
            <div className={styles.goalProgressTrack}>
              <div
                className={styles.goalProgressFill}
                style={{ width: `${currentMonthGoalProgress.percent}%` }}
              />
            </div>
            <p className={styles.helperText}>
              {currentMonthGoalProgress.total === 0
                ? "아직 등록된 월간 목표가 없습니다."
                : `달성률 ${currentMonthGoalProgress.percent}% · ${currentMonthGoalProgress.completed}/${currentMonthGoalProgress.total} 완료`}
            </p>
          </div>

          <div className={styles.tasks}>
            {currentMonthGoals.length === 0 ? (
              <p style={{ color: "var(--muted)" }}>이번 달 목표가 없습니다.</p>
            ) : (
              currentMonthGoals.map((goal) => (
                <div className={styles.taskItem} key={goal.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={goal.done}
                      onChange={() => toggleMonthlyGoal(goal.id)}
                    />
                    <span className={goal.done ? styles.done : ""}>{goal.text}</span>
                  </label>
                  <span
                    className={`${styles.priority} ${goal.done ? styles.goalStatusDone : styles.goalStatusPending}`}
                  >
                    {goal.done ? "완료" : "진행중"}
                  </span>
                  <button onClick={() => deleteMonthlyGoal(goal.id)}>삭제</button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className={styles.card}>
        <div className={styles.sectionHeader}>
          <h2>GitHub 저장소</h2>
        </div>

        <div className={styles.addRowJournal}>
          <input
            value={githubUserInput}
            onChange={(event) => setGithubUserInput(event.target.value)}
            placeholder="GitHub 사용자명"
            onKeyDown={(event) => {
              if (event.key === "Enter") submitGithubUser();
            }}
          />
          <button onClick={submitGithubUser}>불러오기</button>
        </div>

        <p className={styles.helperText}>
          현재 사용자: <strong>{githubUser}</strong>
        </p>

        {isRepoLoading && <p style={{ color: "var(--muted)" }}>저장소를 불러오는 중입니다...</p>}
        {repoError && <p className={styles.errorText}>{repoError}</p>}

        {!isRepoLoading && !repoError && (
          <>
            {repos.length === 0 ? (
              <p style={{ color: "var(--muted)" }}>표시할 저장소가 없습니다.</p>
            ) : (
              <div className={styles.repoGrid}>
                {repos.map((repo) => (
                  <a
                    key={repo.id}
                    href={repo.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.repoCard}
                  >
                    <div className={styles.repoCardName}>{repo.name}</div>
                    {repo.description && (
                      <div className={styles.repoCardDesc}>{repo.description}</div>
                    )}
                    <div className={styles.repoCardMeta}>
                      <span>⭐ {repo.stars}</span>
                      <span>업데이트 {new Date(repo.updatedAt).toLocaleDateString("ko-KR")}</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
