export function stripJsonComments(source: string) {
  let result = ''
  let inString = false
  let quote = ''
  let escaped = false
  for (let index = 0; index < source.length; index++) {
    const character = source[index]
    const next = source[index + 1]
    if (inString) {
      result += character
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === quote) inString = false
    } else if (character === '"' || character === "'") {
      inString = true
      quote = character
      result += character
    } else if (character === '/' && next === '/') {
      while (index + 1 < source.length && source[index + 1] !== '\n') index++
    } else if (character === '/' && next === '*') {
      index += 2
      while (index + 1 < source.length && !(source[index] === '*' && source[index + 1] === '/')) index++
      index++
    } else result += character
  }
  return result
}
