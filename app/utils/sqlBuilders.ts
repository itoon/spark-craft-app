/**
 * Pure SQL-string builders behind the learner-facing `db.table(...)` helpers
 * and the Database panel.
 *
 * Nothing here touches the SQLite engine: every builder returns SQL text plus
 * bound parameters. Table and column names are validated against a strict
 * pattern and always double-quoted; values never reach the SQL text, they are
 * passed as `?` parameters after `toSqlValue` normalisation.
 */

export type SqlValue = string | number | null | Uint8Array;
export type SqlOp = "=" | "!=" | ">" | ">=" | "<" | "<=" | "LIKE";

export interface SqlStatement {
  sql: string;
  params: SqlValue[];
}

export interface Condition {
  col: string;
  op: SqlOp;
  value: unknown;
}

export interface SelectSpec {
  table: string;
  where: Condition[];
  orderBy?: { col: string; dir: "asc" | "desc" };
  limit?: number;
}

const NAME_PATTERN = /^[A-Za-z_฀-๿][A-Za-z0-9_฀-๿]*$/;
const OPS: readonly SqlOp[] = ["=", "!=", ">", ">=", "<", "<=", "LIKE"];

export function assertName(name: unknown): string {
  if (typeof name !== "string" || !NAME_PATTERN.test(name)) {
    throw new Error(`ชื่อตาราง/คอลัมน์ไม่ถูกต้อง: ${String(name)}`);
  }
  return name;
}

export function quoteName(name: string): string {
  return `"${assertName(name)}"`;
}

export function assertOp(op: unknown): SqlOp {
  const normalized = typeof op === "string" ? op.toUpperCase() : op;
  if (!OPS.includes(normalized as SqlOp)) {
    throw new Error(
      `ตัวเปรียบเทียบไม่ถูกต้อง: ${String(op)} (ใช้ได้: = != > >= < <= LIKE)`,
    );
  }
  return normalized as SqlOp;
}

export function assertLimit(n: unknown): number {
  if (typeof n !== "number" || !Number.isInteger(n) || n < 0) {
    throw new Error("limit() ต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป");
  }
  return n;
}

export function toSqlValue(value: unknown): SqlValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "number" || typeof value === "string") return value;
  if (value instanceof Uint8Array) return value;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === "object") {
    const proto = Object.getPrototypeOf(value);
    if (proto === Object.prototype || proto === null) {
      return JSON.stringify(value);
    }
  }
  return String(value);
}

export function filterToConditions(filter: Record<string, unknown>): Condition[] {
  return Object.entries(filter).map(([col, value]) => ({
    col,
    op: "=" as const,
    value,
  }));
}

export function buildCreateTable(table: string): string {
  return `CREATE TABLE IF NOT EXISTS ${quoteName(table)} ("id" INTEGER PRIMARY KEY AUTOINCREMENT)`;
}

export function buildAddColumn(table: string, col: string): string {
  return `ALTER TABLE ${quoteName(table)} ADD COLUMN ${quoteName(col)}`;
}

export function buildInsert(
  table: string,
  row: Record<string, unknown>,
): SqlStatement {
  const target = quoteName(table);
  const cols = Object.keys(row);
  if (cols.length === 0) {
    return { sql: `INSERT INTO ${target} DEFAULT VALUES`, params: [] };
  }
  const names = cols.map(quoteName).join(", ");
  const marks = cols.map(() => "?").join(", ");
  return {
    sql: `INSERT INTO ${target} (${names}) VALUES (${marks})`,
    params: cols.map((c) => toSqlValue(row[c])),
  };
}

function buildWhere(where: Condition[]): SqlStatement {
  if (where.length === 0) return { sql: "", params: [] };
  const params: SqlValue[] = [];
  const parts = where.map((cond) => {
    const col = quoteName(cond.col);
    const op = assertOp(cond.op);
    const value = toSqlValue(cond.value);
    if (value === null) {
      if (op === "=" || op === "LIKE") return `${col} IS NULL`;
      if (op === "!=") return `${col} IS NOT NULL`;
    }
    params.push(value);
    return `${col} ${op} ?`;
  });
  return { sql: ` WHERE ${parts.join(" AND ")}`, params };
}

export function buildSelect(spec: SelectSpec): SqlStatement {
  const where = buildWhere(spec.where);
  const order = spec.orderBy
    ? `${quoteName(spec.orderBy.col)} ${spec.orderBy.dir === "desc" ? "DESC" : "ASC"}`
    : '"id"';
  const limit = spec.limit === undefined ? "" : ` LIMIT ${assertLimit(spec.limit)}`;
  return {
    sql: `SELECT * FROM ${quoteName(spec.table)}${where.sql} ORDER BY ${order}${limit}`,
    params: where.params,
  };
}

export function buildCount(spec: SelectSpec): SqlStatement {
  const where = buildWhere(spec.where);
  return {
    sql: `SELECT COUNT(*) AS "n" FROM ${quoteName(spec.table)}${where.sql}`,
    params: where.params,
  };
}

export function buildUpdate(
  table: string,
  id: unknown,
  patch: Record<string, unknown>,
): SqlStatement {
  const target = quoteName(table);
  const cols = Object.keys(patch);
  if (cols.length === 0) {
    throw new Error("update() ต้องมีอย่างน้อย 1 คอลัมน์");
  }
  const sets = cols.map((c) => `${quoteName(c)} = ?`).join(", ");
  return {
    sql: `UPDATE ${target} SET ${sets} WHERE "id" = ?`,
    params: [...cols.map((c) => toSqlValue(patch[c])), toSqlValue(id)],
  };
}

export function buildDelete(table: string, id?: unknown): SqlStatement {
  const target = quoteName(table);
  if (id === undefined) return { sql: `DELETE FROM ${target}`, params: [] };
  return { sql: `DELETE FROM ${target} WHERE "id" = ?`, params: [toSqlValue(id)] };
}
