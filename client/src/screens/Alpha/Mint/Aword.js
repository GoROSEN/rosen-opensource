import React, { useRef, useCallback } from 'react'
import { Animated, PanResponder, Text, StyleSheet } from 'react-native'
import { BlurView } from 'expo-blur'
import SvgIcon from '@/components/SvgIcon'

function Aword(props) {
  const awordWidth = useRef(0)
  const awordHeight = useRef(0)

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
        if (lastPan.x + awordWidth.current + g.dx > props.containerWidth) {
          movedX = props.containerWidth - awordWidth.current - lastPan.x
        }

        if (lastPan.x + g.dx < 0) {
          movedX = -lastPan.x
        }

        if (lastPan.y + awordHeight.current + g.dy > props.containerHeight) {
          movedY = props.containerHeight - awordHeight.current - lastPan.y
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

  const onAwordLayout = useCallback(event => {
    awordWidth.current = event.nativeEvent.layout.width
    awordHeight.current = event.nativeEvent.layout.height
  }, [])

  return (
    <Animated.View
      style={[styles.wordContainer, pan.getLayout()]}
      {...panResponder.panHandlers}
      onLayout={onAwordLayout}
    >
      <BlurView style={styles.wordContainerBlur} intensity={50} tint="dark">
        <SvgIcon iconName="love" iconSize={12} />
        <Text style={styles.word}>{props.word}</Text>
      </BlurView>
    </Animated.View>
  )
}
const styles = StyleSheet.create({
  wordContainer: {
    position: 'absolute',
    borderColor: 'rgba(255,225,255,0.6)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: 14,
    overflow: 'hidden',
  },
  wordContainerBlur: {
    height: 24,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  word: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 5,
    lineHeight: 24,
  },
})
export default React.memo(Aword)
