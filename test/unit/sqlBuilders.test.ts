import { describe, expect, it } from "vitest";

import {
  assertLimit,
  assertName,
  assertOp,
  buildAddColumn,
  buildCount,
  buildCreateTable,
  buildDelete,
  buildInsert,
  buildSelect,
  buildUpdate,
  filterToConditions,
  quoteName,
  toSqlValue,
} from "../../app/utils/sqlBuilders";

describe("assertName / quoteName", () => {
  it("accepts ascii, underscore and Thai names", () => {
    for (const n of ["tasks", "_x1", "งาน", "คะแนน_รวม"]) {
      expect(assertName(n)).toBe(n);
    }
  });

  it("rejects unsafe names with the Thai message", () => {
    expect(() => assertName("tasks; DROP TABLE x")).toThrow(
      "ชื่อตาราง/คอลัมน์ไม่ถูกต้อง: tasks; DROP TABLE x",
    );
    for (const bad of ["", "a b", 'a"b', "1abc", 42]) {
      expect(() => assertName(bad)).toThrow("ชื่อตาราง/คอลัมน์ไม่ถูกต้อง");
    }
  });

  it("quotes a valid name", () => {
    expect(quoteName("tasks")).toBe('"tasks"');
    expect(() => quoteName('a"b')).toThrow("ชื่อตาราง/คอลัมน์ไม่ถูกต้อง");
  });
});

describe("assertOp / assertLimit", () => {
  it("normalizes like and rejects unknown operators", () => {
    expect(assertOp("like")).toBe("LIKE");
    expect(assertOp(">=")).toBe(">=");
    expect(() => assertOp("<>")).toThrow(
      "ตัวเปรียบเทียบไม่ถูกต้อง: <> (ใช้ได้: = != > >= < <= LIKE)",
    );
  });

  it("accepts non-negative integers only", () => {
    expect(assertLimit(5)).toBe(5);
    expect(assertLimit(0)).toBe(0);
    for (const bad of [-1, 1.5, "5"]) {
      expect(() => assertLimit(bad)).toThrow(
        "limit() ต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป",
      );
    }
  });
});

describe("toSqlValue", () => {
  it("converts learner values to SQLite values", () => {
    expect(toSqlValue(true)).toBe(1);
    expect(toSqlValue(false)).toBe(0);
    expect(toSqlValue({ a: 1 })).toBe('{"a":1}');
    expect(toSqlValue([1, 2])).toBe("[1,2]");
    expect(toSqlValue(undefined)).toBeNull();
    expect(toSqlValue(null)).toBeNull();
    expect(toSqlValue("x")).toBe("x");
    expect(toSqlValue(3.5)).toBe(3.5);
  });

  it("passes bytes through and stringifies other values", () => {
    const bytes = new Uint8Array([1, 2]);
    expect(toSqlValue(bytes)).toBe(bytes);
    expect(toSqlValue(new Date(0))).toBe("1970-01-01T00:00:00.000Z");
    expect(toSqlValue(new Date("nope"))).toBeNull();
  });
});

describe("filterToConditions", () => {
  it("maps each key to an = condition", () => {
    expect(filterToConditions({ done: true, note: null })).toEqual([
      { col: "done", op: "=", value: true },
      { col: "note", op: "=", value: null },
    ]);
  });
});

describe("DDL builders", () => {
  it("builds create table and add column", () => {
    expect(buildCreateTable("tasks")).toBe(
      'CREATE TABLE IF NOT EXISTS "tasks" ("id" INTEGER PRIMARY KEY AUTOINCREMENT)',
    );
    expect(buildAddColumn("tasks", "title")).toBe(
      'ALTER TABLE "tasks" ADD COLUMN "title"',
    );
    expect(() => buildCreateTable("bad name")).toThrow();
  });
});

