export type ShiftMode = "day" | "night" | "off";
export type ScheduleCategory = "sleep" | "work" | "family" | "focus" | "health" | "life";
export type DdayKind = "general" | "birthday" | "anniversary";
export type DdayRepeat = "none" | "yearly";
export type ChecklistBucket = "must" | "should" | "notToday";
export type ChecklistPriority = "high" | "medium" | "low";

export type ScheduleBlock = {
  id: string;
  title: string;
  start: string;
  end: string;
  category: ScheduleCategory;
};

export type DdayItem = {
  id: string;
  title: string;
  date: string;
  kind: DdayKind;
  repeat: DdayRepeat;
};

export type ChecklistItem = {
  id: string;
  text: string;
  done: boolean;
  priority: ChecklistPriority;
  bucket: ChecklistBucket;
};

export type FocusMilestone = {
  id: string;
  title: string;
  done: boolean;
};

export type DdayStatus = {
  label: string;
  days: number;
  targetDateKey: string;
};

export type Progress = {
  completed: number;
  total: number;
  percent: number;
};

export const FOCUS_START_DATE_KEY = "2026-08-11";
export const FOCUS_END_DATE_KEY = "2026-11-08";
export const NIGHT_SHIFT_ANCHOR_DATE_KEY = "2026-08-09";

export const SHIFT_LABELS: Record<ShiftMode, string> = {
  day: "주간근무",
  night: "야간근무",
  off: "휴무",
};

export const SCHEDULE_CATEGORY_LABELS: Record<ScheduleCategory, string> = {
  sleep: "수면",
  work: "직장",
  family: "가족",
  focus: "집밥노트",
  health: "건강",
  life: "생활",
};

export const DDAY_KIND_LABELS: Record<DdayKind, string> = {
  general: "일반",
  birthday: "생일",
  anniversary: "기념일",
};

export const CHECKLIST_BUCKET_LABELS: Record<ChecklistBucket, string> = {
  must: "TODAY MUST",
  should: "TODAY SHOULD",
  notToday: "NOT TODAY",
};

export const DEFAULT_CHECKLIST: ChecklistItem[] = [
  {
    id: "default-must-jipbab",
    text: "집밥노트에서 막힌 일 1개 끝내기",
    done: false,
    priority: "high",
    bucket: "must",
  },
  {
    id: "default-must-recovery",
    text: "수면·회복 시간 지키기",
    done: false,
    priority: "high",
    bucket: "must",
  },
  {
    id: "default-must-family",
    text: "가족 일정과 필요한 일 확인하기",
    done: false,
    priority: "high",
    bucket: "must",
  },
  {
    id: "default-should-waiting",
    text: "중요 메일과 기다리는 일 한 번만 확인하기",
    done: false,
    priority: "medium",
    bucket: "should",
  },
  {
    id: "default-not-new-app",
    text: "새 앱·새 저장소 시작하지 않기",
    done: false,
    priority: "low",
    bucket: "notToday",
  },
  {
    id: "default-not-feature-bloat",
    text: "출시 게이트보다 새 기능을 먼저 만들지 않기",
    done: false,
    priority: "low",
    bucket: "notToday",
  },
];

export const DEFAULT_FOCUS_MILESTONES: FocusMilestone[] = [
  { id: "focus-freeze", title: "90일 범위 확정 및 새 기능 기본 동결", done: false },
  { id: "focus-backup", title: "staging 재개 전 데이터·환경변수·feature flag 보존", done: false },
  { id: "focus-readonly", title: "staging read-only 상태 확인", done: false },
  { id: "focus-dry-run", title: "migration dry-run 완료", done: false },
  { id: "focus-rehearsal", title: "staging migration·rollback rehearsal 완료", done: false },
  { id: "focus-content", title: "핵심 레시피 실제 조리·식품안전 증거 확보", done: false },
  { id: "focus-device", title: "iPhone·Android 실기기 smoke 완료", done: false },
  { id: "focus-release", title: "제한 공개 또는 보류 결정 기록", done: false },
];

