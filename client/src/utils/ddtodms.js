/**
 * Converts decimal degrees to degrees minutes seconds.
 *
 * @param dd the decimal degrees value.
 * @param isLng specifies whether the decimal degrees value is a longitude.
 * @return degrees minutes seconds string in the format 49°15'51.35"N
 */
function convertToDms(dd, isLng) {
  var dir = dd < 0 ? (isLng ? 'W' : 'S') : isLng ? 'E' : 'N'

  var absDd = Math.abs(dd)
  var deg = absDd | 0
  var frac = absDd - deg
  var min = (frac * 60) | 0
  var sec = frac * 3600 - min * 60
  // Round it to 2 decimal points.
  sec = Math.round(sec * 100) / 100
  return deg + '°' + min + "'" + sec + '"' + dir
}

export default convertToDms
