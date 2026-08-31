import _ from 'lodash'

export const EXPORT_FORMAT = 'vnoj-wiki-progress'
export const EXPORT_VERSION = 1

/**
 * Serialization and file exchange for progress data.
 *
 * Owns the *exchange* format only — persistence stays with ProgressStorage, and applying
 * an import stays with ProgressManager.
 */

/**
 * Build the export payload.
 *
 * Records are emitted as an array (rather than the internal id-keyed map) so the file is
 * readable and diffable, and each record carries locale/path so an import can rebuild
 * the path -> id alias index on a browser that has never visited those pages.
 *
 * @param {ProgressRecord[]} records
 * @returns {Object}
 */
export function buildExport (records) {
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    site: window.location.origin,
    records: _.orderBy(records, ['path'], ['asc'])
  }
}

/**
 * Suggested filename for an export, e.g. `wiki-progress-2026-08-31.json`.
 *
 * @returns {string}
 */
export function buildExportFilename () {
  return `wiki-progress-${new Date().toISOString().slice(0, 10)}.json`
}

/**
 * Trigger a browser download of the export payload.
 *
 * @param {Object} payload
 * @param {string} filename
 */
export function downloadExport (payload, filename) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // -> Revoke on the next tick: revoking synchronously can cancel the download in Safari
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/**
 * Validate and extract records from an import payload.
 *
 * @param {string} text Raw file contents
 * @returns {{ records: ProgressRecord[] }} Parsed records
 * @throws {Error} With a message suitable for display when the file is unusable
 */
export function parseImport (text) {
  let payload = null
  try {
    payload = JSON.parse(text)
  } catch (err) {
    throw new Error('This file is not valid JSON.')
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error('This file does not contain progress data.')
  }
  if (payload.format !== EXPORT_FORMAT) {
    throw new Error('This file was not exported from a wiki progress tracker.')
  }
  if (_.toInteger(payload.version) > EXPORT_VERSION) {
    throw new Error(`This file was exported by a newer version (v${payload.version}). Update the wiki, then try again.`)
  }
  if (!_.isArray(payload.records)) {
    throw new Error('This file is missing its records list.')
  }

  const records = payload.records.filter(record => {
    const id = _.toInteger(_.get(record, 'pageId'))
    return _.isFinite(id) && id > 0 && !_.isEmpty(_.get(record, 'statusId'))
  })

  if (records.length < 1) {
    throw new Error('This file contains no usable records.')
  }

  return { records }
}

/**
 * Read a File object as text.
 *
 * @param {File} file
 * @returns {Promise<string>}
 */
export function readFile (file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Could not read the selected file.'))
    reader.readAsText(file)
  })
}
