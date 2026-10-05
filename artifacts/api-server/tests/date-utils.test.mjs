import assert from "node:assert/strict";
import { test } from "node:test";

const { dateKey } = await import(
  "../../solo-studio/src/lib/date-utils.ts"
);

test("date keys follow the local calendar across the UK daylight-saving change", () => {
  const afterLocalMidnight = new Date("2026-03-29T23:30:00.000Z");

  assert.equal(afterLocalMidnight.toISOString().slice(0, 10), "2026-03-29");
  assert.equal(dateKey(afterLocalMidnight), "2026-03-30");
});