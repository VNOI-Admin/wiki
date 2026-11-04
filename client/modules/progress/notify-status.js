// -> The icon that marks a status toast, so a newer status can replace an older one
const STATUS_ICON = 'check'

/**
 * Confirm a progress change with the site toast: "Tiến độ: Hoàn thành".
 * Another active message (the guest login hint, a sync error) stays: the change already
 * shows on the status button or mark.
 *
 * @param {Object} vm A component (for $store and $t)
 * @param {Object} status The new status definition
 */
export function notifyStatus (vm, status) {
  const current = vm.$store.state.notification
  if (current && current.isActive && current.icon !== STATUS_ICON) { return }
  vm.$store.commit('showNotification', {
    style: 'success',
    icon: STATUS_ICON,
    message: `${vm.$t('common:progress.title', 'Tiến độ')}: ${status.label}`
  })
}
