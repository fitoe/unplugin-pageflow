export function windowsEditorLaunchCommand(parts: string[], file: string) {
  const escape = (value: string) => value.replace(/([&|<>,;=^])/g, '^$1')
  const quote = (value: string) => value.includes('^') ? `^"${value}^"` : value.includes(' ') ? `"${value}"` : value
  return [...parts, file].map(escape).map(quote).join(' ')
}
