import type { AppElement, Page } from "../composables/useEditorStore";
import { executeCode } from "../composables/useRuntime";
import type { ElementInstance } from "../composables/useRuntime";

export interface LearningRequirementResult {
  id: string;
  met: boolean;
  message: string;
  /** Extra hint when the check failed (e.g. the error the code threw). */
  detail?: string;
  /** Manual checks are ticked by the learner, not detected. */
  manual?: boolean;
}

/** One action in a behaviour test. */
export type ScenarioAction =
  | {
      /** Fill input-like elements (Input, LabelledInput) in screen order. */
      type: "input";
      values: (string | number)[];
    }
  | {
      /**
       * Click a button that has an onClick handler. `match` looks at the
       * button text (any of the strings, case-insensitive); `index` is the
       * fallback (0 = first clickable button on screen).
       */
      type: "click";
      match?: string | string[];
      index?: number;
      times?: number;
    }
  | {
      /** Fire every running timer.every / timer.after once per tick. */
      type: "tick";
      times?: number;
    }
  | { /** Pretend the phone was shaken (motion.onShake). */ type: "shake"; times?: number }
  | { /** Pretend the phone was tilted (motion.onTilt). */ type: "tilt"; x?: number; y?: number; z?: number }
  | { /** Pretend the Bluetooth board sent a message (ble.onMessage). */ type: "ble-message"; text: string };

export type ScenarioExpectation =
  | {
      /** Some element (optionally of a type) shows text matching `pattern`. */
      kind: "text";
      elementType?: string;
      prop?: string;
      pattern: string;
      flags?: string;
    }
  | {
      /** Some element (optionally of a type) changed during the actions. */
      kind: "changed";
      elementType?: string;
    }
  | {
      /** The code called one of these services (e.g. "notify.toast"). */
      kind: "called";
      service: string | string[];
    }
  | {
      /** The code called page.goTo(...) (optionally to a page name/id). */
      kind: "navigated";
      page?: string;
    };

export type LearningRequirement =
  | {
      id: string;
      type: "element-count";
      elementType: string;
      pageId?: string;
      minCount?: number;
      maxCount?: number;
      message: string;
    }
  | {
      id: string;
      type: "element-props";
      elementType: string;
      pageId?: string;
      minCount?: number;
      props: Record<string, unknown>;
      message: string;
    }
  | {
      /** Like element-props, but each prop is tested with a regex. */
      id: string;
      type: "element-prop-matches";
      elementType: string;
      pageId?: string;
      minCount?: number;
      props: Record<string, string>;
      flags?: string;
      message: string;
    }
  | {
      id: string;
      type: "runtime-added";
      elementType: string;
      pageId?: string;
      minCount?: number;
      message: string;
    }
  | {
      id: string;
      type: "runtime-handler";
      elementType: string;
      pageId?: string;
      event: "onClick" | "onChange" | "onReady" | "onError" | "onLongPress" | "onEnter" | "onItemClick";
      minCount?: number;
      message: string;
    }
  | {
      id: string;
      type: "code-pattern";
      /** "*" = search the code of every page. */
      pageId?: string;
      pattern: string;
      mode?: "includes" | "regex";
      flags?: string;
      message: string;
    }
  | {
      id: string;
      type: "page-count";
      minCount: number;
      message: string;
    }
  | {
      /** Behaviour test: run the code, act like a user, check the result. */
      id: string;
      type: "scenario";
      pageId?: string;
      actions?: ScenarioAction[];
      storage?: Record<string, unknown>;
      expect: ScenarioExpectation;
      message: string;
    }
  | {
      /** Learner ticks it themselves (e.g. "I tried it on my phone"). */
      id: string;
      type: "manual";
      message: string;
    };

export interface LearningRequirementContext {
  elements: AppElement[];
  currentPageId?: string;
  /** Code of the current page (legacy). */
  jsCode?: string;
  /** Code of every page — preferred when present. */
  jsCodeByPage?: Record<string, string>;
  pages?: Page[];
  /** Ids of manual checks the learner has ticked. */
  manualChecks?: ReadonlySet<string> | string[];
}

const INPUT_TYPES = new Set(["Input", "LabelledInput"]);