export const DEFAULT_DDAYS: DdayItem[] = [
  {
    id: "focus-jipbab-90-days",
    title: "집밥노트 90일 집중 종료",
    date: FOCUS_END_DATE_KEY,
    kind: "general",
    repeat: "none",
  },
];

export const DEFAULT_SCHEDULES: Record<ShiftMode, ScheduleBlock[]> = {
  day: [
    { id: "day-prepare", title: "준비·가족", start: "06:30", end: "07:30", category: "family" },
    { id: "day-work", title: "직장·이동", start: "08:00", end: "17:00", category: "work" },
    { id: "day-family", title: "가족·저녁·생활", start: "18:00", end: "21:00", category: "family" },
    { id: "day-focus", title: "집밥노트 집중 1회", start: "21:00", end: "22:00", category: "focus" },
    { id: "day-sleep", title: "수면", start: "22:30", end: "06:30", category: "sleep" },
  ],
  night: [
    { id: "night-sleep", title: "수면·회복", start: "08:00", end: "14:30", category: "sleep" },
    { id: "night-family", title: "가족·생활", start: "14:30", end: "18:00", category: "family" },
    { id: "night-focus", title: "집밥노트 집중 1회", start: "18:00", end: "19:00", category: "focus" },
    { id: "night-work", title: "직장·이동", start: "20:00", end: "08:00", category: "work" },
  ],
  off: [
    { id: "off-morning", title: "아침·오늘 계획", start: "08:00", end: "09:00", category: "life" },
    { id: "off-family", title: "가족·생활", start: "09:00", end: "12:00", category: "family" },
    { id: "off-focus", title: "집밥노트 집중 1회", start: "13:30", end: "15:00", category: "focus" },
    { id: "off-health", title: "운동·회복", start: "16:00", end: "17:00", category: "health" },
    { id: "off-sleep", title: "수면", start: "23:00", end: "07:00", category: "sleep" },
  ],
};

const SCHEDULE_CATEGORIES = new Set<ScheduleCategory>([
  "sleep",
  "work",
  "family",
  "focus",
  "health",
  "life",
]);
const DDAY_KINDS = new Set<DdayKind>(["general", "birthday", "anniversary"]);
const DDAY_REPEATS = new Set<DdayRepeat>(["none", "yearly"]);
const CHECKLIST_BUCKETS = new Set<ChecklistBucket>(["must", "should", "notToday"]);
const CHECKLIST_PRIORITIES = new Set<ChecklistPriority>(["high", "medium", "low"]);
const SHIFT_MODES = new Set<ShiftMode>(["day", "night", "off"]);
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toUtcDayNumber(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000;
}

function isValidDateParts(year: number, month: number, day: number): boolean {
  const candidate = new Date(year, month - 1, day, 12);
  return (
    candidate.getFullYear() === year &&
    candidate.getMonth() === month - 1 &&
    candidate.getDate() === day
  );
}

export function parseDateKey(value: string): Date | null {
  const match = DATE_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!isValidDateParts(year, month, day)) return null;

  return new Date(year, month - 1, day, 12);
}

export function getDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addCalendarDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function getWeekDates(referenceDate: Date, length = 7): Date[] {
  return Array.from({ length }, (_, index) => addCalendarDays(referenceDate, index));
}

