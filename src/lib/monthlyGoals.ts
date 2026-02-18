export type MonthlyGoalItem = {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
};

export type MonthlyGoalsByMonth = Record<string, MonthlyGoalItem[]>;

type GoalProgress = {
  total: number;
  completed: number;
  percent: number;
};

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function normalizeMonthlyGoalItem(item: unknown, index: number, monthKey: string): MonthlyGoalItem | null {
  if (!item || typeof item !== "object") return null;
  const record = item as Record<string, unknown>;

  const text = typeof record.text === "string" ? record.text.trim() : "";
  if (!text) return null;

  const id =
    typeof record.id === "string" && record.id.trim()
      ? record.id.trim()
      : `${monthKey}-goal-${index + 1}`;

  const createdAtRaw = typeof record.createdAt === "string" ? Date.parse(record.createdAt) : Number.NaN;
  const createdAt = Number.isNaN(createdAtRaw)
    ? new Date().toISOString()
    : new Date(createdAtRaw).toISOString();

  return {
    id,
    text,
    done: Boolean(record.done),
    createdAt,
  };
}

export function getMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function normalizeStoredMonthlyGoals(raw: unknown): MonthlyGoalsByMonth {
  if (!raw || typeof raw !== "object") return {};

  const entries = Object.entries(raw as Record<string, unknown>);
  const normalized: MonthlyGoalsByMonth = {};

  for (const [monthKey, goals] of entries) {
    if (!MONTH_KEY_PATTERN.test(monthKey) || !Array.isArray(goals)) continue;

    const normalizedGoals = goals.flatMap((goal, index) => {
      const normalizedGoal = normalizeMonthlyGoalItem(goal, index, monthKey);
      return normalizedGoal ? [normalizedGoal] : [];
    });

    if (normalizedGoals.length > 0) {
      normalized[monthKey] = normalizedGoals;
    }
  }

  return normalized;
}

export function calculateGoalProgress(goals: MonthlyGoalItem[]): GoalProgress {
  const total = goals.length;
  const completed = goals.filter((goal) => goal.done).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return {
    total,
    completed,
    percent,
  };
}
