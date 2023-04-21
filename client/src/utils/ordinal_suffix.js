/**
 * Add st, nd, rd and th (ordinal) suffix to a number.
 */
function ordinalSuffixOf(i) {
  var j = i % 10,
    k = i % 100
  if (j == 1 && k != 11) {
    return 'st'
  }
  if (j == 2 && k != 12) {
    return 'nd'
  }
  if (j == 3 && k != 13) {
    return 'rd'
  }
  return 'th'
}

export default ordinalSuffixOf
