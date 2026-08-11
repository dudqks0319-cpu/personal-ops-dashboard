import assert from "node:assert/strict";
import test from "node:test";

import {
  addCalendarDays,
  calculateProgress,
  getDateKey,
  getDdayStatus,
  getShiftModeForDate,
  normalizeStoredChecklist,
  normalizeStoredDdays,
  normalizeStoredMilestones,
  normalizeStoredSchedule,
  sortDdaysByNextOccurrence,
} from "../src/lib/lifeOs.ts";

test("90일 기간은 시작일을 포함해 89일 뒤에 끝난다", () => {
  const start = new Date(2026, 7, 11, 12);
  assert.equal(getDateKey(addCalendarDays(start, 89)), "2026-11-08");
});

test("교대근무 기준일로부터 주간/야간을 1주 단위로 번갈아 계산한다", () => {
  const anchor = new Date(2026, 7, 9, 12);
  assert.equal(getShiftModeForDate(new Date(2026, 7, 11, 12), anchor), "night");
  assert.equal(getShiftModeForDate(new Date(2026, 7, 16, 12), anchor), "day");
  assert.equal(getShiftModeForDate(new Date(2026, 7, 23, 12), anchor), "night");
});

test("미래/당일/과거 D-day 표시를 계산한다", () => {
  const today = new Date(2026, 7, 11, 12);
  assert.deepEqual(getDdayStatus("2026-08-14", "none", today), {
    label: "D-3",
    days: 3,
    targetDateKey: "2026-08-14",
  });
  assert.equal(getDdayStatus("2026-08-11", "none", today).label, "D-DAY");
  assert.equal(getDdayStatus("2026-08-09", "none", today).label, "D+2");
});

test("매년 반복 D-day는 다음 유효한 날짜를 사용한다", () => {
  const today = new Date(2026, 7, 11, 12);
  const result = getDdayStatus("2024-03-19", "yearly", today);
  assert.equal(result.targetDateKey, "2027-03-19");
  assert.equal(result.label, "D-220");
});

test("완료율은 완료 개수와 퍼센트를 반환한다", () => {
  assert.deepEqual(calculateProgress([{ done: true }, { done: false }, { done: true }]), {
    completed: 2,
    total: 3,
    percent: 67,
  });
  assert.deepEqual(calculateProgress([]), { completed: 0, total: 0, percent: 0 });
});

test("저장된 시간표는 유효한 항목만 남기고 시작 시간 순으로 정렬한다", () => {
  const result = normalizeStoredSchedule([
    { id: "b", title: "가족", start: "18:00", end: "20:00", category: "family" },
    { id: "x", title: "", start: "09:00", end: "10:00", category: "life" },
    { id: "a", title: "수면", start: "08:00", end: "14:30", category: "sleep" },
  ]);
  assert.deepEqual(result.map((item) => item.id), ["a", "b"]);
});

test("저장된 D-day는 잘못된 날짜를 제외하고 지원되는 값만 정규화한다", () => {
  const result = normalizeStoredDdays([
    { id: "1", title: "기념일", date: "2026-12-01", kind: "anniversary", repeat: "yearly" },
    { id: "2", title: "잘못됨", date: "2026-99-99", kind: "x", repeat: "x" },
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0]?.kind, "anniversary");
  assert.equal(result[0]?.repeat, "yearly");
});

test("기존 투두 데이터는 should 체크리스트로 안전하게 마이그레이션한다", () => {
  const result = normalizeStoredChecklist([
    { id: "legacy", text: "기존 할 일", done: true, priority: "high" },
    { id: "must", text: "중요한 일", done: false, bucket: "must", priority: "medium" },
    { id: "bad", text: "", done: false },
  ]);
  assert.equal(result.length, 2);
  assert.equal(result[0]?.bucket, "should");
  assert.equal(result[1]?.bucket, "must");
});

test("집중 프로젝트 마일스톤은 완료 상태를 보존하고 빈 항목을 제거한다", () => {
  const result = normalizeStoredMilestones([
    { id: "1", title: "실기기 검증", done: true },
    { id: "2", title: "", done: false },
  ]);
  assert.deepEqual(result, [{ id: "1", title: "실기기 검증", done: true }]);
});

test("D-day 목록은 다음 발생일이 가까운 순서로 정렬한다", () => {
  const today = new Date(2026, 7, 11, 12);
  const items = normalizeStoredDdays([
    { id: "later", title: "나중", date: "2026-12-01", kind: "general", repeat: "none" },
    { id: "soon", title: "곧", date: "2026-08-14", kind: "general", repeat: "none" },
    { id: "past", title: "지난 일정", date: "2026-08-01", kind: "general", repeat: "none" },
  ]);
  assert.deepEqual(sortDdaysByNextOccurrence(items, today).map((item) => item.id), [
    "soon",
    "later",
    "past",
  ]);
});
