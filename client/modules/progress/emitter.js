/**
 * Minimal synchronous pub/sub.
 *
 * Deliberately not an npm dependency and not a Vue instance used as a bus: the progress
 * modules must be usable from plain (non-Vue) code such as the link decorator.
 */
export default class Emitter {
  constructor () {
    this.listeners = []
  }

  /**
   * Subscribe to events.
   *
   * @param {(evt: Object) => void} fn Listener
   * @returns {() => void} Unsubscribe function
   */
  on (fn) {
    this.listeners.push(fn)
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn)
    }
  }

  /**
   * Emit an event to all listeners. A throwing listener never stops the others.
   *
   * @param {Object} evt Event payload
   */
  emit (evt) {
    this.listeners.forEach(fn => {
      try {
        fn(evt)
      } catch (err) {
        console.warn('[progress] listener failed', err)
      }
    })
  }
}
