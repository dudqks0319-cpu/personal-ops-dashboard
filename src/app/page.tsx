"use client";

import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  calculateGoalProgress,
  getMonthKey,
  normalizeStoredMonthlyGoals,
  type MonthlyGoalItem,
  type MonthlyGoalsByMonth,
} from "@/lib/monthlyGoals";
import {
  CHECKLIST_BUCKET_LABELS,
  DDAY_KIND_LABELS,
  FOCUS_END_DATE_KEY,
  FOCUS_START_DATE_KEY,
  NIGHT_SHIFT_ANCHOR_DATE_KEY,
  SCHEDULE_CATEGORY_LABELS,
  SHIFT_LABELS,
  calculateProgress,
  cloneDefaultChecklist,
  cloneDefaultDdays,
  cloneDefaultMilestones,
  cloneDefaultSchedules,
  formatDateKeyKo,
  getDateKey,
  getDdayStatus,
  getShiftModeForDate,
  getWeekDates,
  normalizeStoredChecklist,
  normalizeStoredChecklistByDate,
  normalizeStoredCompletionByDate,
  normalizeStoredDdays,
  normalizeStoredMilestones,
  normalizeStoredSchedule,
  normalizeStoredSchedules,
  normalizeStoredShiftOverrides,
  parseDateKey,
  sortDdaysByNextOccurrence,
  type ChecklistBucket,
  type ChecklistItem,
  type DdayItem,
  type DdayKind,
  type DdayRepeat,
  type FocusMilestone,
  type ScheduleBlock,
  type ScheduleCategory,
  type ShiftMode,
} from "@/lib/lifeOs";
import styles from "./page.module.css";

const LEGACY_TODOS_STORAGE_KEY = "personal_dashboard_todos";
const CHECKLIST_STORAGE_KEY = "personal_life_os_checklists_by_date_v1";
const MILESTONES_STORAGE_KEY = "personal_life_os_jipbab_milestones_v1";
const SCHEDULES_STORAGE_KEY = "personal_life_os_schedules_v1";
const SCHEDULE_COMPLETION_STORAGE_KEY = "personal_life_os_schedule_completion_v1";
const SHIFT_OVERRIDES_STORAGE_KEY = "personal_life_os_shift_overrides_v1";
const DDAYS_STORAGE_KEY = "personal_life_os_ddays_v1";
const MONTHLY_GOALS_STORAGE_KEY = "personal_dashboard_monthly_goals_by_month";

const JIPBAB_REPOSITORY_URL = "https://github.com/dudqks0319-cpu/jipbab-note";
const JIPBAB_RELEASE_PR_URL = "https://github.com/dudqks0319-cpu/jipbab-note/pull/9";

const BUCKET_DESCRIPTIONS: Record<ChecklistBucket, string> = {
  must: "오늘 반드시 끝낼 것 · 최대 3개",
  should: "여력이 있으면 진행할 것",
  notToday: "오늘 하지 않기로 정한 것",
};

const SCHEDULE_MODE_OPTIONS: Array<{ value: ShiftMode | "auto"; label: string }> = [
  { value: "auto", label: "근무표 자동" },
  { value: "day", label: "주간근무" },
  { value: "night", label: "야간근무" },
  { value: "off", label: "휴무" },
];

function createLocalId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatNow(date: Date): string {
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

function formatClock(date: Date): string {
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div className={styles.progressGroup}>
      <div
        className={styles.progressTrack}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
      >
        <span className={styles.progressFill} style={{ width: `${value}%` }} />
      </div>
      <span className={styles.progressValue}>{value}%</span>
    </div>
  );
}

function EmptyMessage({ children }: { children?: React.ReactNode }) {
  return <p className={styles.emptyMessage}>{children}</p>;
}

