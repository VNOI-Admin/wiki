import Cookies from 'js-cookie'

/**
 * Bring the reader back to this page after login.
 * The server and login.vue read the same cookie (see server/controllers/auth.js).
 */
export function rememberPage () {
  const path = window.location.pathname
  // -> Never come back to an auth page, and never to another host ("//host")
  if (path.startsWith('//') || /^\/(login|register|logout)\b/.test(path)) { return }
  Cookies.set('loginRedirect', path, { expires: 1 / 96 })
}
