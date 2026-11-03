import { afterEach, describe, expect, it, vi } from "vitest";

import {
  codeUsesDb,
  ensureSqlEngineFor,
  getLoadedSqlEngine,
  loadSqlEngine,
  projectUsesDb,
  sqlEngineReady,
} from "../../app/utils/sqlEngine";

afterEach(() => {
  vi.doUnmock("sql.js");
  vi.resetModules();
});

describe("codeUsesDb", () => {
  it("detects db.* usage", () => {
    expect(codeUsesDb("db.run('x')")).toBe(true);
    expect(codeUsesDb("db .query()")).toBe(true);
    expect(codeUsesDb("var r = db.table('t')")).toBe(true);
  });

  it("ignores lookalikes", () => {
    expect(codeUsesDb("dbx.run()")).toBe(false);
    expect(codeUsesDb("storage.get('db')")).toBe(false);
    expect(codeUsesDb("// no database")).toBe(false);
    expect(codeUsesDb("mydb.run()")).toBe(false);
  });
});

describe("projectUsesDb", () => {
  it("is true when any page uses db", () => {
    expect(projectUsesDb({ p1: "notify.toast(1)", p2: "db.query('SELECT 1')" })).toBe(true);
  });

  it("is false for no pages or no db usage", () => {
    expect(projectUsesDb({})).toBe(false);
    expect(projectUsesDb({ p1: "notify.toast(1)" })).toBe(false);
  });
});

describe("loadSqlEngine", () => {
  it("loads a working engine, caches the promise and flips sqlEngineReady", async () => {
    const first = loadSqlEngine();
    expect(loadSqlEngine()).toBe(first);

    const engine = await first;
    const result = new engine.Database().exec("SELECT 1 AS n");
    expect(result[0]!.values).toEqual([[1]]);
    expect(getLoadedSqlEngine()).toBe(engine);
    expect(sqlEngineReady.value).toBe(true);
  });

  it("clears the cache after a failure so the next call retries", async () => {
    vi.resetModules();
    let calls = 0;
    const fakeEngine = { Database: class {} };
    vi.doMock("sql.js", () => ({
      default: vi.fn(() => {
        calls += 1;
        return calls < 3 ? Promise.reject(new Error("boom")) : Promise.resolve(fakeEngine);
      }),
    }));
    const mod = await import("../../app/utils/sqlEngine");

    await expect(mod.loadSqlEngine()).rejects.toThrow("boom");
    expect(mod.getLoadedSqlEngine()).toBeNull();
    expect(mod.sqlEngineReady.value).toBe(false);
    await expect(mod.ensureSqlEngineFor({ p: "db.run(1)" })).resolves.toBe(false);
    await expect(mod.loadSqlEngine()).resolves.toBe(fakeEngine);
    expect(calls).toBe(3);
  });
});

describe("ensureSqlEngineFor", () => {
  it("resolves true without loading when the project does not use db", async () => {
    vi.resetModules();
    const mod = await import("../../app/utils/sqlEngine");
    await expect(mod.ensureSqlEngineFor({ p1: "notify.toast(1)" })).resolves.toBe(true);
    expect(mod.getLoadedSqlEngine()).toBeNull();
  });

  it("loads the engine when the project uses db", async () => {
    vi.resetModules();
    const mod = await import("../../app/utils/sqlEngine");
    await expect(mod.ensureSqlEngineFor({ p1: "db.run('SELECT 1')" })).resolves.toBe(true);
    expect(mod.getLoadedSqlEngine()).not.toBeNull();
  });
});
