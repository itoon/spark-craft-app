/**
 * Learner-facing `db` runtime service: a synchronous SQLite API on top of
 * sql.js. This file holds the raw SQL surface (`run` / `query` / `one` /
 * `tables`), friendly Thai error messages and the dry-run mode used by the
 * learning checker.
 *
 * The engine is obtained lazily on the first call, so a handler that fires
 * after the wasm finished loading still works. Dry run always gets a fresh
 * in-memory database and never touches persistence.
 */
import { toSqlValue, type SqlValue } from "./sqlBuilders";
import type { SqlEngine } from "./sqlEngine";

export interface DbRunResult {
  changes: number;
  lastId: number | null;
}

export type DbRow = Record<string, SqlValue>;

/** Placeholder until the table helper lands; `table()` throws for now. */
export interface DbTable {
  readonly name: string;
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

/** Drops leading whitespace and `--` line comments. */
function stripLeading(sql: string): string {
  let rest = sql;
  for (;;) {
    rest = rest.trimStart();
    if (!rest.startsWith("--")) return rest;
    const newline = rest.indexOf("\n");
    if (newline === -1) return "";
    rest = rest.slice(newline + 1);
  }
}

/** The non-empty `;`-separated statements (comment-only segments are ignored). */
function statementsOf(sql: string): string[] {
  return sql
    .split(";")
    .map(stripLeading)
    .filter((statement) => statement.trim() !== "");
}

function checkParams(params: unknown): SqlValue[] {
  if (params === undefined) return [];
  if (!Array.isArray(params)) throw dbError(BAD_PARAMS);
  return params.map(toSqlValue);
}

export function createRuntimeDb(options: RuntimeDbOptions): RuntimeDb {
  let handle: import("sql.js").Database | null = null;

  function getDb(): import("sql.js").Database {
    if (handle) return handle;
    const engine = options.getEngine();
    if (!engine) throw dbError(ENGINE_MISSING);
    const created = new engine.Database();
    if (options.dryRun && options.initialDb) created.exec(options.initialDb);
    handle = created;
    return created;
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

  return {
    run(sql, params) {
      return guarded("db.run", () => {
        const values = checkParams(params);
        const db = getDb();
        const statements = statementsOf(sql);
        if (values.length === 0 && statements.length > 1) db.exec(sql);
        else db.run(sql, values);
        const changes = db.getRowsModified();
        const last = statements[statements.length - 1] ?? "";
        const insertLike = /^(INSERT|REPLACE)\b/i.test(last);
        const lastId = insertLike
          ? Number(db.exec("SELECT last_insert_rowid()")[0]?.values[0]?.[0] ?? 0)
          : null;
        return { changes, lastId };
      });
    },
    query(sql, params) {
      return guarded("db.query", () => queryRows(sql, params));
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
    table() {
      throw new Error("db.table() is not implemented yet");
    },
  };
}
