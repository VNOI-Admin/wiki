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
 * An import failure, carrying a stable code the UI turns into a localized message.
 *
 * The module stays i18n-agnostic: it knows what went wrong, not how to say it.
 */
export class ImportError extends Error {
  /**
   * @param {string} code One of ImportError.codes
   * @param {Object} [params] Interpolation values for the message
   */
  constructor (code, params = {}) {
    super(code)
    this.name = 'ImportError'
    this.code = code
    this.params = params
  }
}

ImportError.codes = {
  NOT_JSON: 'notJson',
  NOT_OBJECT: 'notProgressData',
  WRONG_FORMAT: 'wrongFormat',
  NEWER_VERSION: 'newerVersion',
  MISSING_RECORDS: 'missingRecords',
  NO_RECORDS: 'noRecords',
  UNREADABLE: 'unreadable'
}

/**
 * Validate and extract records from an import payload.
 *
 * @param {string} text Raw file contents
 * @returns {{ records: ProgressRecord[] }} Parsed records
 * @throws {ImportError} When the file is unusable
 */
export function parseImport (text) {
  let payload = null
  try {
    payload = JSON.parse(text)
  } catch (err) {
    throw new ImportError(ImportError.codes.NOT_JSON)
  }

  if (!payload || typeof payload !== 'object') {
    throw new ImportError(ImportError.codes.NOT_OBJECT)
  }
  if (payload.format !== EXPORT_FORMAT) {
    throw new ImportError(ImportError.codes.WRONG_FORMAT)
  }
  if (_.toInteger(payload.version) > EXPORT_VERSION) {
    throw new ImportError(ImportError.codes.NEWER_VERSION, { version: payload.version })
  }
  if (!_.isArray(payload.records)) {
    throw new ImportError(ImportError.codes.MISSING_RECORDS)
  }

  const records = payload.records.filter(record => {
    const id = _.toInteger(_.get(record, 'pageId'))
    return _.isFinite(id) && id > 0 && !_.isEmpty(_.get(record, 'statusId'))
  })

  if (records.length < 1) {
    throw new ImportError(ImportError.codes.NO_RECORDS)
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
    reader.onerror = () => reject(new ImportError(ImportError.codes.UNREADABLE))
    reader.readAsText(file)
  })
}
