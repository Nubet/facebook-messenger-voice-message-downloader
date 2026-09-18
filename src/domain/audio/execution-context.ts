export type ExecutionContext = {
  tabId: number | null
  frameId: number
  documentId?: string
}

export function isExecutionContext(value: unknown): value is ExecutionContext {
  if (typeof value !== 'object' || value === null) return false

  const context = value as {
    tabId?: unknown
    frameId?: unknown
    documentId?: unknown
  }

  return (
    (typeof context.tabId === 'number' || context.tabId === null) &&
    typeof context.frameId === 'number' &&
    (context.documentId === undefined || typeof context.documentId === 'string')
  )
}
