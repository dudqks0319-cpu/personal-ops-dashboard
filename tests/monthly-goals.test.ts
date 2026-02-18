import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateGoalProgress,
  getMonthKey,
  normalizeStoredMonthlyGoals,
} from "../src/lib/monthlyGoals.ts";

test("getMonthKey: YYYY-MM 형식으로 월 키를 반환한다", () => {
  assert.equal(getMonthKey(new Date("2026-02-19T09:00:00+09:00")), "2026-02");
  assert.equal(getMonthKey(new Date("2026-11-01T00:00:00+09:00")), "2026-11");
});

test("normalizeStoredMonthlyGoals: 유효한 월 키와 목표만 남긴다", () => {
  const normalized = normalizeStoredMonthlyGoals({
    "2026-02": [
      { id: "goal-1", text: "운동 12회", done: false, createdAt: "2026-02-01T00:00:00.000Z" },
      { text: "  ", done: true },
    ],
    "invalid-key": [{ id: "x", text: "무시", done: false }],
    "2026-03": "not-array",
  });

  assert.deepEqual(Object.keys(normalized), ["2026-02"]);
  assert.equal(normalized["2026-02"].length, 1);
  assert.equal(normalized["2026-02"][0].id, "goal-1");
  assert.equal(normalized["2026-02"][0].text, "운동 12회");
  assert.equal(normalized["2026-02"][0].done, false);
});

test("normalizeStoredMonthlyGoals: id/createdAt 누락 시 기본값을 채운다", () => {
  const normalized = normalizeStoredMonthlyGoals({
    "2026-02": [{ text: "책 2권 읽기", done: true, createdAt: "invalid-date" }],
  });

  const [goal] = normalized["2026-02"];
  assert.equal(goal.id, "2026-02-goal-1");
  assert.match(goal.createdAt, /^\d{4}-\d{2}-\d{2}T/);
});

test("calculateGoalProgress: 완료율을 계산한다", () => {
  const progress = calculateGoalProgress([
    { id: "1", text: "A", done: true, createdAt: "2026-02-01T00:00:00.000Z" },
    { id: "2", text: "B", done: false, createdAt: "2026-02-01T00:00:00.000Z" },
    { id: "3", text: "C", done: true, createdAt: "2026-02-01T00:00:00.000Z" },
  ]);

  assert.deepEqual(progress, {
    total: 3,
    completed: 2,
    percent: 67,
  });
});
