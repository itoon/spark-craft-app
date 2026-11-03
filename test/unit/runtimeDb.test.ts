import { beforeAll, describe, expect, it, vi } from "vitest";

import { createRuntimeDb, friendlySqlError } from "../../app/utils/runtimeDb";
import { loadSqlEngine, type SqlEngine } from "../../app/utils/sqlEngine";

let engine: SqlEngine;

beforeAll(async () => {
  engine = await loadSqlEngine();
});

function makeDb(initialDb?: string) {
  return createRuntimeDb({ getEngine: () => engine, dryRun: true, initialDb });
}

function tasksDb() {
  const db = makeDb();
  db.run("CREATE TABLE tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL UNIQUE)");
  db.run("INSERT INTO tasks (title) VALUES (?)", ["a"]);
  db.run("INSERT INTO tasks (title) VALUES (?)", ["b"]);
  return db;
}

describe("runtimeDb run / query / one", () => {
  it("returns changes and lastId from run", () => {
    const db = makeDb();
    db.run("CREATE TABLE tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT)");
    expect(db.run("INSERT INTO tasks (title) VALUES (?)", ["a"])).toEqual({ changes: 1, lastId: 1 });
    expect(db.run("INSERT INTO tasks (title) VALUES (?)", ["b"])).toEqual({ changes: 1, lastId: 2 });
    expect(db.run("UPDATE tasks SET title = ?", ["z"])).toEqual({ changes: 2, lastId: null });
  });

  it("detects INSERT / REPLACE through leading whitespace and comments", () => {
    const db = makeDb();
    db.run("CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT)");
    expect(db.run("  -- add one\n  insert into t (v) values ('x')").lastId).toBe(1);
    expect(db.run("REPLACE INTO t (id, v) VALUES (1, 'y')").lastId).toBe(1);
    expect(db.run("DELETE FROM t").lastId).toBeNull();
  });

  it("queries rows as objects and one() returns null when nothing matches", () => {
    const db = tasksDb();
    expect(db.query("SELECT title FROM tasks WHERE id = ?", [2])).toEqual([{ title: "b" }]);
    expect(db.one("SELECT title FROM tasks WHERE id = ?", [1])).toEqual({ title: "a" });
    expect(db.one("SELECT title FROM tasks WHERE id = ?", [99])).toBeNull();
  });

  it("stores booleans as 1 / 0", () => {
    const db = makeDb();
    db.run("CREATE TABLE t (done)");
    db.run("INSERT INTO t (done) VALUES (?)", [true]);
    expect(db.query("SELECT done FROM t")).toEqual([{ done: 1 }]);
  });

  it("runs several statements at once when there are no params", () => {
    const db = makeDb();
    db.run("CREATE TABLE a (x); INSERT INTO a VALUES (1);");
    expect(db.query("SELECT x FROM a")).toEqual([{ x: 1 }]);
  });

  it("lists user tables sorted, without sqlite_sequence", () => {
    const db = tasksDb();
    db.run("CREATE TABLE a (x)");
    expect(db.tables()).toEqual(["a", "tasks"]);
  });
});

describe("runtimeDb errors", () => {
  it("adds a hint for a missing table", () => {
    const db = makeDb();
    let message = "";
    try {
      db.query("SELECT * FROM nope");
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message.startsWith("ฐานข้อมูล: no such table: nope")).toBe(true);
    expect(message.endsWith(" — ยังไม่ได้ CREATE TABLE หรือเปล่า?")).toBe(true);
  });

  it("adds a hint for a missing column", () => {
    const db = tasksDb();
    expect(() => db.query("SELECT nope FROM tasks")).toThrow(
      /^ฐานข้อมูล: no such column: nope — สะกดชื่อคอลัมน์ถูกไหม\?$/,
    );
  });

  it("adds a hint for a syntax error", () => {
    const db = makeDb();
    expect(() => db.run("SELEC 1")).toThrow(
      / — เช็กคำสั่ง SQL อีกครั้ง \(ลืม , หรือ ' หรือเปล่า\?\)$/,
    );
  });

  it("adds a hint for a UNIQUE violation", () => {
    const db = tasksDb();
    expect(() => db.run("INSERT INTO tasks (title) VALUES (?)", ["a"])).toThrow(
      /^ฐานข้อมูล: UNIQUE constraint failed: tasks\.title — มีข้อมูลนี้อยู่แล้ว$/,
    );
  });

  it("adds a hint for a NOT NULL violation", () => {
    const db = tasksDb();
    expect(() => db.run("INSERT INTO tasks (title) VALUES (NULL)")).toThrow(
      /^ฐานข้อมูล: NOT NULL constraint failed: tasks\.title — ยังไม่ได้ใส่ค่าที่จำเป็น$/,
    );
  });

  it("rejects params that are not an array", () => {
    const db = tasksDb();
    expect(() => db.query("SELECT * FROM tasks WHERE id = ?", 5 as never)).toThrow(
      new Error("params ต้องเป็น array เช่น [a, b]"),
    );
  });

  it("throws the engine-missing message when the engine has not loaded", () => {
    const db = createRuntimeDb({ getEngine: () => null });
    expect(() => db.query("SELECT 1")).toThrow(
      new Error("ฐานข้อมูลยังโหลดไม่สำเร็จ — ลองกด Run ใหม่อีกครั้ง"),
    );
  });

  it("does not wrap friendly errors twice and handles non-Error values", () => {
    const first = friendlySqlError(new Error("no such table: x"));
    expect(friendlySqlError(first)).toBe(first);
    expect(friendlySqlError("boom").message).toBe("ฐานข้อมูล: boom");
    expect(friendlySqlError(new Error("other")).message).toBe("ฐานข้อมูล: other");
  });

  it("picks up the engine lazily on the first call", () => {
    let current: SqlEngine | null = null;
    const db = createRuntimeDb({ getEngine: () => current, dryRun: true });
    expect(() => db.tables()).toThrow("ฐานข้อมูลยังโหลดไม่สำเร็จ");
    current = engine;
    expect(db.tables()).toEqual([]);
  });
});

describe("runtimeDb dry run", () => {
  it("runs initialDb on creation", () => {
    const db = makeDb("CREATE TABLE s (n); INSERT INTO s VALUES (7);");
    expect(db.query("SELECT n FROM s")).toEqual([{ n: 7 }]);
  });

  it("keeps dry-run databases isolated from each other", () => {
    const first = makeDb();
    const second = makeDb();
    first.run("CREATE TABLE only_first (x)");
    expect(first.tables()).toEqual(["only_first"]);
    expect(second.tables()).toEqual([]);
  });

  it("records the db calls it receives, but not initialDb", () => {
    const record = vi.fn();
    const db = createRuntimeDb({
      getEngine: () => engine,
      dryRun: true,
      initialDb: "CREATE TABLE s (n);",
      record,
    });
    db.query("SELECT 1");
    expect(record.mock.calls.map((c) => c[0])).toEqual(["db.query"]);
    db.run("SELECT 1");
    db.one("SELECT 1");
    db.tables();
    expect(record.mock.calls.map((c) => c[0])).toEqual(["db.query", "db.run", "db.one", "db.tables"]);
  });
});
