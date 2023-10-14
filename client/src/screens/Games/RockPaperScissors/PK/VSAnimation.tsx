import React from 'react'
import { View, StyleSheet } from 'react-native'
import Animated, { SlideInLeft, SlideInRight } from 'react-native-reanimated'

const VSAnimation = () => {
  return (
    <View style={styles.container}>
      <Animated.Image
        entering={SlideInLeft}
        style={styles.v}
        source={require('@/assets/images/games/rps/pk_V.png')}
      />
      <Animated.Image
        entering={SlideInRight}
        style={styles.s}
        source={require('@/assets/images/games/rps/pk_S.png')}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    transform: [{ skewY: '-10deg' }],
  },
  v: {
    width: '90%',
    resizeMode: 'contain',
    marginRight: -20,
    marginTop: -20,
  },
  s: {
    width: '90%',
    resizeMode: 'contain',
    marginLeft: -20,
    marginBottom: -20,
  },
})

export default React.memo(VSAnimation)
