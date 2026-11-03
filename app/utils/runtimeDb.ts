/**
 * Learner-facing `db` runtime service: a synchronous SQLite API on top of
 * sql.js. This file holds the raw SQL surface (`run` / `query` / `one` /
 * `tables`), the `db.table(...)` helpers, friendly Thai error messages and
 * the dry-run mode used by the learning checker.
 *
 * The engine is obtained lazily on the first call, so a handler that fires
 * after the wasm finished loading still works. Dry run always gets a fresh
 * in-memory database and never touches persistence.
 *
 * A normal (non-dry-run) RuntimeDb shares one cached database per namespace
 * (`openProjectDb`), saved to localStorage as base64 after every successful
 * write. `dbVersion` ticks on each write so UI (the Database panel) can refresh.
 */
import { shallowRef, type ShallowRef } from "vue";

import { safeLocalStorage } from "./safeLocalStorage";
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
  type Condition,
  type SelectSpec,
  type SqlStatement,
  type SqlValue,
} from "./sqlBuilders";
import type { SqlEngine } from "./sqlEngine";

export interface DbRunResult {
  changes: number;
  lastId: number | null;
}

export type DbRow = Record<string, SqlValue>;

/** An immutable, chainable read query: every call returns a new `DbQuery`. */
export interface DbQuery {
  where(col: string, op: string, value: unknown): DbQuery;
  orderBy(col: string, dir?: "asc" | "desc"): DbQuery;
  limit(n: number): DbQuery;
  get(): DbRow[];
  first(): DbRow | null;
  count(): number;
}

/** Beginner-friendly helpers over one table (created on the first `add`). */
export interface DbTable {
  add(row: Record<string, unknown>): number;
  all(): DbRow[];
  find(filter: Record<string, unknown>): DbRow[];
  count(filter?: Record<string, unknown>): number;
  get(id: unknown): DbRow | null;
  update(id: unknown, patch: Record<string, unknown>): number;
  remove(id: unknown): number;
  clear(): number;
  where(col: string, op: string, value: unknown): DbQuery;
}

export interface RuntimeDb {
  run(sql: string, params?: unknown[]): DbRunResult;
  query(sql: string, params?: unknown[]): DbRow[];
  one(sql: string, params?: unknown[]): DbRow | null;
  tables(): string[];
  table(name: string): DbTable;
}

export interface RuntimeDbOptions {
  getEngine: () => SqlEngine | null;
  namespace?: string;
  dryRun?: boolean;
  /** Dry run only: SQL executed on the fresh database, not recorded. */
  initialDb?: string;
  record?: (name: string) => void;
  log?: (type: "log" | "warn" | "error" | "success", message: string) => void;
}

const ENGINE_MISSING = "ฐานข้อมูลยังโหลดไม่สำเร็จ — ลองกด Run ใหม่อีกครั้ง";
const BAD_PARAMS = "params ต้องเป็น array เช่น [a, b]";
const BAD_ORDER_DIR = "orderBy() ใช้ได้แค่ 'asc' หรือ 'desc'";
const REMOVE_NEEDS_ID = "remove() ต้องระบุ id";
const SAVE_FAILED = "บันทึกฐานข้อมูลลงเครื่องไม่ได้ — ข้อมูลอาจหายเมื่อปิดแอป";
const SAVED_DATA_CORRUPT = "ข้อมูลฐานข้อมูลที่บันทึกไว้เสีย — เริ่มฐานข้อมูลใหม่";
const BASE64_CHUNK = 0x8000;

const HINTS: ReadonlyArray<readonly [string, string]> = [
  ["no such table", " — ยังไม่ได้ CREATE TABLE หรือเปล่า?"],
  ["no such column", " — สะกดชื่อคอลัมน์ถูกไหม?"],
  ["syntax error", " — เช็กคำสั่ง SQL อีกครั้ง (ลืม , หรือ ' หรือเปล่า?)"],
  ["UNIQUE constraint failed", " — มีข้อมูลนี้อยู่แล้ว"],
  ["NOT NULL constraint failed", " — ยังไม่ได้ใส่ค่าที่จำเป็น"],
];

/** Errors we already worded in Thai; they must not be wrapped a second time. */
class DbError extends Error {}

