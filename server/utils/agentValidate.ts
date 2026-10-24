import { createError } from "h3";

import type { PersistedEditorState } from "../../app/composables/useEditorStore";

export function readTabId(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw createError({ statusCode: 400, statusMessage: "ต้องระบุ tabId" });
  }
  return value;
}

export function readEditorState(value: unknown): PersistedEditorState {
  const state = value as Partial<PersistedEditorState> | null;
  if (!state || typeof state !== "object" || !Array.isArray(state.pages) || !Array.isArray(state.elements)) {
    throw createError({ statusCode: 400, statusMessage: "state ต้องมี pages และ elements" });
  }
  return state as PersistedEditorState;
}
