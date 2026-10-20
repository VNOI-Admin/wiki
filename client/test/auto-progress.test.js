/**
 * @jest-environment jsdom
 */
import ProgressStorage from '../modules/progress/progress-storage'
import ProgressManager from '../modules/progress/progress-manager'
import StatusRegistry from '../modules/progress/status-registry'
import { startAutoProgress, doneAfter } from '../modules/progress/auto-progress'

global.siteConfig = { lang: 'en' }

const statuses = [
  { id: 'none', label: 'Not Started', isDefault: true },
  { id: 'reading', label: 'Reading' },
  { id: 'completed', label: 'Completed' },
  { id: 'skipped', label: 'Skipped' }
]

function makeManager () {
  const manager = new ProgressManager(new ProgressStorage({ debounceMs: 0 }), StatusRegistry.fromConfig({ statuses }))
  manager.isEnabled = true
  return manager
}

// -> The article text: its box says where the reader is
function makeContent (words, box) {
  const el = document.createElement('div')
  el.textContent = 'từ '.repeat(words)
  el.getBoundingClientRect = () => box
  return el
}

const META = { locale: 'vi', path: 'algo/x', title: 'X' }
const status = (p) => p.getStatusByPageId(7).id

describe('auto-progress', () => {
  let progress, stop
  beforeEach(() => {
    jest.useFakeTimers()
    window.localStorage.clear()
    window.innerHeight = 800
    progress = makeManager()
  })
  afterEach(() => {
    if (stop) { stop() }
    jest.useRealTimers()
  })

  it('needs 10 % of the reading time, from 10 s to 90 s', () => {
    expect(doneAfter(100)).toBe(10)
    expect(doneAfter(5000)).toBe(90)
    expect(doneAfter(2500)).toBe(60)
  })

  it('marks the page reading after 10 s, then done at the end of the text', () => {
    const box = { top: 100, bottom: 3000 }
    stop = startAutoProgress({ progress, pageId: 7, meta: META, content: makeContent(2500, box) })
    jest.advanceTimersByTime(8000)
    expect(status(progress)).toBe('none')
    jest.advanceTimersByTime(2000)
    expect(status(progress)).toBe('reading')
    // -> The end of the text is on screen, but too soon
    box.bottom = 700
    jest.advanceTimersByTime(20000)
    expect(status(progress)).toBe('reading')
    jest.advanceTimersByTime(40000)
    expect(status(progress)).toBe('completed')
  })

  it('marks the page reading once the reader scrolls into the text', () => {
    const box = { top: 100, bottom: 3000 }
    stop = startAutoProgress({ progress, pageId: 7, meta: META, content: makeContent(500, box) })
    box.top = -20
    window.dispatchEvent(new Event('scroll'))
    expect(status(progress)).toBe('reading')
  })

  it('stops after a manual choice and never lowers done or skipped', () => {
    const box = { top: -20, bottom: 3000 }
    stop = startAutoProgress({ progress, pageId: 7, meta: META, content: makeContent(500, box) })
    window.dispatchEvent(new Event('scroll'))
    expect(status(progress)).toBe('reading')
    // -> The reader sets it back by hand
    progress.setStatus(7, 'none', META)
    jest.advanceTimersByTime(30000)
    expect(status(progress)).toBe('none')
    stop()

    progress.setStatus(7, 'skipped', META)
    stop = startAutoProgress({ progress, pageId: 7, meta: META, content: makeContent(500, { top: -20, bottom: 700 }) })
    jest.advanceTimersByTime(30000)
    expect(status(progress)).toBe('skipped')
  })

  it('counts only visible time', () => {
    const hidden = jest.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    stop = startAutoProgress({ progress, pageId: 7, meta: META, content: makeContent(500, { top: 100, bottom: 3000 }) })
    jest.advanceTimersByTime(30000)
    expect(status(progress)).toBe('none')
    hidden.mockRestore()
  })
})