function cloneElements(elements: AppElement[]): AppElement[] {
  return JSON.parse(JSON.stringify(elements)) as AppElement[];
}

function matchesProps(
  element: AppElement,
  requiredProps: Record<string, unknown>,
): boolean {
  return Object.entries(requiredProps).every(([key, expected]) => {
    const actual = element.props[key];
    if (expected === "__exists__") {
      return actual !== undefined && actual !== null && String(actual).trim() !== "";
    }
    return actual === expected;
  });
}

function safeRegExp(pattern: string, flags?: string): RegExp | null {
  try {
    return new RegExp(pattern, flags);
  } catch {
    return null;
  }
}

function codeForPage(context: LearningRequirementContext, pageId?: string): string {
  if (pageId === "*") {
    const all = context.jsCodeByPage ? Object.values(context.jsCodeByPage) : [];
    return [...all, context.jsCode ?? ""].join("\n");
  }
  const target = pageId ?? context.currentPageId;
  if (context.jsCodeByPage && target && target in context.jsCodeByPage) {
    return context.jsCodeByPage[target] ?? "";
  }
  if (!pageId || pageId === context.currentPageId) return context.jsCode ?? "";
  return "";
}

function scopedElements(context: LearningRequirementContext, pageId?: string) {
  const targetPageId = pageId ?? context.currentPageId;
  return context.elements.filter(
    (element) => !targetPageId || element.pageId === targetPageId,
  );
}

/** Elements in on-screen order (depth-first from the root containers). */
export function elementsInTreeOrder(elements: AppElement[]): AppElement[] {
  const byId = new Map(elements.map((element) => [element.id, element]));
  const visited = new Set<string>();
  const ordered: AppElement[] = [];

  function visit(element: AppElement) {
    if (visited.has(element.id)) return;
    visited.add(element.id);
    ordered.push(element);
    for (const childId of element.children ?? []) {
      const child = byId.get(childId);
      if (child) visit(child);
    }
  }

  // Toolbars sit above the root container.
  for (const element of elements) {
    if (element.parentId === null && element.type === "Toolbar") visit(element);
  }
  for (const element of elements) {
    if (element.parentId === null) visit(element);
  }
  for (const element of elements) visit(element); // orphans, just in case
  return ordered;
}

/** The text a learner would read on an element. */
export function displayText(element: AppElement): string {
  const props = element.props ?? {};
  for (const key of ["content", "label", "text", "title", "value"]) {
    const value = props[key];
    if (value !== undefined && value !== null && typeof value !== "object") {
      return String(value);
    }
  }
  return "";
}

function getRuntimeSnapshot(context: LearningRequirementContext, pageId?: string) {
  // Clone so top-level assignments in learner code never leak into the design.
  const elements = cloneElements(scopedElements(context, pageId));
  try {
    return executeCode(codeForPage(context, pageId), elements, undefined, undefined, undefined, undefined, {
      services: { dryRun: true },
    });
  } catch {
    return null;
  }
}