export function formatDateKeyKo(dateKey: string): string {
  const date = parseDateKey(dateKey);
  if (!date) return dateKey;
  return date.toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

export function getShiftModeForDate(date: Date, nightWeekAnchor: Date): ShiftMode {
  const differenceInDays = toUtcDayNumber(date) - toUtcDayNumber(nightWeekAnchor);
  const weekIndex = Math.floor(differenceInDays / 7);
  const normalizedWeekIndex = ((weekIndex % 2) + 2) % 2;
  return normalizedWeekIndex === 0 ? "night" : "day";
}

export function getDdayStatus(
  dateKey: string,
  repeat: DdayRepeat,
  referenceDate = new Date(),
): DdayStatus {
  const source = parseDateKey(dateKey);
  if (!source) {
    throw new Error("유효하지 않은 D-day 날짜입니다.");
  }

  let target = source;

  if (repeat === "yearly") {
    const month = source.getMonth() + 1;
    const day = source.getDate();
    let candidateYear = referenceDate.getFullYear();

    while (true) {
      if (isValidDateParts(candidateYear, month, day)) {
        const candidate = new Date(candidateYear, month - 1, day, 12);
        if (toUtcDayNumber(candidate) >= toUtcDayNumber(referenceDate)) {
          target = candidate;
          break;
        }
      }
      candidateYear += 1;
    }
  }

  const days = toUtcDayNumber(target) - toUtcDayNumber(referenceDate);
  const label = days === 0 ? "D-DAY" : days > 0 ? `D-${days}` : `D+${Math.abs(days)}`;

  return {
    label,
    days,
    targetDateKey: getDateKey(target),
  };
}

export function calculateProgress(items: ReadonlyArray<{ done: boolean }>): Progress {
  const total = items.length;
  const completed = items.reduce((count, item) => count + (item.done ? 1 : 0), 0);
  return {
    completed,
    total,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}

export function cloneDefaultChecklist(): ChecklistItem[] {
  return DEFAULT_CHECKLIST.map((item) => ({ ...item }));
}

export function cloneDefaultMilestones(): FocusMilestone[] {
  return DEFAULT_FOCUS_MILESTONES.map((item) => ({ ...item }));
}

export function cloneDefaultDdays(): DdayItem[] {
  return DEFAULT_DDAYS.map((item) => ({ ...item }));
}

export function cloneDefaultSchedules(): Record<ShiftMode, ScheduleBlock[]> {
  return {
    day: DEFAULT_SCHEDULES.day.map((item) => ({ ...item })),
    night: DEFAULT_SCHEDULES.night.map((item) => ({ ...item })),
    off: DEFAULT_SCHEDULES.off.map((item) => ({ ...item })),
  };
}

export function normalizeStoredSchedule(raw: unknown): ScheduleBlock[] {
  if (!Array.isArray(raw)) return [];

  const normalized = raw.flatMap((item): ScheduleBlock[] => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const title = typeof record.title === "string" ? record.title.trim() : "";
    const start = typeof record.start === "string" ? record.start : "";
    const end = typeof record.end === "string" ? record.end : "";
    const category = record.category;

    if (
      !title ||
      !TIME_PATTERN.test(start) ||
      !TIME_PATTERN.test(end) ||
      typeof category !== "string" ||
      !SCHEDULE_CATEGORIES.has(category as ScheduleCategory)
    ) {
      return [];
    }

    const id = typeof record.id === "string" && record.id.trim() ? record.id : createId();
    return [{ id, title, start, end, category: category as ScheduleCategory }];
  });

  return normalized.sort((left, right) => left.start.localeCompare(right.start));
}

export function normalizeStoredSchedules(raw: unknown): Record<ShiftMode, ScheduleBlock[]> {
  const defaults = cloneDefaultSchedules();
  if (!raw || typeof raw !== "object") return defaults;
  const record = raw as Record<string, unknown>;

  return {
    day: Array.isArray(record.day) ? normalizeStoredSchedule(record.day) : defaults.day,
    night: Array.isArray(record.night) ? normalizeStoredSchedule(record.night) : defaults.night,
    off: Array.isArray(record.off) ? normalizeStoredSchedule(record.off) : defaults.off,
  };
}

export function normalizeStoredDdays(raw: unknown): DdayItem[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((item): DdayItem[] => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const title = typeof record.title === "string" ? record.title.trim() : "";
    const date = typeof record.date === "string" ? record.date : "";
    const kind = record.kind;
    const repeat = record.repeat;

    if (
      !title ||
      !parseDateKey(date) ||
      typeof kind !== "string" ||
      !DDAY_KINDS.has(kind as DdayKind) ||
      typeof repeat !== "string" ||
      !DDAY_REPEATS.has(repeat as DdayRepeat)
    ) {
      return [];
    }

    const id = typeof record.id === "string" && record.id.trim() ? record.id : createId();
    return [{ id, title, date, kind: kind as DdayKind, repeat: repeat as DdayRepeat }];
  });
}

