import React from 'react'
import {
  StyleSheet,
  Image,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from 'react-native'

type Props = {
  style?: StyleProp<ViewStyle>
  onPress?: () => void
}

const CloseBtn: React.FC<Props> = props => {
  return (
    <TouchableOpacity
      onPress={props.onPress}
      style={[styles.closeBtnContainer, props.style]}
    >
      <Image
        source={require('@/assets/images/games/rps/close.png')}
        style={styles.closeBtnImage}
      />
    </TouchableOpacity>
  )
}

export default React.memo(CloseBtn)

const styles = StyleSheet.create({
  closeBtnContainer: {
    position: 'absolute',
    width: 48,
    height: 48,
  },
  closeBtnImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
})
