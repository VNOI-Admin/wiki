// -> Short names for the five difficulty levels. The full meaning comes from the legend
//    table on the catalogue page.
const LEVEL_NAMES = ['Cơ bản', 'HSG QG, ICPC', 'Nâng cao', 'Rất khó', 'Chuyên sâu']

/**
 * @param {Function} t The i18n `$t`
 * @param {number} n Level, 1 to 5
 * @returns {string}
 */
export function levelName (t, n) {
  return t(`common:catalog.level${n}`, LEVEL_NAMES[n - 1])
}
