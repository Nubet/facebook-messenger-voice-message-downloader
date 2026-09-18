export type DiagnosticDetails = Record<string, unknown>

let diagnosticsEnabled = false

export function setDiagnosticsEnabled(enabled: boolean) {
  diagnosticsEnabled = enabled
}

export function diagnosticInfo(event: string, details: DiagnosticDetails = {}) {
  if (!diagnosticsEnabled) return

  console.info('[FVM]', event, details)
}

export function diagnosticError(
  event: string,
  error: unknown,
  details: DiagnosticDetails = {}
) {
  if (!diagnosticsEnabled) return

  console.error('[FVM]', event, {
    ...details,
    error: describeError(error),
  })
}

export function describeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }

  return {message: String(error)}
}
