import { installMenuKeys, menuOf } from './menu-keys'

/**
 * Keyboard and screen reader fixes for Vuetify 2.3 components, installed once for the app.
 */

// -> The last pressed control: iOS Safari does not focus a tapped button
let lastPressed = null

/**
 * The control a dialog gives the focus back to on close.
 * A menu item hides with its menu, so its menu trigger takes its place.
 */
function dialogOpener () {
  const active = document.activeElement
  let opener = active && active !== document.body ? active : lastPressed
  const menu = opener && menuOf(opener)
  if (menu && menu.$refs.content && menu.$refs.content.contains(opener)) {
    opener = menu.getActivator() || opener
  }
  return opener
}

/**
 * Vuetify 2.3 renders a dialog at its first open and then moves it to the app root,
 * which drops the focus it just gave the dialog: Esc and Tab then miss the dialog.
 * Give the focus again once the dialog is in place, and give it back to the opener on close.
 */
function dialogFocus (vm) {
  let opener = null
  vm.$watch('isActive', open => {
    if (open) {
      opener = dialogOpener()
      setTimeout(() => {
        const content = vm.$refs.content
        if (vm.isActive && content && !content.contains(document.activeElement)) {
          content.focus()
        }
      }, 0)
      return
    }
    const back = opener
    opener = null
    vm.$nextTick(() => {
      const lost = !document.activeElement || document.activeElement === document.body
      if (back && back !== document.body && back.isConnected && lost) {
        back.focus({ preventScroll: true })
      }
    })
  })
}

const SELECT_ARIA = ['role', 'aria-haspopup', 'aria-expanded', 'aria-owns']

/**
 * Vuetify 2.3 v-select puts role="button" on the box around its input: one control inside
 * another, and the input has no role. Make the input the combobox (ARIA 1.2), as in later
 * Vuetify versions.
 */
function selectAria (vm) {
  const genInputSlot = vm.genInputSlot
  const genInput = vm.genInput
  vm.genInputSlot = () => {
    const node = genInputSlot()
    SELECT_ARIA.forEach(key => { delete node.data.attrs[key] })
    return node
  }
  vm.genInput = () => {
    const node = genInput()
    Object.assign(node.data.attrs, {
      role: 'combobox',
      'aria-haspopup': 'listbox',
      'aria-expanded': String(vm.isMenuActive),
      'aria-controls': vm.computedOwns
    })
    return node
  }
}

const DIALOGS = ['v-dialog', 'v-bottom-sheet']
// -> v-autocomplete, v-combobox and v-overflow-btn extend v-select
const SELECTS = ['v-select', 'v-autocomplete', 'v-combobox', 'v-overflow-btn']

export default {
  install (Vue) {
    document.addEventListener('click', ev => {
      lastPressed = ev.target instanceof Element ? ev.target.closest('button, a[href], [role="button"], [tabindex]') : null
    }, true)

    // -> Chrome does not scroll a partly hidden control into view when it takes the focus,
    //    so in a sideways strip its label and ring stay cut. Show the whole control.
    //    Keyboard focus only: a click never moves the page under the pointer.
    document.addEventListener('focusin', ev => {
      const el = ev.target
      const strip = el instanceof Element ? el.parentElement : null
      if (strip && strip.scrollWidth > strip.clientWidth && getComputedStyle(strip).overflowX !== 'visible' && el.matches(':focus-visible')) {
        el.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      }
    })

    installMenuKeys()

    Vue.mixin({
      created () {
        const name = this.$options.name
        if (DIALOGS.includes(name)) { dialogFocus(this) }
        if (SELECTS.includes(name)) { selectAria(this) }
      }
    })
  }
}
