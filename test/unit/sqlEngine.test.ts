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

describe("createDbAwareRunner", () => {
  it("runs on the next microtask with true when the project does not use db", async () => {
    vi.resetModules();
    const mod = await import("../../app/utils/sqlEngine");
    const run = vi.fn();
    const promise = mod.createDbAwareRunner()({ p1: "notify.toast(1)" }, run);
    expect(run).not.toHaveBeenCalled();
    await promise;
    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith(true);
    expect(mod.getLoadedSqlEngine()).toBeNull();
  });

  it("drops a run that a newer call superseded while the engine was loading", async () => {
    vi.resetModules();
    let resolveEngine!: (engine: unknown) => void;
    const fakeEngine = { Database: class {} };
    vi.doMock("sql.js", () => ({
      default: vi.fn(() => new Promise((resolve) => (resolveEngine = resolve))),
    }));
    const mod = await import("../../app/utils/sqlEngine");
    const runner = mod.createDbAwareRunner();
    const first = vi.fn();
    const second = vi.fn();

    const p1 = runner({ p1: "db.run('x')" }, first);
    const p2 = runner({ p1: "db.run('y')" }, second);
    // sql.js is imported asynchronously before initSqlJs runs
    await vi.waitFor(() => expect(resolveEngine).toBeTypeOf("function"));
    resolveEngine(fakeEngine);
    await Promise.all([p1, p2]);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledWith(true);
  });

  it("runs with false when the engine fails to load", async () => {
    vi.resetModules();
    vi.doMock("sql.js", () => ({ default: vi.fn(() => Promise.reject(new Error("boom"))) }));
    const mod = await import("../../app/utils/sqlEngine");
    const run = vi.fn();
    await mod.createDbAwareRunner()({ p1: "db.run('x')" }, run);
    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith(false);
  });
});
