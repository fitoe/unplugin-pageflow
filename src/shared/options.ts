import type {
  PageFlowApiDiagnosticOptions,
  PageFlowDiagnosticOptions,
  ResolvedPageFlowApiDiagnosticOptions,
  ResolvedPageFlowDiagnosticOptions,
} from './types.ts'

export function resolvePageFlowDiagnosticOptions(
  options: PageFlowDiagnosticOptions = {},
): ResolvedPageFlowDiagnosticOptions {
  const positiveNumber = (value: number | undefined, fallback: number) =>
    Number.isFinite(value) && value! > 0 ? value! : fallback
  return {
    minimumFontSize: positiveNumber(options.minimumFontSize, 12),
    minimumTapSize: positiveNumber(options.minimumTapSize, 44),
    ignoreSelectors: [...new Set((options.ignoreSelectors ?? []).map(selector => selector.trim()).filter(Boolean))],
    rules: options.rules ?? {},
  }
}

export function resolvePageFlowApiDiagnosticOptions(
  options: PageFlowApiDiagnosticOptions = {},
): ResolvedPageFlowApiDiagnosticOptions {
  const nonNegativeNumber = (value: number | undefined, fallback: number) =>
    Number.isFinite(value) && value! >= 0 ? value! : fallback
  return {
    slowRequestMs: nonNegativeNumber(options.slowRequestMs, 1_000),
    largeResponseBytes: nonNegativeNumber(options.largeResponseBytes, 500_000),
    duplicateWindowMs: nonNegativeNumber(options.duplicateWindowMs, 1_000),
  }
}
