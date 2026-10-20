/* global siteConfig */

/**
 * Switch the theme and keep the choice in this browser.
 * client-app.js reads the choice back on the next page load.
 *
 * @param {Object} vuetify The Vuetify instance (`this.$vuetify`)
 * @param {string} value 'dark', 'light', or '' for the site default
 */
export function setTheme (vuetify, value) {
  vuetify.theme.dark = value === '' ? siteConfig.darkMode : (value === 'dark')
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
