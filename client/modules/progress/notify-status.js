/**
 * Confirm a progress change with the site toast: "Tiến độ: Hoàn thành".
 *
 * @param {Object} vm A component (for $store and $t)
 * @param {Object} status The new status definition
 */
export function notifyStatus (vm, status) {
  vm.$store.commit('showNotification', {
    style: 'success',
    icon: 'check',
    message: `${vm.$t('common:progress.title', 'Tiến độ')}: ${status.label}`
  })
}
