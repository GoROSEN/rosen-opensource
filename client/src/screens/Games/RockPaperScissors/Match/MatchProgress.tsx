import React, { useEffect } from 'react'
import { Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  Easing,
  FadeIn,
  FadeOut,
  cancelAnimation,
} from 'react-native-reanimated'
import { useLazyGetProducerBasicQuery } from '@/services/modules/member'

type Props = {
  onMatchProgressConfirm: (matcherInfo: API.UserInfo) => void
}

const MatchProgress: React.FC<Props> = props => {
  const { t } = useTranslation()
  const { onMatchProgressConfirm } = props

  const [fetchProducerBasicTrigger] = useLazyGetProducerBasicQuery()

  useEffect(() => {
    setTimeout(() => {
      fetchProducerBasicTrigger(13).then(res => {
        onMatchProgressConfirm(res.data)
      })
    }, 5000)
  }, [fetchProducerBasicTrigger, onMatchProgressConfirm])

  const rotation = useSharedValue(0)

  useEffect(() => {
    // 每次执行前先 cancel 之前的动画
    cancelAnimation(rotation)
    // shareValue 也需要重置一下
    rotation.value = 0

    rotation.value = withRepeat(
      withTiming(360, { duration: 2500, easing: Easing.linear }),
      -1, // -1 表示无限循环
      false,
    )
  }, [rotation])

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    }
  })

  return (
    <Animated.View entering={FadeIn.delay(500)} exiting={FadeOut}>
      <Animated.Image
        source={require('@/assets/images/games/rps/match_progress.png')}
        style={[styles.inProgressImage, animatedStyle]}
      />
      <Text style={styles.inProgressText}>On matching, please wait</Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  inProgressImage: {
    height: 194,
    width: 194,
    alignSelf: 'center',
    marginVertical: 30,
  },

  inProgressText: {
    fontSize: 14,
    textAlign: 'center',
  },
})

export default React.memo(MatchProgress)
