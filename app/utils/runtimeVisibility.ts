export function getVisibleRuntimeChildIds(
  childIds: string[],
  runtimeElementIds: Iterable<string> | undefined,
  isRunMode: boolean | undefined,
): string[] {
  if (!isRunMode) return childIds;
  if (!runtimeElementIds) return [];

  const allowedIds = new Set(runtimeElementIds);
  return childIds.filter((childId) => allowedIds.has(childId));
}
