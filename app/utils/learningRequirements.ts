import type { AppElement } from "../composables/useEditorStore";
import { executeCode } from "../composables/useRuntime";

export interface LearningRequirementResult {
  id: string;
  met: boolean;
  message: string;
}

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
      event: "onClick";
      minCount?: number;
      message: string;
    }
  | {
      id: string;
      type: "code-pattern";
      pageId?: string;
      pattern: string;
      mode?: "includes" | "regex";
      flags?: string;
      message: string;
    };

export interface LearningRequirementContext {
  elements: AppElement[];
  currentPageId?: string;
  jsCode?: string;
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

function getRuntimeSnapshot(context: LearningRequirementContext, pageId?: string) {
  const targetPageId = pageId ?? context.currentPageId;
  const scopedElements = context.elements.filter(
    (element) => !targetPageId || element.pageId === targetPageId,
  );
  const code = context.jsCode ?? "";

  try {
    return executeCode(code, scopedElements);
  } catch {
    return null;
  }
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
        if (requirement.event === "onClick") return Boolean(instance.__onClick);
        return false;
      }).length ?? 0;

    return {
      id: requirement.id,
      met: count >= minCount,
      message: requirement.message,
    };
  }

  if (requirement.type === "code-pattern") {
    const code = context.jsCode ?? "";
    const met =
      requirement.mode === "regex"
        ? new RegExp(requirement.pattern, requirement.flags).test(code)
        : code.includes(requirement.pattern);

    return {
      id: requirement.id,
      met,
      message: requirement.message,
    };
  }

  return {
    id: requirement.id,
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