export function normalizeStoredChecklist(raw: unknown): ChecklistItem[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((item): ChecklistItem[] => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const text = typeof record.text === "string" ? record.text.trim() : "";
    if (!text) return [];

    const bucket =
      typeof record.bucket === "string" && CHECKLIST_BUCKETS.has(record.bucket as ChecklistBucket)
        ? (record.bucket as ChecklistBucket)
        : "should";
    const priority =
      typeof record.priority === "string" &&
      CHECKLIST_PRIORITIES.has(record.priority as ChecklistPriority)
        ? (record.priority as ChecklistPriority)
        : "medium";
    const id = typeof record.id === "string" && record.id.trim() ? record.id : createId();

    return [{ id, text, done: Boolean(record.done), priority, bucket }];
  });
}

export function normalizeStoredChecklistByDate(raw: unknown): Record<string, ChecklistItem[]> {
  if (!raw || typeof raw !== "object") return {};
  const record = raw as Record<string, unknown>;
  const result: Record<string, ChecklistItem[]> = {};

  for (const [dateKey, items] of Object.entries(record)) {
    if (!parseDateKey(dateKey) || !Array.isArray(items)) continue;
    result[dateKey] = normalizeStoredChecklist(items);
  }

  return result;
}

export function normalizeStoredMilestones(raw: unknown): FocusMilestone[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((item): FocusMilestone[] => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const title = typeof record.title === "string" ? record.title.trim() : "";
    if (!title) return [];
    const id = typeof record.id === "string" && record.id.trim() ? record.id : createId();
    return [{ id, title, done: Boolean(record.done) }];
  });
}

export function normalizeStoredCompletionByDate(raw: unknown): Record<string, string[]> {
  if (!raw || typeof raw !== "object") return {};
  const record = raw as Record<string, unknown>;
  const result: Record<string, string[]> = {};

  for (const [dateKey, value] of Object.entries(record)) {
    if (!parseDateKey(dateKey) || !Array.isArray(value)) continue;
    result[dateKey] = Array.from(
      new Set(value.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))),
    );
  }

  return result;
}

export function normalizeStoredShiftOverrides(raw: unknown): Record<string, ShiftMode> {
  if (!raw || typeof raw !== "object") return {};
  const record = raw as Record<string, unknown>;
  const result: Record<string, ShiftMode> = {};

  for (const [dateKey, value] of Object.entries(record)) {
    if (!parseDateKey(dateKey) || typeof value !== "string" || !SHIFT_MODES.has(value as ShiftMode)) {
      continue;
    }
    result[dateKey] = value as ShiftMode;
  }

  return result;
}

export function sortDdaysByNextOccurrence(
  items: ReadonlyArray<DdayItem>,
  referenceDate = new Date(),
): DdayItem[] {
  return [...items].sort((left, right) => {
    const leftDays = getDdayStatus(left.date, left.repeat, referenceDate).days;
    const rightDays = getDdayStatus(right.date, right.repeat, referenceDate).days;
    const leftRank = leftDays >= 0 ? leftDays : 1_000_000 + Math.abs(leftDays);
    const rightRank = rightDays >= 0 ? rightDays : 1_000_000 + Math.abs(rightDays);
    return leftRank - rightRank || left.title.localeCompare(right.title, "ko");
  });
}
