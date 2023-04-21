import * as React from 'react'
import PropTypes from 'prop-types'
import { Pressable } from 'react-native'
import { globalStyles } from '@/constants'
import SvgIcon from '@/components/SvgIcon'

const TouchIcon = ({
  innerRef,
  iconName,
  iconSize,
  iconColor,
  onPress,
  style,
}) => (
  <Pressable
    ref={innerRef}
    onPressIn={onPress}
    hitSlop={20}
    style={[globalStyles.flexCenter, style]}
  >
    <SvgIcon iconName={iconName} iconSize={iconSize} iconColor={iconColor} />
  </Pressable>
)

TouchIcon.defaultProps = {
  iconColor: '#ffffff',
  iconSize: 24,
  style: {},
}

TouchIcon.propTypes = {
  // required
  iconName: PropTypes.string.isRequired,
  onPress: PropTypes.func.isRequired,

  // optional
  iconSize: PropTypes.number,
  iconColor: PropTypes.string,
  style: PropTypes.oneOfType([
    PropTypes.array,
    PropTypes.number,
    PropTypes.object,
  ]),
}

export default React.memo(TouchIcon)
