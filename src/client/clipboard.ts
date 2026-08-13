export async function writeClipboardText(text: string, documentRef: Document = document, navigatorRef: Navigator = navigator) {
  if (navigatorRef.clipboard?.writeText) {
    try {
      await navigatorRef.clipboard.writeText(text)
      return true
    } catch {}
  }
  const input = documentRef.createElement('textarea')
  input.value = text
  input.setAttribute('readonly', '')
  input.style.position = 'fixed'
  input.style.left = '-10000px'
  input.style.top = '0'
  documentRef.body.append(input)
  input.select()
  input.setSelectionRange(0, text.length)
  try {
    return documentRef.execCommand('copy')
  } catch {
    return false
  } finally {
    input.remove()
  }
}
