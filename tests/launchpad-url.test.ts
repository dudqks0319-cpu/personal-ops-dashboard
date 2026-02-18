import test from "node:test";
import assert from "node:assert/strict";
import { normalizeLaunchpadUrl } from "../src/lib/launchpad.ts";

test("normalizeLaunchpadUrl: trims and accepts https", () => {
  assert.equal(
    normalizeLaunchpadUrl("  https://example.com/path  "),
    "https://example.com/path",
  );
});

test("normalizeLaunchpadUrl: accepts http", () => {
  assert.equal(normalizeLaunchpadUrl("http://example.com"), "http://example.com/");
});

test("normalizeLaunchpadUrl: rejects non-http protocols", () => {
  assert.equal(normalizeLaunchpadUrl("javascript:alert(1)"), null);
  assert.equal(normalizeLaunchpadUrl("ftp://example.com"), null);
});

test("normalizeLaunchpadUrl: rejects empty and non-string values", () => {
  assert.equal(normalizeLaunchpadUrl("   "), null);
  assert.equal(normalizeLaunchpadUrl(undefined), null);
  assert.equal(normalizeLaunchpadUrl({ url: "https://example.com" }), null);
});
