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

/**
 * What the avatar shows: the user picture, else the initials.
 *
 * @param {string} pictureUrl The `user/pictureUrl` store value ('internal' for an uploaded picture)
 * @param {number} userId
 * @param {string} name
 * @returns {{kind: string, url?: string, initials?: string}}
 */
export function avatarOf (pictureUrl, userId, name) {
  if (pictureUrl && pictureUrl.length > 1) {
    return { kind: 'image', url: pictureUrl === 'internal' ? `/_userav/${userId}` : pictureUrl }
  }
  return { kind: 'initials', initials: initialsOf(name) }
}
