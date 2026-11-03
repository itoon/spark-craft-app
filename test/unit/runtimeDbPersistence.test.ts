import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createRuntimeDb, dbStorageKey, dbVersion, resetProjectDb } from "../../app/utils/runtimeDb";
import { loadSqlEngine, type SqlEngine } from "../../app/utils/sqlEngine";

const QUOTA_COPY = "บันทึกฐานข้อมูลลงเครื่องไม่ได้ — ข้อมูลอาจหายเมื่อปิดแอป";
const CORRUPT_COPY = "ข้อมูลฐานข้อมูลที่บันทึกไว้เสีย — เริ่มฐานข้อมูลใหม่";

let engine: SqlEngine;
let store: Map<string, string>;
let setItem: (key: string, value: string) => void;

beforeAll(async () => {
  engine = await loadSqlEngine();
});

beforeEach(() => {
  store = new Map();
  setItem = (key, value) => void store.set(key, value);
  (globalThis as { window?: unknown }).window = {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => setItem(key, value),
      removeItem: (key: string) => void store.delete(key),
    },
  };
});

afterEach(() => {
  for (const ns of ["p1", "p2", "default"]) resetProjectDb(ns);
  delete (globalThis as { window?: unknown }).window;
});

function dbFor(namespace: string, log?: (type: "log" | "warn" | "error" | "success", message: string) => void) {
  return createRuntimeDb({ getEngine: () => engine, namespace, log });
}

describe("runtimeDb persistence", () => {
  it("builds the storage key from the namespace", () => {
    expect(dbStorageKey("p1")).toBe("codecraft-app-db:p1");
    expect(dbStorageKey()).toBe("codecraft-app-db:default");
  });

  it("restores saved rows after the module cache is cleared", async () => {
    dbFor("p1").table("t").add({ a: 1 });
    expect(store.has("codecraft-app-db:p1")).toBe(true);

    vi.resetModules();
    const fresh = await import("../../app/utils/runtimeDb");
    const db = fresh.createRuntimeDb({ getEngine: () => engine, namespace: "p1" });
    expect(db.table("t").all()).toEqual([{ id: 1, a: 1 }]);
    fresh.resetProjectDb("p1");
  });

  it("shares one database between instances of a namespace, but not across namespaces", () => {
    const a = dbFor("p1");
    const b = dbFor("p1");
    a.run("CREATE TABLE t (x)");
    a.run("INSERT INTO t VALUES (1)");
    expect(b.query("SELECT x FROM t")).toEqual([{ x: 1 }]);
    b.table("u").add({ n: 2 });
    expect(a.table("u").count()).toBe(1);
    expect(dbFor("p2").tables()).toEqual([]);
  });

  it("bumps dbVersion once per write and not for reads", () => {
    const db = dbFor("p1");
    const start = dbVersion.value;
    db.run("CREATE TABLE t (id INTEGER PRIMARY KEY, x)");
    expect(dbVersion.value).toBe(start + 1);
    db.query("INSERT INTO t (x) VALUES (1)");
    expect(dbVersion.value).toBe(start + 2);
    db.table("t").add({ x: 2 });
    expect(dbVersion.value).toBe(start + 3);
    db.table("t").update(1, { x: 5 });
    db.table("t").remove(1);
    db.table("t").clear();
    expect(dbVersion.value).toBe(start + 6);

    db.query("SELECT * FROM t");
    db.query("  -- note\n with c as (select 1) select * from c");
    db.query("PRAGMA table_info(t)");
    db.one("SELECT 1");
    db.tables();
    db.table("t").all();
    db.table("t").find({ x: 1 });
    db.table("t").count();
    db.table("t").get(1);
    db.table("t").where("x", ">", 0).get();
    expect(dbVersion.value).toBe(start + 6);
  });

  it("does not bump dbVersion or save when a write fails", () => {
    const db = dbFor("p1");
    db.run("CREATE TABLE t (x)");
    const start = dbVersion.value;
    const saved = store.get("codecraft-app-db:p1");
    expect(() => db.run("INSERT INTO nope VALUES (1)")).toThrow();
    expect(() => db.query("DELETE FROM nope")).toThrow();
    expect(dbVersion.value).toBe(start);
    expect(store.get("codecraft-app-db:p1")).toBe(saved);
  });

  it("warns when storage is full but keeps the data in memory", () => {
    setItem = () => {
      throw new Error("QuotaExceededError");
    };
    const log = vi.fn();
    const db = dbFor("p1", log);
    expect(db.table("t").add({ a: 1 })).toBe(1);
    expect(log).toHaveBeenCalledWith("warn", QUOTA_COPY);
    expect(db.table("t").all()).toEqual([{ id: 1, a: 1 }]);
  });

  it("starts empty, warns and drops the key when saved data is not base64", () => {
    store.set("codecraft-app-db:p1", "not-base64!!");
    const log = vi.fn();
    const db = dbFor("p1", log);
    expect(db.tables()).toEqual([]);
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith("warn", CORRUPT_COPY);
    expect(store.has("codecraft-app-db:p1")).toBe(false);
    db.table("t").add({ a: 1 });
    expect(store.has("codecraft-app-db:p1")).toBe(true);
    expect(log).toHaveBeenCalledTimes(1);
  });

  it("starts empty and warns when saved data is valid base64 but not a SQLite file", () => {
    store.set("codecraft-app-db:p1", btoa("this is definitely not a sqlite database file".repeat(5)));
    const log = vi.fn();
    const db = dbFor("p1", log);
    expect(db.tables()).toEqual([]);
    expect(log).toHaveBeenCalledWith("warn", CORRUPT_COPY);
    expect(store.has("codecraft-app-db:p1")).toBe(false);
  });

  it("resetProjectDb removes the key, bumps dbVersion and gives existing instances a fresh empty db", () => {
    const db = dbFor("p1");
    db.table("t").add({ a: 1 });
    const before = dbVersion.value;
    resetProjectDb("p1");
    expect(store.has("codecraft-app-db:p1")).toBe(false);
    expect(dbVersion.value).toBe(before + 1);
    expect(db.tables()).toEqual([]);
    expect(dbFor("p1").tables()).toEqual([]);
  });

  it("works in memory only, without warnings, when localStorage is unavailable", () => {
    delete (globalThis as { window?: unknown }).window;
    const log = vi.fn();
    const db = dbFor("p1", log);
    const start = dbVersion.value;
    expect(db.table("t").add({ a: 1 })).toBe(1);
    expect(db.table("t").all()).toEqual([{ id: 1, a: 1 }]);
    expect(dbVersion.value).toBe(start + 1);
    expect(log).not.toHaveBeenCalled();
  });

  it("dry run never touches the cache, localStorage or dbVersion", () => {
    dbFor("p1").table("t").add({ a: 1 });
    const saved = store.get("codecraft-app-db:p1");
    const start = dbVersion.value;
    const dry = createRuntimeDb({ getEngine: () => engine, namespace: "p1", dryRun: true });
    expect(dry.tables()).toEqual([]);
    dry.table("t").add({ a: 2 });
    dry.run("CREATE TABLE u (x)");
    expect(store.get("codecraft-app-db:p1")).toBe(saved);
    expect(dbVersion.value).toBe(start);
    expect(dbFor("p1").table("t").all()).toEqual([{ id: 1, a: 1 }]);

    const fresh = new Map<string, string>();
    store = fresh;
    createRuntimeDb({ getEngine: () => engine, namespace: "p2", dryRun: true }).table("t").add({ a: 1 });
    expect(fresh.size).toBe(0);
  });
});
