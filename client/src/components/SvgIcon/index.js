import React from 'react'
import PropTypes from 'prop-types'
// import SvgUri from './SvgUri'
import { SvgCss } from 'react-native-svg'
import svgs from './svgs'

const SvgIcon = ({ iconName, iconSize, iconColor, style }) => {
  const svgXmlData = svgs[iconName]
  return (
    <SvgCss
      width={iconSize}
      height={iconSize}
      xml={svgXmlData}
      fill={iconColor}
      style={style}
    />
  )
}

SvgIcon.defaultProps = {
  iconColor: '#ffffff',
  iconSize: 24,
}

SvgIcon.propTypes = {
  // required
  iconName: PropTypes.string.isRequired,
  // optional
  iconSize: PropTypes.number,
  iconColor: PropTypes.string,
}

export default React.memo(SvgIcon)
