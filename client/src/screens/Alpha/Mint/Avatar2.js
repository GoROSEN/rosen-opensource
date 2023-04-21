import React, { useRef, useState } from 'react'
import {
  Animated,
  PanResponder,
  View,
  Text,
  Image,
  StyleSheet,
} from 'react-native'
import { useTranslation } from 'react-i18next'

function Avatar(props) {
  const avatarWidth = useRef(0)
  const avatarHeight = useRef(0)
  console.log(props.local)
  const pan = useRef(
    new Animated.ValueXY({
      x: props.initPositionX || 0,
      y: props.initPositionY || 0,
    }),
  ).current

  const lastPan = useRef({
    x: pan.x._value,
    y: pan.y._value,
  }).current

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: pan.x._value,
          y: pan.y._value,
        })
      },
      onPanResponderMove: (e, g) => {
        let movedX = g.dx
        let movedY = g.dy

        // 边界处理
        if (lastPan.x + avatarWidth.current + g.dx > props.containerWidth) {
          movedX = props.containerWidth - avatarWidth.current - lastPan.x
        }

        if (lastPan.x + g.dx < 0) {
          movedX = -lastPan.x
        }

        if (lastPan.y + avatarHeight.current + g.dy > props.containerHeight) {
          movedY = props.containerHeight - avatarHeight.current - lastPan.y
        }

        if (lastPan.y + g.dy < 0) {
          movedY = -lastPan.y
        }

        pan.x.setValue(movedX)
        pan.y.setValue(movedY)
      },
      onPanResponderRelease: () => {
        pan.flattenOffset()
        lastPan.x = pan.x._value
        lastPan.y = pan.y._value
      },
    }),
  ).current

  const onAvatarLayout = event => {
    avatarWidth.current = event.nativeEvent.layout.width
    avatarHeight.current = event.nativeEvent.layout.height
  }

  return (
    <Animated.View
      style={[
        styles.avatarContainer,
        pan.getLayout(),
        // {
        //   top: pan.y,
        //   left: pan.x,
        //   // transform: [{ translateX: pan.x }, { translateY: pan.y }],
        // },
      ]}
      {...panResponder.panHandlers}
      onLayout={onAvatarLayout}
    >
      <View style={styles.avatar}>
        <Image
          source={
            props.local
              ? { uri: props.avatarImage }
              : { uri: `${props.avatarImage}?x-oss-process=style/p_30` }
          }
          style={styles.avatarImage}
        />
      </View>
      <Text style={styles.avatarName}>{props.avatarName}</Text>
    </Animated.View>
  )
}
const styles = StyleSheet.create({
  avatarContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 60,
    height: 60,
  },
  avatarName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 5,
  },
})
export default React.memo(Avatar)