function asList(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function findClickTarget(
  instances: ElementInstance[],
  action: Extract<ScenarioAction, { type: "click" }>,
): ElementInstance | null {
  const clickable = instances.filter((instance) => typeof instance.__onClick === "function");
  const needles = asList(action.match).map((needle) => needle.toLowerCase());
  if (needles.length) {
    const byText = clickable.find((instance) => {
      const text = displayText(instance.__el).toLowerCase();
      return needles.some((needle) => text.includes(needle));
    });
    if (byText) return byText;
  }
  if (action.index !== undefined) return clickable[action.index] ?? null;
  return needles.length ? null : clickable[0] ?? null;
}

export interface ScenarioOutcome {
  met: boolean;
  detail?: string;
}

/** Runs a behaviour test against a sandboxed copy of the page. */
export function runScenario(
  requirement: Extract<LearningRequirement, { type: "scenario" }>,
  context: LearningRequirementContext,
): ScenarioOutcome {
  const pageId = requirement.pageId ?? context.currentPageId;
  const elements = elementsInTreeOrder(cloneElements(scopedElements(context, pageId)));
  const code = codeForPage(context, pageId);
  const navigations: string[] = [];
  const errors: string[] = [];

  if (!code.trim()) return { met: false, detail: "ยังไม่มีโค้ดในหน้านี้" };

  let result: ReturnType<typeof executeCode>;
  try {
    result = executeCode(
      code,
      elements,
      undefined,
      (pageRef) => navigations.push(pageRef),
      (entry) => {
        if (entry.type === "error") errors.push(entry.message);
      },
      undefined,
      { services: { dryRun: true, initialStorage: requirement.storage } },
    );
  } catch (error) {
    return { met: false, detail: error instanceof Error ? error.message : String(error) };
  }

  const startEventIndex = result.events.length;

  for (const action of requirement.actions ?? []) {
    if (action.type === "input") {
      const inputs = elements.filter((element) => INPUT_TYPES.has(element.type));
      action.values.forEach((value, index) => {
        const target = inputs[index];
        if (target) target.props.value = String(value);
      });
    } else if (action.type === "click") {
      const target = findClickTarget(result.instances, action);
      if (!target) {
        const wanted = asList(action.match)[0];
        return {
          met: false,
          detail: wanted
            ? `หาปุ่ม “${wanted}” ที่มี onClick ไม่เจอ`
            : "ยังไม่มีปุ่มที่ใส่ onClick",
        };
      }
      const times = Math.max(1, action.times ?? 1);
      for (let i = 0; i < times; i++) {
        try {
          target.__onClick?.();
        } catch (error) {
          errors.push(error instanceof Error ? error.message : String(error));
        }
      }
    } else if (action.type === "tick") {
      result.services.fireTimers(Math.max(1, action.times ?? 1));
    } else if (action.type === "shake") {
      for (let i = 0; i < Math.max(1, action.times ?? 1); i++) result.device.fireShake();
    } else if (action.type === "tilt") {
      result.device.fireTilt({ x: action.x ?? 0, y: action.y ?? 0, z: action.z ?? 9.81 });
    } else if (action.type === "ble-message") {
      result.device.fireBleMessage(action.text);
    }
  }

  const expectation = requirement.expect;
  const errorDetail = errors[0] ? `โค้ดมีข้อผิดพลาด: ${errors[0]}` : undefined;

  if (expectation.kind === "text") {
    const regex = safeRegExp(expectation.pattern, expectation.flags);
    if (!regex) return { met: false };
    const candidates = elements.filter(
      (element) => !expectation.elementType || element.type === expectation.elementType,
    );
    const met = candidates.some((element) => {
      const value = expectation.prop ? element.props[expectation.prop] : displayText(element);
      return regex.test(String(value ?? ""));
    });
    if (met) return { met };
    const shown = candidates.map(displayText).filter(Boolean).slice(0, 3);
    return {
      met,
      detail:
        errorDetail ??
        (shown.length ? `ตอนนี้หน้าจอแสดง: ${shown.map((text) => `“${text}”`).join(", ")}` : undefined),
    };
  }

  if (expectation.kind === "changed") {
    const met = result.events
      .slice(startEventIndex)
      .some(
        (event) =>
          event.type === "update" &&
          (!expectation.elementType || event.elementType === expectation.elementType),
      );
    return { met, detail: met ? undefined : errorDetail };
  }

  if (expectation.kind === "called") {
    const wanted = asList(expectation.service);
    const met = wanted.some((service) => result.services.calls.includes(service));
    return { met, detail: met ? undefined : errorDetail };
  }

  if (expectation.kind === "navigated") {
    const target = expectation.page?.toLowerCase();
    const pages = context.pages ?? [];
    const met = navigations.some((ref) => {
      if (!target) return true;
      const normalized = ref.trim().toLowerCase();
      if (normalized === target) return true;
      const page = pages.find(
        (candidate) =>
          candidate.id.toLowerCase() === normalized || candidate.name.toLowerCase() === normalized,
      );
      return page ? page.id.toLowerCase() === target || page.name.toLowerCase() === target : false;
    });
    return { met, detail: met ? undefined : errorDetail };
  }

  return { met: false };
}

function hasManual(context: LearningRequirementContext, id: string) {
  const checks = context.manualChecks;
  if (!checks) return false;
  return Array.isArray(checks) ? checks.includes(id) : (checks as ReadonlySet<string>).has(id);
}

export function evaluateLearningRequirement(
  requirement: LearningRequirement,
  context: LearningRequirementContext,
): LearningRequirementResult {
  if (requirement.type === "element-count") {
    const pageId = requirement.pageId ?? context.currentPageId;
    const minCount = requirement.minCount ?? 1;
    const maxCount = requirement.maxCount ?? Number.POSITIVE_INFINITY;
    const count = context.elements.filter(
      (element) =>
        element.type === requirement.elementType &&
        (!pageId || element.pageId === pageId),
    ).length;

    return {
      id: requirement.id,
      met: count >= minCount && count <= maxCount,
      message: requirement.message,
    };
  }

  if (requirement.type === "element-props") {
    const pageId = requirement.pageId ?? context.currentPageId;
    const minCount = requirement.minCount ?? 1;
    const count = context.elements.filter(
      (element) =>
        element.type === requirement.elementType &&
        (!pageId || element.pageId === pageId) &&
        matchesProps(element, requirement.props),
    ).length;

    return {
      id: requirement.id,
      met: count >= minCount,
      message: requirement.message,
    };
  }

  if (requirement.type === "element-prop-matches") {
    const pageId = requirement.pageId ?? context.currentPageId;
    const minCount = requirement.minCount ?? 1;
    const count = context.elements.filter(
      (element) =>
        element.type === requirement.elementType &&
        (!pageId || element.pageId === pageId) &&
        Object.entries(requirement.props).every(([key, pattern]) => {
          const regex = safeRegExp(pattern, requirement.flags);
          return regex ? regex.test(String(element.props[key] ?? "")) : false;
        }),
    ).length;

    return { id: requirement.id, met: count >= minCount, message: requirement.message };
  }

  if (requirement.type === "runtime-added") {
    const runtime = getRuntimeSnapshot(context, requirement.pageId);
    const minCount = requirement.minCount ?? 1;
    const count =
      runtime?.pageElements.filter(
        (element) => element.type === requirement.elementType,
      ).length ?? 0;

    return {
      id: requirement.id,
      met: count >= minCount,
      message: requirement.message,
    };
  }

  if (requirement.type === "runtime-handler") {
    const runtime = getRuntimeSnapshot(context, requirement.pageId);
    const minCount = requirement.minCount ?? 1;
    const count =
      runtime?.instances.filter((instance) => {
        if (instance.__el.type !== requirement.elementType) return false;
        // every handler is stored as instance.__<event>, e.g. __onItemClick
        return Boolean(instance[`__${requirement.event}` as keyof typeof instance]);
      }).length ?? 0;

    return {
      id: requirement.id,
      met: count >= minCount,
      message: requirement.message,
    };
  }

  if (requirement.type === "code-pattern") {
    const code = codeForPage(context, requirement.pageId);
    let met = false;
    if (requirement.mode === "regex") {
      met = safeRegExp(requirement.pattern, requirement.flags)?.test(code) ?? false;
    } else {
      met = code.includes(requirement.pattern);
    }

    return {
      id: requirement.id,
      met,
      message: requirement.message,
    };
  }

  if (requirement.type === "page-count") {
    const count = context.pages?.length ?? 1;
    return { id: requirement.id, met: count >= requirement.minCount, message: requirement.message };
  }

  if (requirement.type === "scenario") {
    const outcome = runScenario(requirement, context);
    return {
      id: requirement.id,
      met: outcome.met,
      message: requirement.message,
      detail: outcome.met ? undefined : outcome.detail,
    };
  }

  if (requirement.type === "manual") {
    return {
      id: requirement.id,
      met: hasManual(context, requirement.id),
      message: requirement.message,
      manual: true,
    };
  }

  return {
    id: (requirement as { id: string }).id,
    met: true,
    message: "",
  };
}

export function evaluateLearningRequirements(
  requirements: LearningRequirement[] | undefined,
  context: LearningRequirementContext,
): LearningRequirementResult[] {
  return (requirements ?? []).map((requirement) =>
    evaluateLearningRequirement(requirement, context),
  );
}
