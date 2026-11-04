import { beforeAll, describe, expect, it, vi } from "vitest";

import { createRuntimeDb, friendlySqlError, resetProjectDb } from "../../app/utils/runtimeDb";
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

describe("runtimeDb run() accuracy", () => {
  it("reports changes: 0 for a statement that modifies no rows after an UPDATE", () => {
    const db = tasksDb();
    expect(db.run("UPDATE tasks SET title = title || '!'").changes).toBe(2);
    expect(db.run("CREATE TABLE later (x)")).toEqual({ changes: 0, lastId: null });
  });

  it("sums changes across a multi-statement script", () => {
    const db = makeDb();
    const result = db.run("CREATE TABLE m (x); INSERT INTO m VALUES (1); INSERT INTO m VALUES (2);");
    expect(result.changes).toBe(2);
  });

  it("ignores ; inside string literals when classifying statements", () => {
    const db = makeDb();
    db.run("CREATE TABLE notes (id INTEGER PRIMARY KEY AUTOINCREMENT, body TEXT)");
    db.run("INSERT INTO notes (body) VALUES ('first')");
    expect(db.run("INSERT INTO notes (body) VALUES ('hi; bye')")).toEqual({ changes: 1, lastId: 2 });
    expect(db.run('INSERT INTO notes (body) VALUES ("a;b")').lastId).toBe(3);
    expect(db.run("INSERT INTO notes (body) VALUES ('it''s; ok')").lastId).toBe(4);
    expect(db.run("-- c; d\nINSERT INTO notes (body) VALUES ('x')").lastId).toBe(5);
    expect(db.query("SELECT body FROM notes WHERE id = 2")).toEqual([{ body: "hi; bye" }]);
  });
});

