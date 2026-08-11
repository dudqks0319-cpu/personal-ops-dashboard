import assert from "node:assert/strict";
import test from "node:test";

import { parseDashboardEnv } from "../src/lib/runtime-env.ts";

test("대시보드 환경설정은 안전한 로컬 파일 저장 기본값을 사용한다", () => {
  assert.deepEqual(parseDashboardEnv({}), {
    NODE_ENV: "development",
    DASHBOARD_STORAGE_MODE: "file",
  });
});

test("지원하지 않는 저장 모드는 시작 시 거부한다", () => {
  assert.throws(() => parseDashboardEnv({ DASHBOARD_STORAGE_MODE: "remote" }));
});
