export interface ListContentEntry {
  key: string
  value: string
}

export type ListContentValue = string | ListContentEntry

function isListContentEntry(value: unknown): value is ListContentEntry {
  return !!value && typeof value === 'object' && ('key' in value || 'value' in value)
}

export function normalizeListContent(value: unknown): ListContentValue[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((item) => {
    if (typeof item === 'string') return [item]
    if (typeof item === 'number' || typeof item === 'boolean') return [String(item)]
    if (isListContentEntry(item)) {
      return [{
        key: String(item.key ?? ''),
        value: String(item.value ?? ''),
      }]
    }
    return []
  })
}

export function resolveListContent(props: Record<string, unknown>): ListContentValue[] {
  if (Array.isArray(props.content)) return normalizeListContent(props.content)
  if (Array.isArray(props.items)) return normalizeListContent(props.items)
  return []
}

export function getListItemLabel(item: ListContentValue): string {
  if (typeof item === 'string') return item
  return item.key || item.value || ''
}

export function getListItemValue(item: ListContentValue): string {
  if (typeof item === 'string') return item
  return item.value || item.key || ''
}

export function stringifyListContent(value: unknown): string {
  const normalized = normalizeListContent(value)
  return JSON.stringify(normalized, null, 2)
}

export function parseListContent(value: string): ListContentValue[] | null {
  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return null
    return normalizeListContent(parsed)
  } catch {
    return null
  }
}