export default function DashboardPage() {
  const [now, setNow] = useState<Date | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);

  const [checklistsByDate, setChecklistsByDate] = useState<Record<string, ChecklistItem[]>>({});
  const [checklistInput, setChecklistInput] = useState("");
  const [checklistBucket, setChecklistBucket] = useState<ChecklistBucket>("must");
  const [checklistNotice, setChecklistNotice] = useState("");

  const [milestones, setMilestones] = useState<FocusMilestone[]>(() => cloneDefaultMilestones());
  const [schedules, setSchedules] = useState<Record<ShiftMode, ScheduleBlock[]>>(() =>
    cloneDefaultSchedules(),
  );
  const [scheduleCompletionByDate, setScheduleCompletionByDate] = useState<Record<string, string[]>>(
    {},
  );
  const [shiftOverrides, setShiftOverrides] = useState<Record<string, ShiftMode>>({});
  const [scheduleEditingId, setScheduleEditingId] = useState<string | null>(null);
  const [scheduleTitle, setScheduleTitle] = useState("");
  const [scheduleStart, setScheduleStart] = useState("18:00");
  const [scheduleEnd, setScheduleEnd] = useState("19:00");
  const [scheduleCategory, setScheduleCategory] = useState<ScheduleCategory>("focus");

  const [ddays, setDdays] = useState<DdayItem[]>(() => cloneDefaultDdays());
  const [ddayTitle, setDdayTitle] = useState("");
  const [ddayDate, setDdayDate] = useState("");
  const [ddayKind, setDdayKind] = useState<DdayKind>("general");
  const [ddayRepeat, setDdayRepeat] = useState<DdayRepeat>("none");

  const [goalInput, setGoalInput] = useState("");
  const [monthlyGoalsByMonth, setMonthlyGoalsByMonth] = useState<MonthlyGoalsByMonth>({});

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const currentDate = new Date();
    const currentDateKey = getDateKey(currentDate);
    setSelectedDateKey(currentDateKey);

    try {
      const savedChecklists = localStorage.getItem(CHECKLIST_STORAGE_KEY);
      if (savedChecklists) {
        setChecklistsByDate(normalizeStoredChecklistByDate(JSON.parse(savedChecklists) as unknown));
      } else {
        const legacyTodos = localStorage.getItem(LEGACY_TODOS_STORAGE_KEY);
        const migratedTodos = legacyTodos
          ? normalizeStoredChecklist(JSON.parse(legacyTodos) as unknown)
          : cloneDefaultChecklist();
        setChecklistsByDate({ [currentDateKey]: migratedTodos });
      }

      const savedMilestones = localStorage.getItem(MILESTONES_STORAGE_KEY);
      if (savedMilestones) {
        const normalized = normalizeStoredMilestones(JSON.parse(savedMilestones) as unknown);
        setMilestones(normalized.length > 0 ? normalized : cloneDefaultMilestones());
      }

      const savedSchedules = localStorage.getItem(SCHEDULES_STORAGE_KEY);
      if (savedSchedules) {
        setSchedules(normalizeStoredSchedules(JSON.parse(savedSchedules) as unknown));
      }

      const savedScheduleCompletion = localStorage.getItem(SCHEDULE_COMPLETION_STORAGE_KEY);
      if (savedScheduleCompletion) {
        setScheduleCompletionByDate(
          normalizeStoredCompletionByDate(JSON.parse(savedScheduleCompletion) as unknown),
        );
      }

      const savedShiftOverrides = localStorage.getItem(SHIFT_OVERRIDES_STORAGE_KEY);
      if (savedShiftOverrides) {
        setShiftOverrides(normalizeStoredShiftOverrides(JSON.parse(savedShiftOverrides) as unknown));
      }

      const savedDdays = localStorage.getItem(DDAYS_STORAGE_KEY);
      if (savedDdays) {
        const normalized = normalizeStoredDdays(JSON.parse(savedDdays) as unknown);
        setDdays(normalized);
      }

      const savedMonthlyGoals = localStorage.getItem(MONTHLY_GOALS_STORAGE_KEY);
      if (savedMonthlyGoals) {
        setMonthlyGoalsByMonth(
          normalizeStoredMonthlyGoals(JSON.parse(savedMonthlyGoals) as unknown),
        );
      }
    } catch {
      setChecklistsByDate({ [currentDateKey]: cloneDefaultChecklist() });
      setMilestones(cloneDefaultMilestones());
      setSchedules(cloneDefaultSchedules());
      setScheduleCompletionByDate({});
      setShiftOverrides({});
      setDdays(cloneDefaultDdays());
      setMonthlyGoalsByMonth({});
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(checklistsByDate));
    localStorage.setItem(MILESTONES_STORAGE_KEY, JSON.stringify(milestones));
    localStorage.setItem(SCHEDULES_STORAGE_KEY, JSON.stringify(schedules));
    localStorage.setItem(SCHEDULE_COMPLETION_STORAGE_KEY, JSON.stringify(scheduleCompletionByDate));
    localStorage.setItem(SHIFT_OVERRIDES_STORAGE_KEY, JSON.stringify(shiftOverrides));
    localStorage.setItem(DDAYS_STORAGE_KEY, JSON.stringify(ddays));
    localStorage.setItem(MONTHLY_GOALS_STORAGE_KEY, JSON.stringify(monthlyGoalsByMonth));
  }, [
    checklistsByDate,
    ddays,
    isHydrated,
    milestones,
    monthlyGoalsByMonth,
    scheduleCompletionByDate,
    schedules,
    shiftOverrides,
  ]);

  const fallbackDate = useMemo(() => new Date(2026, 7, 11, 12), []);
  const todayDate = now ?? fallbackDate;
  const todayKey = getDateKey(todayDate);
  const activeDateKey = selectedDateKey || todayKey;
  const activeDate = parseDateKey(activeDateKey) ?? todayDate;
  const shiftAnchor = parseDateKey(NIGHT_SHIFT_ANCHOR_DATE_KEY) ?? fallbackDate;
  const automaticShiftMode = getShiftModeForDate(activeDate, shiftAnchor);
  const activeShiftMode = shiftOverrides[activeDateKey] ?? automaticShiftMode;
  const activeChecklist = checklistsByDate[activeDateKey] ?? [];
  const activeSchedule = schedules[activeShiftMode];
  const completedScheduleIds = useMemo(
    () => new Set(scheduleCompletionByDate[activeDateKey] ?? []),
    [activeDateKey, scheduleCompletionByDate],
  );

  const weekDates = useMemo(() => getWeekDates(todayDate), [todayDate]);
  const focusProgress = calculateProgress(milestones);
  const focusDday = getDdayStatus(FOCUS_END_DATE_KEY, "none", todayDate);
  const checklistProgress = calculateProgress(activeChecklist);
  const scheduleProgress = calculateProgress(
    activeSchedule.map((item) => ({ done: completedScheduleIds.has(item.id) })),
  );
  const sortedDdays = useMemo(
    () => sortDdaysByNextOccurrence(ddays, todayDate),
    [ddays, todayDate],
  );

  const activeMonthKey = getMonthKey(activeDate);
  const activeMonthGoals = monthlyGoalsByMonth[activeMonthKey] ?? [];
  const activeMonthGoalProgress = calculateGoalProgress(activeMonthGoals);

  const todayShiftMode =
    shiftOverrides[todayKey] ?? getShiftModeForDate(todayDate, shiftAnchor);

  const updateActiveChecklist = (updater: (items: ChecklistItem[]) => ChecklistItem[]) => {
    setChecklistsByDate((previous) => ({
      ...previous,
      [activeDateKey]: updater(previous[activeDateKey] ?? []),
    }));
  };

  const addChecklistItem = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = checklistInput.trim();
    if (!text) return;

    const openMustCount = activeChecklist.filter(
      (item) => item.bucket === "must" && !item.done,
    ).length;
    if (checklistBucket === "must" && openMustCount >= 3) {
      setChecklistNotice("TODAY MUST는 미완료 항목을 최대 3개만 유지합니다.");
      return;
    }

    const priority = checklistBucket === "must" ? "high" : checklistBucket === "should" ? "medium" : "low";
    updateActiveChecklist((items) => [
      ...items,
      {
        id: createLocalId("check"),
        text,
        done: false,
        priority,
        bucket: checklistBucket,
      },
    ]);
    setChecklistInput("");
    setChecklistNotice("");
  };

  const toggleChecklistItem = (id: string) => {
    updateActiveChecklist((items) =>
      items.map((item) => (item.id === id ? { ...item, done: !item.done } : item)),
    );
  };

  const deleteChecklistItem = (id: string) => {
    updateActiveChecklist((items) => items.filter((item) => item.id !== id));
  };

  const loadDefaultChecklist = () => {
    const hasItems = activeChecklist.length > 0;
    if (hasItems && !window.confirm("이 날짜의 체크리스트를 기본값으로 바꿀까요?")) return;
    setChecklistsByDate((previous) => ({
      ...previous,
      [activeDateKey]: cloneDefaultChecklist(),
    }));
    setChecklistNotice("");
  };

  const toggleMilestone = (id: string) => {
    setMilestones((previous) =>
      previous.map((item) => (item.id === id ? { ...item, done: !item.done } : item)),
    );
  };

  const updateShiftOverride = (value: ShiftMode | "auto") => {
    setShiftOverrides((previous) => {
      if (value === "auto") {
        const { [activeDateKey]: removed, ...rest } = previous;
        void removed;
        return rest;
      }
      return { ...previous, [activeDateKey]: value };
    });
    setScheduleEditingId(null);
    setScheduleTitle("");
  };

  const saveScheduleBlock = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = scheduleTitle.trim();
    if (!title) return;

    const nextItem: ScheduleBlock = {
      id: scheduleEditingId ?? createLocalId("schedule"),
      title,
      start: scheduleStart,
      end: scheduleEnd,
      category: scheduleCategory,
    };

    setSchedules((previous) => {
      const current = previous[activeShiftMode].filter((item) => item.id !== nextItem.id);
      return {
        ...previous,
        [activeShiftMode]: normalizeStoredSchedule([...current, nextItem]),
      };
    });

    setScheduleEditingId(null);
    setScheduleTitle("");
    setScheduleStart("18:00");
    setScheduleEnd("19:00");
    setScheduleCategory("focus");
  };

  const editScheduleBlock = (item: ScheduleBlock) => {
    setScheduleEditingId(item.id);
    setScheduleTitle(item.title);
    setScheduleStart(item.start);
    setScheduleEnd(item.end);
    setScheduleCategory(item.category);
  };

  const deleteScheduleBlock = (id: string) => {
    setSchedules((previous) => ({
      ...previous,
      [activeShiftMode]: previous[activeShiftMode].filter((item) => item.id !== id),
    }));
    setScheduleCompletionByDate((previous) => ({
      ...previous,
      [activeDateKey]: (previous[activeDateKey] ?? []).filter((itemId) => itemId !== id),
    }));
    if (scheduleEditingId === id) {
      setScheduleEditingId(null);
      setScheduleTitle("");
    }
  };

  const resetScheduleTemplate = () => {
    if (!window.confirm(`${SHIFT_LABELS[activeShiftMode]} 시간표를 초기 예시로 되돌릴까요?`)) return;
    const defaults = cloneDefaultSchedules();
    setSchedules((previous) => ({ ...previous, [activeShiftMode]: defaults[activeShiftMode] }));
    setScheduleCompletionByDate((previous) => ({ ...previous, [activeDateKey]: [] }));
    setScheduleEditingId(null);
    setScheduleTitle("");
  };

  const toggleScheduleCompletion = (id: string) => {
    setScheduleCompletionByDate((previous) => {
      const current = new Set(previous[activeDateKey] ?? []);
      if (current.has(id)) current.delete(id);
      else current.add(id);
      return { ...previous, [activeDateKey]: Array.from(current) };
    });
  };

  const addDday = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = ddayTitle.trim();
    if (!title || !parseDateKey(ddayDate)) return;

    const next = normalizeStoredDdays([
      ...ddays,
      {
        id: createLocalId("dday"),
        title,
        date: ddayDate,
        kind: ddayKind,
        repeat: ddayRepeat,
      },
    ]);
    setDdays(next);
    setDdayTitle("");
    setDdayDate("");
    setDdayKind("general");
    setDdayRepeat("none");
  };

  const deleteDday = (id: string) => {
    setDdays((previous) => previous.filter((item) => item.id !== id));
  };

  const updateActiveMonthGoals = (
    updater: (goals: MonthlyGoalItem[]) => MonthlyGoalItem[],
  ) => {
    setMonthlyGoalsByMonth((previous) => {
      const nextGoals = updater(previous[activeMonthKey] ?? []);
      if (nextGoals.length === 0) {
        const { [activeMonthKey]: removed, ...rest } = previous;
        void removed;
        return rest;
      }
      return { ...previous, [activeMonthKey]: nextGoals };
    });
  };

  const addMonthlyGoal = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = goalInput.trim();
    if (!text) return;
    updateActiveMonthGoals((previous) => [
      ...previous,
      {
        id: createLocalId("goal"),
        text,
        done: false,
        createdAt: new Date().toISOString(),
      },
    ]);
    setGoalInput("");
  };

  const toggleMonthlyGoal = (id: string) => {
    updateActiveMonthGoals((goals) =>
      goals.map((goal) => (goal.id === id ? { ...goal, done: !goal.done } : goal)),
    );
  };

  const deleteMonthlyGoal = (id: string) => {
    updateActiveMonthGoals((goals) => goals.filter((goal) => goal.id !== id));
  };

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div>
          <p className={styles.brand}>YOUNGBIN LIFE OS</p>
          <h1>오늘 무엇이 가장 중요한가?</h1>
        </div>
        <div className={styles.nowPanel} aria-live="polite">
          <strong>{now ? formatNow(now) : "날짜를 불러오는 중"}</strong>
          <span>{now ? formatClock(now) : "--:--"}</span>
          <em data-mode={todayShiftMode}>{SHIFT_LABELS[todayShiftMode]}</em>
        </div>
      </header>

      <section className={styles.focusHero} aria-labelledby="focus-title">
        <div className={styles.focusHeroMain}>
          <p className={styles.focusLabel}>90일 집중 프로젝트</p>
          <h2 id="focus-title">집밥노트</h2>
          <p>
            새 기능을 늘리기보다 검증·staging·실기기·출시 증거를 닫는 데 집중합니다.
          </p>
          <div className={styles.focusMeta}>
            <span>{FOCUS_START_DATE_KEY.replaceAll("-", ".")}</span>
            <span>→</span>
            <span>{FOCUS_END_DATE_KEY.replaceAll("-", ".")}</span>
            <strong>{focusDday.label}</strong>
          </div>
          <div className={styles.focusActions}>
            <a href={JIPBAB_REPOSITORY_URL} target="_blank" rel="noreferrer">
              집밥노트 저장소 열기
            </a>
            <a href={JIPBAB_RELEASE_PR_URL} target="_blank" rel="noreferrer">
              출시 후보 PR #9 보기
            </a>
          </div>
        </div>
        <div className={styles.focusScore}>
          <span>출시 게이트</span>
          <strong>{focusProgress.percent}%</strong>
          <ProgressBar value={focusProgress.percent} label="집밥노트 출시 게이트 진행률" />
          <small>
            {focusProgress.completed}/{focusProgress.total} 완료
          </small>
        </div>
      </section>

      <section className={styles.weekSection} aria-label="7일 근무표">
        <div className={styles.sectionTitleRow}>
          <div>
            <h2>7일 보기</h2>
            <p>날짜를 누르면 그날의 체크리스트와 시간표가 열립니다.</p>
          </div>
          <span className={styles.localBadge}>이 기기에만 저장</span>
        </div>
        <div className={styles.weekStrip}>
          {weekDates.map((date) => {
            const dateKey = getDateKey(date);
            const mode = shiftOverrides[dateKey] ?? getShiftModeForDate(date, shiftAnchor);
            const isSelected = dateKey === activeDateKey;
            const isToday = dateKey === todayKey;
            return (
              <button
                key={dateKey}
                type="button"
                className={styles.dayButton}
                data-selected={isSelected}
                data-today={isToday}
                data-mode={mode}
                aria-pressed={isSelected}
                onClick={() => setSelectedDateKey(dateKey)}
              >
                <span>{date.toLocaleDateString("ko-KR", { weekday: "short" })}</span>
                <strong>{date.getDate()}</strong>
                <small>{SHIFT_LABELS[mode]}</small>
              </button>
            );
          })}
        </div>
      </section>

      <div className={styles.primaryGrid}>
        <section className={styles.panel} aria-labelledby="checklist-title">
          <div className={styles.sectionTitleRow}>
            <div>
              <h2 id="checklist-title">{formatDateKeyKo(activeDateKey)} 체크리스트</h2>
              <p>완료를 누르면 즉시 표시되고 브라우저에 저장됩니다.</p>
            </div>
            <div className={styles.progressSummary}>
              <strong>{checklistProgress.percent}%</strong>
              <span>{checklistProgress.completed}/{checklistProgress.total}</span>
            </div>
          </div>

          <form className={styles.checklistForm} onSubmit={addChecklistItem}>
            <label>
              <span className={styles.srOnly}>체크리스트 항목</span>
              <input
                value={checklistInput}
                onChange={(event) => setChecklistInput(event.target.value)}
                placeholder="예: staging read-only 확인"
              />
            </label>
            <label>
              <span className={styles.srOnly}>분류</span>
              <select
                value={checklistBucket}
                onChange={(event) => setChecklistBucket(event.target.value as ChecklistBucket)}
              >
                <option value="must">TODAY MUST</option>
                <option value="should">TODAY SHOULD</option>
                <option value="notToday">NOT TODAY</option>
              </select>
            </label>
            <button type="submit" className={styles.primaryButton}>추가</button>
            <button type="button" className={styles.secondaryButton} onClick={loadDefaultChecklist}>
              기본값
            </button>
          </form>
          {checklistNotice && <p className={styles.notice}>{checklistNotice}</p>}

          <div className={styles.checklistLanes}>
            {(["must", "should", "notToday"] as ChecklistBucket[]).map((bucket) => {
              const bucketItems = activeChecklist.filter((item) => item.bucket === bucket);
              return (
                <div className={styles.checklistLane} data-bucket={bucket} key={bucket}>
                  <div className={styles.laneHeader}>
                    <div>
                      <h3>{CHECKLIST_BUCKET_LABELS[bucket]}</h3>
                      <p>{BUCKET_DESCRIPTIONS[bucket]}</p>
                    </div>
                    <span>{bucketItems.filter((item) => !item.done).length}</span>
                  </div>
                  <div className={styles.checkRows}>
                    {bucketItems.length === 0 ? (
                      <EmptyMessage>등록된 항목이 없습니다.</EmptyMessage>
                    ) : (
                      bucketItems.map((item) => (
                        <div className={styles.checkRow} data-done={item.done} key={item.id}>
                          <label>
                            <input
                              type="checkbox"
                              checked={item.done}
                              onChange={() => toggleChecklistItem(item.id)}
                            />
                            <span>{item.text}</span>
                          </label>
                          <button
                            type="button"
                            className={styles.iconButton}
                            onClick={() => deleteChecklistItem(item.id)}
                            aria-label={`${item.text} 삭제`}
                          >
                            삭제
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <aside className={styles.panel} aria-labelledby="dday-title">
          <div className={styles.sectionTitleRow}>
            <div>
              <h2 id="dday-title">D‑day Lock</h2>
              <p>중요한 날짜를 잊지 않도록 한곳에 모읍니다.</p>
            </div>
          </div>

          <form className={styles.ddayForm} onSubmit={addDday}>
            <label>
              <span>이름</span>
              <input
                value={ddayTitle}
                onChange={(event) => setDdayTitle(event.target.value)}
                placeholder="예: 가족 기념일"
              />
            </label>
            <label>
              <span>날짜</span>
              <input
                type="date"
                value={ddayDate}
                onChange={(event) => setDdayDate(event.target.value)}
              />
            </label>
            <div className={styles.ddaySelectRow}>
              <label>
                <span>종류</span>
                <select value={ddayKind} onChange={(event) => setDdayKind(event.target.value as DdayKind)}>
                  <option value="general">일반</option>
                  <option value="birthday">생일</option>
                  <option value="anniversary">기념일</option>
                </select>
              </label>
              <label>
                <span>반복</span>
                <select
                  value={ddayRepeat}
                  onChange={(event) => setDdayRepeat(event.target.value as DdayRepeat)}
                >
                  <option value="none">반복 없음</option>
                  <option value="yearly">매년</option>
                </select>
              </label>
            </div>
            <button type="submit" className={styles.primaryButton}>D‑day 추가</button>
          </form>

          <p className={styles.inlineNote}>
            DDayLock의 로컬 우선 원칙을 적용했습니다. 현재 웹 버전은 양력·매년 반복만 지원합니다.
          </p>

          <div className={styles.ddayList}>
            {sortedDdays.length === 0 ? (
              <EmptyMessage>등록된 D‑day가 없습니다.</EmptyMessage>
            ) : (
              sortedDdays.map((item) => {
                const status = getDdayStatus(item.date, item.repeat, todayDate);
                return (
                  <article className={styles.ddayItem} key={item.id}>
                    <div className={styles.ddayCount}>{status.label}</div>
                    <div className={styles.ddayBody}>
                      <strong>{item.title}</strong>
                      <span>
                        {status.targetDateKey.replaceAll("-", ".")} · {DDAY_KIND_LABELS[item.kind]}
                        {item.repeat === "yearly" ? " · 매년" : ""}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={() => deleteDday(item.id)}
                      aria-label={`${item.title} 삭제`}
                    >
                      삭제
                    </button>
                  </article>
                );
              })
            )}
          </div>
        </aside>
      </div>

      <section className={styles.panel} aria-labelledby="schedule-title">
        <div className={styles.sectionTitleRow}>
          <div>
            <h2 id="schedule-title">{formatDateKeyKo(activeDateKey)} 나의 시간표</h2>
            <p>근무 형태별 시간표를 만들고, 오늘 실제로 지켰는지 체크합니다.</p>
          </div>
          <div className={styles.scheduleControls}>
            <select
              aria-label="근무 형태"
              value={shiftOverrides[activeDateKey] ?? "auto"}
              onChange={(event) => updateShiftOverride(event.target.value as ShiftMode | "auto")}
            >
              {SCHEDULE_MODE_OPTIONS.map((option) => (
                <option value={option.value} key={option.value}>{option.label}</option>
              ))}
            </select>
            <button type="button" className={styles.secondaryButton} onClick={resetScheduleTemplate}>
              예시로 초기화
            </button>
          </div>
        </div>

        <div className={styles.scheduleSummary}>
          <span data-mode={activeShiftMode}>{SHIFT_LABELS[activeShiftMode]}</span>
          <ProgressBar value={scheduleProgress.percent} label="시간표 실행률" />
          <small>{scheduleProgress.completed}/{scheduleProgress.total} 완료</small>
        </div>

        <div className={styles.timeline}>
          {activeSchedule.length === 0 ? (
            <EmptyMessage>시간표가 비어 있습니다. 아래에서 첫 일정을 추가하세요.</EmptyMessage>
          ) : (
            activeSchedule.map((item) => {
              const done = completedScheduleIds.has(item.id);
              return (
                <article className={styles.timelineRow} data-category={item.category} data-done={done} key={item.id}>
                  <label className={styles.timelineCheck}>
                    <input
                      type="checkbox"
                      checked={done}
                      onChange={() => toggleScheduleCompletion(item.id)}
                    />
                    <span className={styles.srOnly}>{item.title} 완료</span>
                  </label>
                  <time>{item.start}<span>–</span>{item.end}</time>
                  <div className={styles.timelineBody}>
                    <strong>{item.title}</strong>
                    <span>{SCHEDULE_CATEGORY_LABELS[item.category]}</span>
                  </div>
                  <div className={styles.rowActions}>
                    <button type="button" onClick={() => editScheduleBlock(item)}>편집</button>
                    <button type="button" onClick={() => deleteScheduleBlock(item.id)}>삭제</button>
                  </div>
                </article>
              );
            })
          )}
        </div>

        <form className={styles.scheduleForm} onSubmit={saveScheduleBlock}>
          <label className={styles.scheduleTitleField}>
            <span>일정 이름</span>
            <input
              value={scheduleTitle}
              onChange={(event) => setScheduleTitle(event.target.value)}
              placeholder="예: 집밥노트 PR 확인"
            />
          </label>
          <label>
            <span>시작</span>
            <input type="time" value={scheduleStart} onChange={(event) => setScheduleStart(event.target.value)} />
          </label>
          <label>
            <span>종료</span>
            <input type="time" value={scheduleEnd} onChange={(event) => setScheduleEnd(event.target.value)} />
          </label>
          <label>
            <span>분류</span>
            <select
              value={scheduleCategory}
              onChange={(event) => setScheduleCategory(event.target.value as ScheduleCategory)}
            >
              {Object.entries(SCHEDULE_CATEGORY_LABELS).map(([value, label]) => (
                <option value={value} key={value}>{label}</option>
              ))}
            </select>
          </label>
          <button type="submit" className={styles.primaryButton}>
            {scheduleEditingId ? "수정 저장" : "시간 추가"}
          </button>
          {scheduleEditingId && (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => {
                setScheduleEditingId(null);
                setScheduleTitle("");
              }}
            >
              취소
            </button>
          )}
        </form>
        <p className={styles.inlineNote}>
          표시된 근무시간은 초기 예시입니다. 실제 교대시간에 맞게 편집한 뒤 사용하세요.
        </p>
      </section>

      <div className={styles.bottomGrid}>
        <section className={styles.panel} aria-labelledby="milestone-title">
          <div className={styles.sectionTitleRow}>
            <div>
              <h2 id="milestone-title">집밥노트 90일 출시 체크리스트</h2>
              <p>새 기능보다 출시를 막는 증거와 검증을 먼저 닫습니다.</p>
            </div>
            <div className={styles.progressSummary}>
              <strong>{focusProgress.percent}%</strong>
              <span>{focusProgress.completed}/{focusProgress.total}</span>
            </div>
          </div>
          <div className={styles.milestoneList}>
            {milestones.map((item, index) => (
              <label className={styles.milestoneRow} data-done={item.done} key={item.id}>
                <span className={styles.stepNumber}>{String(index + 1).padStart(2, "0")}</span>
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => toggleMilestone(item.id)}
                />
                <span>{item.title}</span>
                <strong>{item.done ? "완료" : "진행 전"}</strong>
              </label>
            ))}
          </div>
        </section>

        <section className={styles.panel} aria-labelledby="monthly-title">
          <div className={styles.sectionTitleRow}>
            <div>
              <h2 id="monthly-title">{activeMonthKey} 월간 결과</h2>
              <p>이번 달에 실제로 끝낼 결과만 적습니다.</p>
            </div>
          </div>
          <ProgressBar value={activeMonthGoalProgress.percent} label="월간 목표 진행률" />
          <form className={styles.monthlyForm} onSubmit={addMonthlyGoal}>
            <input
              value={goalInput}
              onChange={(event) => setGoalInput(event.target.value)}
              placeholder="예: staging rollback rehearsal 완료"
              aria-label="월간 목표"
            />
            <button type="submit" className={styles.primaryButton}>추가</button>
          </form>
          <div className={styles.monthlyList}>
            {activeMonthGoals.length === 0 ? (
              <EmptyMessage>이번 달 결과가 없습니다.</EmptyMessage>
            ) : (
              activeMonthGoals.map((goal) => (
                <div className={styles.checkRow} data-done={goal.done} key={goal.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={goal.done}
                      onChange={() => toggleMonthlyGoal(goal.id)}
                    />
                    <span>{goal.text}</span>
                  </label>
                  <button
                    type="button"
                    className={styles.iconButton}
                    onClick={() => deleteMonthlyGoal(goal.id)}
                    aria-label={`${goal.text} 삭제`}
                  >
                    삭제
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <footer className={styles.footer}>
        <strong>운영 규칙</strong>
        <span>MUST 3개 · PUSH 프로젝트 1개 · 야간근무 주간에는 회복 우선</span>
        <span>로그인·서버 없이 이 브라우저에만 저장됩니다.</span>
      </footer>
    </main>
  );
}
