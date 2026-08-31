/* global siteConfig */

/**
 * Client-side mirror of server/helpers/page.js `parsePath()`.
 *
 * KEEP IN SYNC with the server helper. Rendered internal links carry only a path, and
 * its shape depends on whether locale namespacing is enabled server-side
 * (`/en/algo/dp` vs `/algo/dp`), so we have to apply the same locale-segment rule the
 * server does when it wrote the href.
 */

const localeSegmentRegex = /^[A-Z]{2}(-[A-Z]{2})?$/i

/**
 * @typedef {Object} ParsedPagePath
 * @property {string} locale Locale code, falling back to the site locale
 * @property {string} path Page path with no leading slash and no locale segment
 */

/**
 * Parse a page href into its locale and path parts.
 *
 * @param {string} rawPath Href such as `/en/algo/dp#section` or `/algo/dp?x=1`
 * @returns {ParsedPagePath|null} null when the href cannot be parsed as a page path
 */
export function parsePagePath (rawPath) {
  if (typeof rawPath !== 'string' || rawPath.length < 1) { return null }

  let pathname = rawPath
  try {
    // -> Strip hash and query the same way the server's `new URL()` parse does
    pathname = new URL(rawPath, window.location.origin).pathname
  } catch (err) {
    return null
  }

  try {
    pathname = decodeURIComponent(pathname)
  } catch (err) {
    // -> Malformed percent-encoding: fall through with the raw pathname
  }

  const parts = pathname.split('/').filter(p => {
    const trimmed = p.trim()
    return trimmed.length > 0 && trimmed !== '.' && trimmed !== '..'
  })

  if (parts.length < 1) {
    return { locale: siteConfig.lang, path: 'home' }
  }

  // -> Single-letter segments are Wiki.js system prefixes (/e/, /h/, /s/ ...)
  if (parts[0].length === 1) {
    parts.shift()
  }

  let locale = siteConfig.lang
  if (parts.length > 0 && localeSegmentRegex.test(parts[0])) {
    locale = parts.shift()
  }

  return {
    locale,
    path: parts.length > 0 ? parts.join('/') : 'home'
  }
}

/**
 * Build the alias key used to map a page path back to its numeric id.
 *
 * @param {string} locale Locale code
 * @param {string} path Page path
 * @returns {string} Key such as `en/algo/dp`
 */
export function makeAliasKey (locale, path) {
  return `${String(locale || '').toLowerCase()}/${String(path || '').replace(/^\/+/, '')}`
}
