/**
 * Lazy loader for the SQLite engine (sql.js, SQLite compiled to WebAssembly)
 * behind the learner-facing `db` runtime service.
 *
 * The wasm binary is ~1 MB, so it is never bundled into the main chunk or
 * fetched on page load. It is only downloaded the first time a project's code
 * actually mentions `db.` — `ensureSqlEngineFor` checks that before a run, so
 * the synchronous `db.*` API can assume the engine is already available.
 *
 * Browser: the wasm file URL comes from a Vite `?url` import, which is only
 * evaluated inside the browser branch so Node (unit tests) never touches it.
 * Node: sql.js locates its own wasm file.
 */
import { shallowRef, type ShallowRef } from "vue";

export type SqlEngine = import("sql.js").SqlJsStatic;

let enginePromise: Promise<SqlEngine> | null = null;
let loadedEngine: SqlEngine | null = null;

/** Flips to true once the engine has loaded; lets the UI react to readiness. */
export const sqlEngineReady: ShallowRef<boolean> = shallowRef(false);

/** Loads sql.js once. A failed load clears the cache so the next call retries. */
export function loadSqlEngine(): Promise<SqlEngine> {
  if (enginePromise) return enginePromise;
  const promise = (async () => {
    const { default: initSqlJs } = await import("sql.js");
    let engine: SqlEngine;
    if (typeof window !== "undefined") {
      const { default: wasmUrl } = await import("sql.js/dist/sql-wasm.wasm?url");
      engine = await initSqlJs({ locateFile: () => wasmUrl });
    } else {
      engine = await initSqlJs();
    }
    loadedEngine = engine;
    sqlEngineReady.value = true;
    return engine;
  })();
  enginePromise = promise;
  promise.catch(() => {
    if (enginePromise === promise) enginePromise = null;
  });
  return promise;
}

/** The engine if it has already loaded, otherwise null. */
export function getLoadedSqlEngine(): SqlEngine | null {
  return loadedEngine;
}

/** True when the code calls a `db.` method (not `mydb.` / `dbx.` / comments about databases). */
export function codeUsesDb(code: string): boolean {
  return /\bdb\s*\./.test(code);
}

export function projectUsesDb(codeByPage: Record<string, string>): boolean {
  return Object.values(codeByPage).some(codeUsesDb);
}

/**
 * Makes sure the engine is loaded when the project needs it.
 * Resolves true when not needed or loaded, false when loading failed. Never rejects.
 */
export async function ensureSqlEngineFor(codeByPage: Record<string, string>): Promise<boolean> {
  if (!projectUsesDb(codeByPage)) return true;
  try {
    await loadSqlEngine();
    return true;
  } catch {
    return false;
  }
}

/**
 * Wraps a host's "run the learner's code" step so it waits for the engine first.
 * Each host creates one runner; if a newer run starts while an older one is still
 * waiting for the engine, the older run is dropped (only the latest `run` fires).
 */
export function createDbAwareRunner(): (
  codeByPage: Record<string, string>,
  run: (engineOk: boolean) => void,
) => Promise<void> {
  let sequence = 0;
  return async (codeByPage, run) => {
    const mine = ++sequence;
    const engineOk = await ensureSqlEngineFor(codeByPage);
    if (mine !== sequence) return;
    run(engineOk);
  };
}