function dbError(message: string): DbError {
  return new DbError(message);
}

/** Wraps a sqlite error as `ฐานข้อมูล: <message>` plus a hint for common mistakes. */
export function friendlySqlError(err: unknown): Error {
  if (err instanceof DbError) return err;
  const message = err instanceof Error ? err.message : String(err);
  const hint = HINTS.find(([fragment]) => message.includes(fragment))?.[1] ?? "";
  return dbError(`ฐานข้อมูล: ${message}${hint}`);
}

/**
 * Blanks out `'...'` / `"..."` literals and `--` comments so that `;` and
 * keywords inside them cannot fool statement classification. Only for
 * classification; the original SQL is what gets executed.
 */
function maskLiteralsAndComments(sql: string): string {
  let out = "";
  let i = 0;
  while (i < sql.length) {
    const ch = sql[i]!;
    if (ch === "'" || ch === '"') {
      const close = sql.indexOf(ch, i + 1);
      const end = close === -1 ? sql.length : close + 1;
      out += `${ch}${" ".repeat(Math.max(0, end - i - 2))}${close === -1 ? "" : ch}`;
      i = end;
    } else if (ch === "-" && sql[i + 1] === "-") {
      const newline = sql.indexOf("\n", i);
      i = newline === -1 ? sql.length : newline;
    } else {
      out += ch;
      i += 1;
    }
  }
  return out;
}

/** The non-empty `;`-separated statements (comment-only segments are ignored). */
function statementsOf(sql: string): string[] {
  return maskLiteralsAndComments(sql)
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement !== "");
}

/** Helper-validation errors come from the builders as plain Errors; keep them Thai and unwrapped. */
function validated<T>(build: () => T): T {
  try {
    return build();
  } catch (err) {
    throw err instanceof DbError ? err : dbError(err instanceof Error ? err.message : String(err));
  }
}

function checkParams(params: unknown): SqlValue[] {
  if (params === undefined) return [];
  if (!Array.isArray(params)) throw dbError(BAD_PARAMS);
  return params.map(toSqlValue);
}

function checkObject(method: string, value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw dbError(`${method}() ต้องได้ object เช่น { ชื่อ: 'ค่า' }`);
  }
  return value as Record<string, unknown>;
}

/** True unless the statement starts with SELECT / WITH / PRAGMA (so also true for DDL and DML). */
function queryWrites(sql: string): boolean {
  const first = statementsOf(sql)[0] ?? "";
  const keyword = /^[\s(]*([A-Za-z]+)/.exec(first)?.[1]?.toUpperCase();
  return keyword !== "SELECT" && keyword !== "WITH" && keyword !== "PRAGMA";
}

type SqlDatabase = import("sql.js").Database;

/** Bumped after every successful non-dry-run write, so panels know to refresh. */
export const dbVersion: ShallowRef<number> = shallowRef(0);

const projectDbs = new Map<string, SqlDatabase>();

export function dbStorageKey(namespace = "default"): string {
  return `codecraft-app-db:${namespace}`;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += BASE64_CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + BASE64_CHUNK));
  }
  return btoa(binary);
}

