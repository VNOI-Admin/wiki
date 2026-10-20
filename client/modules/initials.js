/**
 * Avatar letters: the first letters of the first and the last word.
 * "Nguyễn Văn An" -> "NA". Array.from keeps a letter with its accent.
 *
 * @param {string} name
 * @returns {string} One or two letters, or "?" for an empty name
 */
export function initialsOf (name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (words.length < 1) { return '?' }
  const first = w => Array.from(w)[0].toUpperCase()
  return words.length > 1 ? first(words[0]) + first(words[words.length - 1]) : first(words[0])
}