describe("db.table", () => {
  function tableDb() {
    const db = makeDb();
    const t = db.table("tasks");
    t.add({ title: "a", done: false });
    t.add({ title: "b", done: true, score: 9 });
    return { db, t };
  }

  it("adds rows, creating the table and missing columns", () => {
    const db = makeDb();
    const t = db.table("tasks");
    expect(t.add({ title: "a", done: false })).toBe(1);
    expect(t.add({ title: "b", done: true, score: 9 })).toBe(2);
    expect(t.all()).toEqual([
      { id: 1, title: "a", done: 0, score: null },
      { id: 2, title: "b", done: 1, score: 9 },
    ]);
    expect(db.query("SELECT COUNT(*) AS n FROM tasks")).toEqual([{ n: 2 }]);
  });

  it("finds, counts and gets rows", () => {
    const { t } = tableDb();
    expect(t.find({ done: true }).map((r) => r.id)).toEqual([2]);
    expect(t.find({ score: null }).map((r) => r.id)).toEqual([1]);
    expect(t.count()).toBe(2);
    expect(t.count({ done: false })).toBe(1);
    expect(t.get(2)?.title).toBe("b");
    expect(t.get(99)).toBeNull();
  });

  it("filters with where / orderBy / limit chains", () => {
    const { t } = tableDb();
    expect(t.where("score", ">", 3).get().map((r) => r.id)).toEqual([2]);
    expect(t.where("done", "=", 1).where("score", ">=", 9).first()?.id).toBe(2);
    expect(t.where("id", ">", 0).orderBy("id", "desc").limit(1).get()[0]!.id).toBe(2);
    expect(t.where("title", "like", "%a%").count()).toBe(1);
  });

  it("keeps queries immutable so a base query can be reused", () => {
    const { t } = tableDb();
    const base = t.where("done", "=", 1);
    expect(base.limit(0).get()).toEqual([]);
    expect(base.get().length).toBe(1);
    const sorted = t.where("id", ">", 0).orderBy("title");
    expect(sorted.orderBy("title", "desc").first()?.id).toBe(2);
    expect(sorted.first()?.id).toBe(1);
  });

  it("normalizes orderBy direction and rejects anything else", () => {
    const { t } = tableDb();
    expect(t.where("id", ">", 0).orderBy("id", " DESC " as never).first()?.id).toBe(2);
    expect(t.where("id", ">", 0).orderBy("id").first()?.id).toBe(1);
    expect(() => t.where("id", ">", 0).orderBy("id", "up" as never)).toThrow(
      new Error("orderBy() ใช้ได้แค่ 'asc' หรือ 'desc'"),
    );
    expect(() => t.where("id", ">", 0).orderBy("id", null as never)).toThrow(
      "orderBy() ใช้ได้แค่ 'asc' หรือ 'desc'",
    );
  });

  it("updates rows, adding columns as needed", () => {
    const { t } = tableDb();
    expect(t.update(1, { note: "x" })).toBe(1);
    expect(t.get(1)?.note).toBe("x");
    expect(t.update(99, { note: "y" })).toBe(0);
  });

  it("removes one row and clears the rest", () => {
    const { t } = tableDb();
    expect(t.remove(1)).toBe(1);
    expect(t.clear()).toBe(1);
    expect(t.all()).toEqual([]);
  });

  it("refuses remove() without an id so a typo cannot wipe the table", () => {
    const { t } = tableDb();
    const row = { id: 1 } as Record<string, unknown>;
    expect(() => t.remove(row.idd)).toThrow(new Error("remove() ต้องระบุ id"));
    expect(() => t.remove(null)).toThrow(new Error("remove() ต้องระบุ id"));
    expect(t.count()).toBe(2);
  });

  it("treats a missing table as empty without creating it", () => {
    const db = makeDb();
    const ghost = db.table("ghost");
    expect(ghost.all()).toEqual([]);
    expect(ghost.find({ a: 1 })).toEqual([]);
    expect(ghost.count()).toBe(0);
    expect(ghost.get(1)).toBeNull();
    expect(ghost.where("a", "=", 1).first()).toBeNull();
    expect(ghost.where("a", "=", 1).get()).toEqual([]);
    expect(ghost.where("a", "=", 1).count()).toBe(0);
    expect(ghost.update(1, { a: 1 })).toBe(0);
    expect(ghost.remove(1)).toBe(0);
    expect(ghost.clear()).toBe(0);
    expect(db.tables()).not.toContain("ghost");
  });

  it("supports Thai table and column names", () => {
    const db = makeDb();
    const t = db.table("งาน");
    t.add({ ชื่อ: "ล้างจาน" });
    expect(t.find({ ชื่อ: "ล้างจาน" }).length).toBe(1);
  });

  it("throws Thai validation errors as-is, without the ฐานข้อมูล: prefix", () => {
    const { t, db } = tableDb();
    expect(() => db.table("a b")).toThrow(new Error("ชื่อตาราง/คอลัมน์ไม่ถูกต้อง: a b"));
    expect(() => t.where("x", "<>", 1)).toThrow(
      new Error("ตัวเปรียบเทียบไม่ถูกต้อง: <> (ใช้ได้: = != > >= < <= LIKE)"),
    );
    expect(() => t.where("a b", "=", 1)).toThrow("ชื่อตาราง/คอลัมน์ไม่ถูกต้อง: a b");
    expect(() => t.where("id", ">", 0).limit(-1)).toThrow(
      new Error("limit() ต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป"),
    );
    expect(() => t.add({ "bad name": 1 })).toThrow("ชื่อตาราง/คอลัมน์ไม่ถูกต้อง: bad name");
    expect(() => t.update(1, {})).toThrow(new Error("update() ต้องมีอย่างน้อย 1 คอลัมน์"));
    expect(() => t.find({ "x y": 1 })).toThrow("ชื่อตาราง/คอลัมน์ไม่ถูกต้อง: x y");
    expect(t.count()).toBe(2);
  });

  it("still wraps sqlite errors from helper SQL", () => {
    const db = makeDb();
    db.run("CREATE TABLE u (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)");
    const t = db.table("u");
    t.add({ name: "a" });
    expect(() => t.add({ name: "a" })).toThrow(/^ฐานข้อมูล: UNIQUE constraint failed: u\.name — มีข้อมูลนี้อยู่แล้ว$/);
  });

  it("records helper calls by name", () => {
    const record = vi.fn();
    const db = createRuntimeDb({ getEngine: () => engine, dryRun: true, record });
    const t = db.table("tasks");
    t.add({ title: "a" });
    t.where("id", ">", 0).get();
    expect(record.mock.calls.map((c) => c[0])).toEqual(["db.table.add", "db.table.where"]);
    record.mockClear();
    t.all();
    t.find({ title: "a" });
    t.count();
    t.get(1);
    t.update(1, { title: "b" });
    t.remove(1);
    t.clear();
    t.where("id", ">", 0).first();
    t.where("id", ">", 0).count();
    expect(record.mock.calls.map((c) => c[0])).toEqual([
      "db.table.all",
      "db.table.find",
      "db.table.count",
      "db.table.get",
      "db.table.update",
      "db.table.remove",
      "db.table.clear",
      "db.table.where",
      "db.table.where",
    ]);
  });
});

