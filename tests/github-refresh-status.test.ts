import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GitHubRefreshStatus } from "../src/app/github/GitHubRefreshStatus.ts";

function renderStatus(statusText: string, announcement: string): string {
  return renderToStaticMarkup(
    createElement(GitHubRefreshStatus, {
      statusText,
      announcement,
      statusClassName: "visible-status",
      announcementClassName: "hidden-status",
    }),
  );
}

test("countdown updates outside the live region", () => {
  const firstRender = renderStatus("다음 확인 10분 00초", "");
  const nextRender = renderStatus("다음 확인 9분 59초", "");

  assert.match(firstRender, /<span class="visible-status">다음 확인 10분 00초<\/span>/);
  assert.match(nextRender, /<span class="visible-status">다음 확인 9분 59초<\/span>/);
  assert.match(
    nextRender,
    /<span class="hidden-status" aria-live="polite" aria-atomic="true"><\/span>/,
  );
  assert.doesNotMatch(nextRender, /aria-live="polite"[^>]*>다음 확인/);
});

test("live region renders only the meaningful refresh announcement", () => {
  const startRender = renderStatus(
    "최신 공개 데이터 확인 중",
    "최신 공개 데이터 새로고침 시작",
  );
  const completeRender = renderStatus(
    "다음 확인 10분 00초",
    "최신 공개 데이터 새로고침 완료",
  );

  assert.match(
    startRender,
    /aria-live="polite" aria-atomic="true">최신 공개 데이터 새로고침 시작<\/span>/,
  );
  assert.match(
    completeRender,
    /aria-live="polite" aria-atomic="true">최신 공개 데이터 새로고침 완료<\/span>/,
  );
});
