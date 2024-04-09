import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, StyleSheet, ImageBackground, Image } from 'react-native'
import Animated, {
  Extrapolate,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  runOnJS,
  FadeOut,
  FadeIn,
  SlideInUp,
  SlideInDown,
  cancelAnimation,
} from 'react-native-reanimated'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { LinearGradient } from 'expo-linear-gradient'
import LinearGradientText from '@/components/LinearGradientText'
import { globalStyles } from '@/constants'
import Avatar from '@/components/Avatar'
import SvgIcon from '@/components/SvgIcon'

type Props = {
  winCount: number
  loseCount: number
  isMatcher: boolean
  matcherInfo?: API.UserInfo
  offerId?: number
  startPK: boolean
  onReady?: (matcherOfferId: number) => void
}

type Offer = {
  [key: number]: {
    color: string
    image: number
  }
}

const offerMap: Offer = {
  1: {
    color: '#FF7247',
    image: require('@/assets/images/games/rps/selection_r.png'),
  },
  2: {
    color: '#FDCA28',
    image: require('@/assets/images/games/rps/selection_p.png'),
  },
  3: {
    color: '#47A6FF',
    image: require('@/assets/images/games/rps/selection_s.png'),
  },
}

const PKCard: React.FC<Props> = props => {
  const {
    winCount,
    loseCount,
    isMatcher,
    matcherInfo,
    offerId,
    startPK,
    onReady,
  } = props

  const { t } = useTranslation()
  const userInfo = useSelector(
    (state: Store.RootState) => state.authUser.userInfo,
  )
  const [step, setStep] = useState(isMatcher ? 1 : 2)
  const [localOfferId, setLocalOfferId] = useState(offerId || 0)

  const rotation = useSharedValue(0)
  const rotationAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    }
  })

  useEffect(() => {
    // 每次执行前先 cancel 之前的动画
    cancelAnimation(rotation)
    // shareValue 也需要重置一下
    rotation.value = 0

    rotation.value = withRepeat(
      withTiming(-360, { duration: 1000, easing: Easing.linear }),
      -1, // -1 表示无限循环
      false,
    )
  }, [rotation])

  const shakeValue = useSharedValue(0)
  const shakeAnimatedStyle = useAnimatedStyle(() => {
    const rotateZ = interpolate(
      shakeValue.value,
      [0, 1, 2],
      [0, 10, -10],
      Extrapolate.CLAMP,
    )
    return {
      transform: [{ rotateZ: `${rotateZ}deg` }],
    }
  })

  // 如果有匹配者信息，先要等待匹配者选择，选择完了之后进入双方ready状态
  const cardEnteredCallback = useCallback(() => {
    // 这里需要等待匹配值选择
    // to-do
    const offerIdMap = [1, 2, 3]
    const randomIndex = Math.floor(Math.random() * offerIdMap.length)
    const matcherOfferId = offerIdMap[randomIndex]
    setLocalOfferId(matcherOfferId)

    // setTimeout只是临时用的，等获取后端之后之后就不用了
    setTimeout(() => {
      setStep(2)
      onReady && onReady(matcherOfferId)
    }, 2000)
  }, [onReady])

  // 等card显示了之后执行
  const handleAfterCardEntered = useCallback(
    (finished: boolean) => {
      'worklet'
      if (isMatcher && finished) {
        runOnJS(cardEnteredCallback)()
      }
    },
    [cardEnteredCallback, isMatcher],
  )

  // 双方都ready了之后延时2秒进行揭晓结果
  useEffect(() => {
    if (startPK) {
      setTimeout(() => {
        shakeValue.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 100, easing: Easing.linear }),
            withTiming(2, { duration: 100, easing: Easing.linear }),
          ),
          5,
          true,
          () => {
            runOnJS(setStep)(3)
          },
        )
      }, 2000)
    }
  }, [shakeValue, startPK])

  return (
    <Animated.View
      entering={
        isMatcher
          ? SlideInUp.delay(500)
              .duration(450)
              .withCallback(handleAfterCardEntered)
          : SlideInDown.delay(500).duration(450)
      }
      style={styles.container}
    >
      {isMatcher && (
        <Avatar
          size="large"
          style={styles.avatar}
          avatarImage={matcherInfo?.avatar}
          equip={matcherInfo?.equip}
        />
      )}
      {!isMatcher && <Avatar size="large" style={styles.avatar} />}
      <View style={styles.card}>
        <LinearGradient
          colors={['#B04CFF', '#0CC4FF']}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        >
          <ImageBackground
            source={require('@/assets/images/rosen_background.png')}
            style={styles.rosenBg}
          />
        </LinearGradient>

        {step === 3 && (
          <Animated.View
            entering={FadeIn}
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: offerMap[localOfferId].color },
            ]}
          />
        )}

        {step === 1 && (
          <Animated.View exiting={FadeOut} style={styles.selecting}>
            <Animated.View style={rotationAnimatedStyle}>
              <ImageBackground
                source={require('@/assets/images/games/rps/pk_selecting_bg.png')}
                style={styles.selectingBg}
              />
            </Animated.View>
            <LinearGradientText
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              color={['#04C3FF', '#0667F8']}
              styles={styles.selectingTextWrapper}
              textStyle={[globalStyles.luckiestGuyFamily, styles.selectingText]}
            >
              Selecting
            </LinearGradientText>
          </Animated.View>
        )}

        {step === 2 && (
          <Animated.View
            style={[styles.question, shakeAnimatedStyle]}
            entering={FadeIn}
            exiting={FadeOut}
          >
            <SvgIcon iconName="question" iconSize={80} />
          </Animated.View>
        )}

        {step === 3 && (
          <Animated.View style={styles.showSelected} entering={FadeIn}>
            <Image
              source={offerMap[localOfferId].image}
              style={styles.selectedImage}
            />
          </Animated.View>
        )}
      </View>
      <Text style={[globalStyles.luckiestGuyFamily, styles.userName]}>
        {isMatcher ? matcherInfo?.displayName : userInfo.displayName}
      </Text>
      <View style={styles.winStar}>
        {Array.from({ length: isMatcher ? loseCount : winCount }).map(
          (_, index) => (
            <SvgIcon iconName="star" iconSize={16} key={index} />
          ),
        )}
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  avatar: {
    position: 'absolute',
    top: -40,
    zIndex: 2,
    alignSelf: 'center',
  },
  question: {
    marginTop: 40,
  },
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 210,
    width: 160,
    borderRadius: 27,
    marginBottom: 5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 10,
  },
  rosenBg: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    resizeMode: 'contain',
  },
  selecting: {
    marginTop: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  selectingBg: {
    width: 127,
    height: 127,
    resizeMode: 'contain',
  },
  selectingTextWrapper: {
    position: 'absolute',
    alignSelf: 'center',
  },
  selectingText: {
    fontSize: 24,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
    textShadowColor: '#042E6A',
  },
  showSelected: {
    marginTop: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedImage: {
    height: 100,
    width: 100,
    resizeMode: 'contain',
  },
  userName: {
    fontSize: 24,
    textAlign: 'center',
    color: '#C7CDCF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
    textShadowColor: '#000',
  },
  winStar: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
})

export default React.memo(PKCard)