describe("db.table argument validation", () => {
  const BAD_VALUES: Array<[string, unknown]> = [
    ["undefined", undefined],
    ["null", null],
    ["a string", "x"],
    ["an array", [1]],
    ["a number", 5],
  ];

  for (const [label, bad] of BAD_VALUES) {
    it(`rejects ${label} for add / find / update / count(filter)`, () => {
      const t = makeDb().table("tasks");
      expect(() => t.add(bad as never)).toThrow("add() ต้องได้ object เช่น { ชื่อ: 'ค่า' }");
      expect(() => t.find(bad as never)).toThrow("find() ต้องได้ object เช่น { ชื่อ: 'ค่า' }");
      expect(() => t.update(1, bad as never)).toThrow("update() ต้องได้ object เช่น { ชื่อ: 'ค่า' }");
      if (bad !== undefined) {
        expect(() => t.count(bad as never)).toThrow("count() ต้องได้ object เช่น { ชื่อ: 'ค่า' }");
      }
    });
  }

  it("keeps count() without an argument valid and does not wrap the message", () => {
    const t = makeDb().table("tasks");
    expect(t.count()).toBe(0);
    expect(() => t.add(undefined as never)).toThrow(/^add\(\) ต้องได้ object/);
  });
});

describe("runtimeDb dispose", () => {
  function spyClose() {
    return vi.spyOn(engine.Database.prototype, "close");
  }

  it("closes the dry-run database exactly once, even when disposed twice", () => {
    const close = spyClose();
    try {
      const db = makeDb();
      db.run("CREATE TABLE t (x)");
      db.dispose();
      expect(close).toHaveBeenCalledTimes(1);
      db.dispose();
      expect(close).toHaveBeenCalledTimes(1);
    } finally {
      close.mockRestore();
    }
  });

  it("does nothing when the dry-run database was never created", () => {
    const close = spyClose();
    try {
      makeDb().dispose();
      expect(close).not.toHaveBeenCalled();
    } finally {
      close.mockRestore();
    }
  });

  it("leaves the shared per-namespace database open for a non-dry-run db", () => {
    const close = spyClose();
    try {
      const db = createRuntimeDb({ getEngine: () => engine, namespace: "dispose-shared" });
      db.run("CREATE TABLE t (x)");
      db.dispose();
      expect(close).not.toHaveBeenCalled();
      expect(db.tables()).toEqual(["t"]);
    } finally {
      close.mockRestore();
      resetProjectDb("dispose-shared");
    }
  });

  it("closes the new database when initialDb throws", () => {
    const close = spyClose();
    try {
      const db = makeDb("THIS IS NOT SQL");
      expect(() => db.tables()).toThrow();
      expect(close).toHaveBeenCalledTimes(1);
    } finally {
      close.mockRestore();
    }
  });
});
