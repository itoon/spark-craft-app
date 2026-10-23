import { computed, ref } from "vue";

import { DEFAULT_WORKSPACE_KEY, useEditorStore } from "~/composables/useEditorStore";
import { getLesson, lessons } from "~/data/lessons";

/**
 * Learning mode vs Creator mode, plus per-lesson progress.
 *
 *  - Creator: no lesson column, uses the regular project workspace.
 *  - Learning: lesson picker → lesson with live step checks. Each lesson has
 *    its own workspace so a learner's own project is never overwritten.
 */

export type AppMode = "learn" | "create";

export interface LessonProgress {
  step: number;
  completed: boolean;
  manual: string[];
}

const MODE_KEY = "codecraft-app-mode";
const LESSON_KEY = "codecraft-active-lesson";
const PROGRESS_KEY = "codecraft-lesson-progress-v1";

const appMode = ref<AppMode | null>(null);
const activeLessonId = ref<string | null>(null);
const progress = ref<Record<string, LessonProgress>>({});
let initialized = false;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Storage blocked: everything still works for this visit.
  }
}

function persistProgress() {
  write(PROGRESS_KEY, JSON.stringify(progress.value));
}

export function lessonWorkspaceKey(lessonId: string) {
  return `codecraft-lesson-${lessonId}`;
}

function init() {
  if (initialized || !import.meta.client) return;
  initialized = true;
  const savedMode = window.localStorage.getItem(MODE_KEY);
  appMode.value = savedMode === "learn" || savedMode === "create" ? savedMode : null;
  const savedLesson = window.localStorage.getItem(LESSON_KEY);
  activeLessonId.value = getLesson(savedLesson) ? savedLesson : null;
  progress.value = readJson<Record<string, LessonProgress>>(PROGRESS_KEY, {});
}

export function useLearning() {
  init();
  const store = useEditorStore();

  const activeLesson = computed(() => getLesson(activeLessonId.value));

  function getProgress(lessonId: string): LessonProgress {
    return progress.value[lessonId] ?? { step: 0, completed: false, manual: [] };
  }

  function updateProgress(lessonId: string, patch: Partial<LessonProgress>) {
    progress.value = {
      ...progress.value,
      [lessonId]: { ...getProgress(lessonId), ...patch },
    };
    persistProgress();
  }

  /** Make the open workspace match the mode / lesson (after reloads). */
  function syncWorkspace() {
    if (appMode.value === "learn" && activeLesson.value) {
      store.switchWorkspace(lessonWorkspaceKey(activeLesson.value.id), {
        projectName: activeLesson.value.title,
      });
    } else if (appMode.value === "create") {
      store.switchWorkspace(DEFAULT_WORKSPACE_KEY);
    }
  }

  function setAppMode(mode: AppMode) {
    appMode.value = mode;
    write(MODE_KEY, mode);
    if (store.isRunning.value) store.setRunning(false);
    syncWorkspace();
  }

  function openLesson(lessonId: string) {
    const lesson = getLesson(lessonId);
    if (!lesson) return;
    if (store.isRunning.value) store.setRunning(false);
    activeLessonId.value = lesson.id;
    write(LESSON_KEY, lesson.id);
    store.switchWorkspace(lessonWorkspaceKey(lesson.id), { projectName: lesson.title });
    store.setMode("design");
  }

  /** Back to the lesson list (the lesson's work stays saved). */
  function closeLesson() {
    activeLessonId.value = null;
    write(LESSON_KEY, null);
  }

  function setStep(lessonId: string, step: number) {
    updateProgress(lessonId, { step });
  }

  function completeLesson(lessonId: string) {
    updateProgress(lessonId, { completed: true });
  }

  function toggleManual(lessonId: string, checkId: string) {
    const current = new Set(getProgress(lessonId).manual);
    if (current.has(checkId)) current.delete(checkId);
    else current.add(checkId);
    updateProgress(lessonId, { manual: [...current] });
  }

  function restartLesson(lessonId: string) {
    const lesson = getLesson(lessonId);
    if (!lesson) return;
    if (store.isRunning.value) store.setRunning(false);
    store.resetWorkspace(lessonWorkspaceKey(lessonId), { projectName: lesson.title });
    updateProgress(lessonId, { step: 0, completed: false, manual: [] });
  }

  const completedCount = computed(
    () => lessons.filter((lesson) => progress.value[lesson.id]?.completed).length,
  );

  return {
    lessons,
    appMode,
    activeLessonId,
    activeLesson,
    progress,
    completedCount,
    getProgress,
    setAppMode,
    syncWorkspace,
    openLesson,
    closeLesson,
    setStep,
    completeLesson,
    toggleManual,
    restartLesson,
  };
}