describe("buildInsert", () => {
  it("builds a parameterized insert", () => {
    expect(buildInsert("tasks", { title: "a", done: false })).toEqual({
      sql: 'INSERT INTO "tasks" ("title", "done") VALUES (?, ?)',
      params: ["a", 0],
    });
  });

  it("uses DEFAULT VALUES for an empty row", () => {
    expect(buildInsert("tasks", {})).toEqual({
      sql: 'INSERT INTO "tasks" DEFAULT VALUES',
      params: [],
    });
  });

  it("rejects bad column names", () => {
    expect(() => buildInsert("tasks", { "a b": 1 })).toThrow();
  });
});

describe("buildSelect / buildCount", () => {
  it("orders by id by default", () => {
    expect(buildSelect({ table: "tasks", where: [] })).toEqual({
      sql: 'SELECT * FROM "tasks" ORDER BY "id"',
      params: [],
    });
  });

  it("combines where, order and limit", () => {
    expect(
      buildSelect({
        table: "tasks",
        where: [
          { col: "score", op: ">", value: 3 },
          { col: "done", op: "=", value: true },
        ],
        orderBy: { col: "score", dir: "desc" },
        limit: 5,
      }),
    ).toEqual({
      sql: 'SELECT * FROM "tasks" WHERE "score" > ? AND "done" = ? ORDER BY "score" DESC LIMIT 5',
      params: [3, 1],
    });
  });

  it("uses IS NULL / IS NOT NULL without params", () => {
    expect(
      buildSelect({ table: "t", where: [{ col: "note", op: "=", value: null }] }),
    ).toEqual({
      sql: 'SELECT * FROM "t" WHERE "note" IS NULL ORDER BY "id"',
      params: [],
    });
    expect(
      buildSelect({ table: "t", where: [{ col: "note", op: "!=", value: null }] }),
    ).toEqual({
      sql: 'SELECT * FROM "t" WHERE "note" IS NOT NULL ORDER BY "id"',
      params: [],
    });
    expect(
      buildSelect({
        table: "t",
        where: [{ col: "note", op: "=", value: undefined }],
      }).sql,
    ).toContain('"note" IS NULL');
  });

  it("validates ops, limit and order direction inputs", () => {
    expect(() =>
      buildSelect({
        table: "t",
        where: [{ col: "a", op: "<>" as never, value: 1 }],
      }),
    ).toThrow("ตัวเปรียบเทียบไม่ถูกต้อง");
    expect(() =>
      buildSelect({ table: "t", where: [], limit: -1 }),
    ).toThrow("limit()");
    expect(() =>
      buildSelect({
        table: "t",
        where: [],
        orderBy: { col: "a b", dir: "asc" },
      }),
    ).toThrow("ชื่อตาราง/คอลัมน์ไม่ถูกต้อง");
  });

  it("builds count", () => {
    expect(
      buildCount({ table: "tasks", where: [{ col: "done", op: "=", value: 1 }] }),
    ).toEqual({
      sql: 'SELECT COUNT(*) AS "n" FROM "tasks" WHERE "done" = ?',
      params: [1],
    });
    expect(buildCount({ table: "tasks", where: [] })).toEqual({
      sql: 'SELECT COUNT(*) AS "n" FROM "tasks"',
      params: [],
    });
  });
});

describe("buildUpdate / buildDelete", () => {
  it("builds update by id", () => {
    expect(buildUpdate("tasks", 7, { done: true })).toEqual({
      sql: 'UPDATE "tasks" SET "done" = ? WHERE "id" = ?',
      params: [1, 7],
    });
  });

  it("rejects an empty patch", () => {
    expect(() => buildUpdate("tasks", 1, {})).toThrow(
      "update() ต้องมีอย่างน้อย 1 คอลัมน์",
    );
  });

  it("builds delete by id or all", () => {
    expect(buildDelete("tasks", 7)).toEqual({
      sql: 'DELETE FROM "tasks" WHERE "id" = ?',
      params: [7],
    });
    expect(buildDelete("tasks")).toEqual({
      sql: 'DELETE FROM "tasks"',
      params: [],
    });
  });
});