function fromBase64(text: string): Uint8Array {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** The saved database for `namespace`, or null when none (or it is unreadable: then warns and drops it). */
function restoreDb(engine: SqlEngine, namespace: string, log: RuntimeDbOptions["log"]): SqlDatabase | null {
  const ls = safeLocalStorage();
  if (!ls) return null;
  const key = dbStorageKey(namespace);
  let saved: string | null = null;
  try {
    saved = ls.getItem(key);
  } catch {
    return null;
  }
  if (saved === null) return null;
  let restored: SqlDatabase | null = null;
  try {
    restored = new engine.Database(fromBase64(saved));
    // Opening garbage succeeds lazily; the first read is what fails.
    restored.exec("SELECT count(*) FROM sqlite_master");
    return restored;
  } catch {
    try {
      restored?.close();
    } catch {
      // already unusable
    }
    log?.("warn", SAVED_DATA_CORRUPT);
    try {
      ls.removeItem(key);
    } catch {
      // storage blocked: nothing more to clean up
    }
    return null;
  }
}

/** The one shared database of a namespace; the first open restores it from localStorage. */
export function openProjectDb(engine: SqlEngine, namespace = "default", log?: RuntimeDbOptions["log"]): SqlDatabase {
  const cached = projectDbs.get(namespace);
  if (cached) return cached;
  const db = restoreDb(engine, namespace, log) ?? new engine.Database();
  projectDbs.set(namespace, db);
  return db;
}

/** Forgets the namespace's database and its saved copy; the next open starts empty. */
export function resetProjectDb(namespace = "default"): void {
  const db = projectDbs.get(namespace);
  projectDbs.delete(namespace);
  try {
    db?.close();
  } catch {
    // already closed
  }
  try {
    safeLocalStorage()?.removeItem(dbStorageKey(namespace));
  } catch {
    // storage blocked: memory is already reset
  }
  dbVersion.value += 1;
}

function saveDb(db: SqlDatabase, namespace: string, log: RuntimeDbOptions["log"]): void {
  const ls = safeLocalStorage();
  if (!ls) return;
  try {
    ls.setItem(dbStorageKey(namespace), toBase64(db.export()));
  } catch {
    log?.("warn", SAVE_FAILED);
  }
}

function totalChanges(db: import("sql.js").Database): number {
  return Number(db.exec("SELECT total_changes()")[0]?.values[0]?.[0] ?? 0);
}

export function createRuntimeDb(options: RuntimeDbOptions): RuntimeDb {
  const namespace = options.namespace ?? "default";
  let dryHandle: SqlDatabase | null = null;

  function getDb(): SqlDatabase {
    if (options.dryRun && dryHandle) return dryHandle;
    const engine = options.getEngine();
    if (!engine) throw dbError(ENGINE_MISSING);
    if (!options.dryRun) return openProjectDb(engine, namespace, options.log);
    const created = new engine.Database();
    if (options.initialDb) created.exec(options.initialDb);
    dryHandle = created;
    return created;
  }

  /** Call after a write succeeded: saves the database and tells panels. No-op in dry run. */
  function committed<T>(result: T): T {
    if (options.dryRun) return result;
    saveDb(getDb(), namespace, options.log);
    dbVersion.value += 1;
    return result;
  }

  function guarded<T>(name: string, work: () => T): T {
    options.record?.(name);
    try {
      return work();
    } catch (err) {
      throw friendlySqlError(err);
    }
  }

  function queryRows(sql: string, params: unknown): DbRow[] {
    const values = checkParams(params);
    const db = getDb();
    const statement = db.prepare(sql);
    try {
      if (values.length > 0) statement.bind(values);
      const rows: DbRow[] = [];
      while (statement.step()) rows.push(statement.getAsObject() as DbRow);
      return rows;
    } finally {
      statement.free();
    }
  }

  function tableExists(name: string): boolean {
    return (
      queryRows(
        "SELECT 1 AS found FROM sqlite_master WHERE type = 'table' AND name = ? COLLATE NOCASE",
        [name],
      ).length > 0
    );
  }

  /** Adds every column in `keys` the table does not have yet. */
  function ensureColumns(table: string, keys: string[]): void {
    const known = new Set(
      queryRows(`PRAGMA table_info(${quoteName(table)})`, undefined).map((row) =>
        String(row.name).toLowerCase(),
      ),
    );
    for (const key of keys) {
      if (known.has(key.toLowerCase())) continue;
      getDb().run(buildAddColumn(table, key));
      known.add(key.toLowerCase());
    }
  }

  /** Runs a write statement and returns how many rows it changed. */
  function execCounting(statement: SqlStatement): number {
    const db = getDb();
    const before = totalChanges(db);
    db.run(statement.sql, statement.params);
    return totalChanges(db) - before;
  }

  function selectRows(spec: SelectSpec): DbRow[] {
    const statement = validated(() => buildSelect(spec));
    if (!tableExists(spec.table)) return [];
    return queryRows(statement.sql, statement.params);
  }

  function countRows(spec: SelectSpec): number {
    const statement = validated(() => buildCount(spec));
    if (!tableExists(spec.table)) return 0;
    return Number(queryRows(statement.sql, statement.params)[0]?.n ?? 0);
  }

  function makeQuery(spec: SelectSpec): DbQuery {
    return {
      where(col, op, value) {
        const condition: Condition = {
          col: validated(() => assertName(col)),
          op: validated(() => assertOp(op)),
          value,
        };
        return makeQuery({ ...spec, where: [...spec.where, condition] });
      },
      orderBy(col, dir) {
        const normalized = dir === undefined ? "asc" : typeof dir === "string" ? dir.trim().toLowerCase() : "";
        if (normalized !== "asc" && normalized !== "desc") throw dbError(BAD_ORDER_DIR);
        return makeQuery({ ...spec, orderBy: { col: validated(() => assertName(col)), dir: normalized } });
      },
      limit(n) {
        return makeQuery({ ...spec, limit: validated(() => assertLimit(n)) });
      },
      get() {
        return guarded("db.table.where", () => selectRows(spec));
      },
      first() {
        return guarded(
          "db.table.where",
          () => selectRows({ ...spec, limit: Math.min(spec.limit ?? 1, 1) })[0] ?? null,
        );
      },
      count() {
        return guarded("db.table.where", () => countRows(spec));
      },
    };
  }

  function makeTable(name: string): DbTable {
    const base: SelectSpec = { table: name, where: [] };
    const byFilter = (filter: Record<string, unknown>): SelectSpec => ({
      ...base,
      where: validated(() => filterToConditions(filter)),
    });
    return {
      add(row) {
        return guarded("db.table.add", () => {
          const insert = validated(() => buildInsert(name, checkObject("add", row)));
          getDb().run(buildCreateTable(name));
          ensureColumns(name, Object.keys(row));
          getDb().run(insert.sql, insert.params);
          return committed(Number(getDb().exec("SELECT last_insert_rowid()")[0]?.values[0]?.[0] ?? 0));
        });
      },
      all() {
        return guarded("db.table.all", () => selectRows(base));
      },
      find(filter) {
        return guarded("db.table.find", () => selectRows(byFilter(checkObject("find", filter))));
      },
      count(filter) {
        return guarded("db.table.count", () =>
          countRows(filter === undefined ? base : byFilter(checkObject("count", filter))),
        );
      },
      get(id) {
        return guarded(
          "db.table.get",
          () => selectRows({ ...base, where: [{ col: "id", op: "=", value: id }], limit: 1 })[0] ?? null,
        );
      },
      update(id, patch) {
        return guarded("db.table.update", () => {
          const statement = validated(() => buildUpdate(name, id, checkObject("update", patch)));
          if (!tableExists(name)) return committed(0);
          ensureColumns(name, Object.keys(patch));
          return committed(execCounting(statement));
        });
      },
      remove(id) {
        return guarded("db.table.remove", () => {
          if (id === null || id === undefined) throw dbError(REMOVE_NEEDS_ID);
          const statement = validated(() => buildDelete(name, id));
          return committed(tableExists(name) ? execCounting(statement) : 0);
        });
      },
      clear() {
        return guarded("db.table.clear", () => {
          const statement = validated(() => buildDelete(name));
          return committed(tableExists(name) ? execCounting(statement) : 0);
        });
      },
      where(col, op, value) {
        return makeQuery(base).where(col, op, value);
      },
    };
  }

  return {
    run(sql, params) {
      return guarded("db.run", () => {
        const values = checkParams(params);
        const db = getDb();
        const statements = statementsOf(sql);
        const before = totalChanges(db);
        if (values.length === 0 && statements.length > 1) db.exec(sql);
        else db.run(sql, values);
        const changes = totalChanges(db) - before;
        const last = statements[statements.length - 1] ?? "";
        const insertLike = /^(INSERT|REPLACE)\b/i.test(last);
        const lastId = insertLike
          ? Number(db.exec("SELECT last_insert_rowid()")[0]?.values[0]?.[0] ?? 0)
          : null;
        return committed({ changes, lastId });
      });
    },
    query(sql, params) {
      return guarded("db.query", () => {
        const rows = queryRows(sql, params);
        return queryWrites(sql) ? committed(rows) : rows;
      });
    },
    one(sql, params) {
      return guarded("db.one", () => queryRows(sql, params)[0] ?? null);
    },
    tables() {
      return guarded("db.tables", () =>
        queryRows(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
          undefined,
        ).map((row) => String(row.name)),
      );
    },
    table(name) {
      return makeTable(validated(() => assertName(name)));
    },
  };
}
