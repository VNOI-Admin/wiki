/* global siteConfig */

const SYSTEM_DARK = '(prefers-color-scheme: dark)'

/**
 * @returns {boolean} The theme with no choice saved: dark when the admin sets dark mode,
 *   else the system setting. dev/templates/master.pug repeats this rule before the first paint.
 */
export function defaultDark () {
  return siteConfig.darkMode || (!!window.matchMedia && window.matchMedia(SYSTEM_DARK).matches)
}

/**
 * @returns {string} The choice saved in this browser: 'dark', 'light', or ''
 */
export function savedTheme () {
  try {
    return window.localStorage.getItem('theme') || ''
  } catch (err) {
    return ''
  }
}

// -> A copy of the profile appearance, for the script before the first paint (master.pug)
const ACCOUNT_KEY = 'themeAccount'

/**
 * Keep a copy of the profile appearance in this browser, so the next page paints with it.
 *
 * @param {string} appearance 'dark', 'light', or '' (none, or a guest)
 */
export function rememberAccountTheme (appearance) {
  try {
    if (appearance) {
      window.localStorage.setItem(ACCOUNT_KEY, appearance)
    } else {
      window.localStorage.removeItem(ACCOUNT_KEY)
    }
  } catch (err) {
    // -> Storage blocked: the first paint uses the default theme
  }
}

/**
 * Switch the theme and keep the choice in this browser.
 * client-app.js reads the choice back on the next page load.
 *
 * @param {Object} vuetify The Vuetify instance (`this.$vuetify`)
 * @param {string} value 'dark', 'light', or '' for the default (see defaultDark)
 */
export function setTheme (vuetify, value) {
  vuetify.theme.dark = value === '' ? defaultDark() : (value === 'dark')
  try {
    if (value === '') {
      window.localStorage.removeItem('theme')
    } else {
      window.localStorage.setItem('theme', value)
    }
  } catch (err) {
    // -> Storage blocked: the choice lasts for this page only
  }
}

/**
 * While no choice is saved, follow a change of the system setting.
 *
 * @param {Object} vuetify The Vuetify instance
 * @param {Function} hasChoice Whether the reader has a saved choice (browser or profile)
 */
export function followSystemTheme (vuetify, hasChoice) {
  if (!window.matchMedia) { return }
  const query = window.matchMedia(SYSTEM_DARK)
  const onChange = () => {
    if (!hasChoice()) { vuetify.theme.dark = defaultDark() }
  }
  // -> Safari before 14 has only addListener
  if (query.addEventListener) {
    query.addEventListener('change', onChange)
  } else if (query.addListener) {
    query.addListener(onChange)
  }
}
