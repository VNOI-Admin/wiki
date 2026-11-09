/**
 * Keyboard use for the `.vn-menu` menus, as in the WAI-ARIA menu button pattern.
 *
 * These menus hold plain buttons and links, not `v-list-item`, so the Vuetify arrow keys
 * do not reach them. ArrowDown, ArrowUp, Enter or Space on the trigger opens the menu and
 * moves focus to the checked item (else the first item, or the last item for ArrowUp).
 * In the menu, the arrows, Home and End move focus, and Tab closes it. When the menu
 * closes with focus inside it, the focus goes back to the trigger.
 * Vuetify keeps Esc: it closes the menu and focuses the trigger.
 */

const ITEM = '.vn-menu__item'
const OPEN_KEYS = ['ArrowDown', 'ArrowUp', 'Enter', ' ']
// -> The time a trigger key has to open its menu (Space opens on keyup)
const OPEN_WAIT = 1000

/**
 * The trigger element of a menu. Vuetify getActivator() with no event caches its first
 * guess, so read the same values here without that side effect.
 */
export function triggerOf (vm) {
  return vm.activatorElement || (vm.activatorNode[0] && vm.activatorNode[0].elm) || null
}

/**
 * The v-menu instance that renders `el`, a trigger or an element in its content
 */
export function menuOf (el) {
  const isMenu = vm => vm.$options.name === 'v-menu'
  const content = el && el.closest('.v-menu__content')
  if (content) {
    // -> The content element belongs to a child of the menu (the theme provider)
    let vm = content.__vue__
    while (vm && !isMenu(vm)) { vm = vm.$parent }
    return vm || null
  }
  // -> The trigger renders beside the menu root, not inside it: find the menu that owns it.
  //    A parent component can share the menu root, and then owns `__vue__`.
  for (const root of document.querySelectorAll('.v-menu')) {
    const find = vm => (isMenu(vm) && vm.$el === root ? vm : vm.$children.map(find).find(Boolean))
    const vm = root.__vue__ && find(root.__vue__)
    const trigger = vm && triggerOf(vm)
    if (trigger && trigger.contains && trigger.contains(el)) { return vm }
  }
  return null
}

// -> A hover menu (the difficulty legend) is a popover with no items: it keeps its own keys
const isVnMenu = vm => !!vm && !vm.openOnHover && /\bvn-menu\b/.test(vm.contentClass || '')

function itemsOf (vm) {
  const content = vm.$refs.content
  return content ? Array.from(content.querySelectorAll(ITEM)).filter(el => !el.disabled && el.getClientRects().length > 0) : []
}

function focusItem (vm, which) {
  const items = itemsOf(vm)
  if (items.length === 0) { return }
  const checked = items.find(el => el.getAttribute('aria-checked') === 'true')
  const target = which === 'last' ? items[items.length - 1] : (which === 'checked' && checked) || items[0]
  showItem(target)
}

// -> preventScroll keeps the page still while the menu takes its place; a tall menu
//    (the language list) then scrolls itself to the item
function showItem (item) {
  item.focus({ preventScroll: true })
  item.scrollIntoView({ block: 'nearest' })
}

// -> Give the focus back to the trigger when the menu closes with focus inside it.
//    A click outside the menu moves the focus first, so it stays where the click put it.
function watchClose (vm) {
  if (vm._vnMenuKeys) { return }
  vm._vnMenuKeys = true
  vm.$watch('isActive', open => {
    if (open) { return }
    const content = vm.$refs.content
    const trigger = triggerOf(vm)
    if (content && content.contains(document.activeElement) && trigger && trigger.isConnected) {
      trigger.focus({ preventScroll: true })
    }
  })
}

// -> The first open renders the content, and it shows a few frames later
const SHOW_FRAMES = 20

function whenOpen (vm, fn) {
  const run = (frame = 0) => requestAnimationFrame(() => {
    if (!vm.isActive) { return }
    if (itemsOf(vm).length > 0 || frame >= SHOW_FRAMES) { return fn() }
    run(frame + 1)
  })
  if (vm.isActive) { return run() }
  const stop = vm.$watch('isActive', open => {
    stop()
    clearTimeout(timer)
    if (open) { run() }
  })
  const timer = setTimeout(stop, OPEN_WAIT)
}

function onTriggerKey (vm, ev) {
  if (!OPEN_KEYS.includes(ev.key)) { return }
  // -> Enter or Space on an open menu closes it: the click toggles it
  if (vm.isActive && !ev.key.startsWith('Arrow')) { return }
  if (ev.key.startsWith('Arrow')) { ev.preventDefault() }
  watchClose(vm)
  whenOpen(vm, () => {
    if (vm.isActive) { focusItem(vm, ev.key === 'ArrowUp' ? 'last' : 'checked') }
  })
}

function onContentKey (vm, ev) {
  const items = itemsOf(vm)
  const at = items.indexOf(document.activeElement)
  let next = null
  switch (ev.key) {
    case 'ArrowDown': next = items[(at + 1) % items.length]; break
    // -> From the first item, or from no item, ArrowUp goes to the last item
    case 'ArrowUp': next = items[at > 0 ? at - 1 : items.length - 1]; break
    case 'Home': next = items[0]; break
    case 'End': next = items[items.length - 1]; break
    case 'Tab':
      // -> Close the menu. The focus goes to the trigger, and the browser then moves it on.
      watchClose(vm)
      vm.isActive = false
      if (triggerOf(vm)) { triggerOf(vm).focus({ preventScroll: true }) }
      return
    default: return
  }
  if (next) {
    ev.preventDefault()
    showItem(next)
  }
}

export function installMenuKeys () {
  document.addEventListener('keydown', ev => {
    if (ev.defaultPrevented || ev.altKey || ev.ctrlKey || ev.metaKey || !(ev.target instanceof Element)) { return }
    const vm = menuOf(ev.target)
    if (!isVnMenu(vm)) { return }
    if (vm.$refs.content && vm.$refs.content.contains(ev.target)) {
      onContentKey(vm, ev)
    } else if (triggerOf(vm) && triggerOf(vm).contains(ev.target)) {
      onTriggerKey(vm, ev)
    }
  })
}
