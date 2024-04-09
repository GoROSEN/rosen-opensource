import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, StyleSheet, ImageBackground, Image } from 'react-native'
import Animated, {
  Easing,
  ZoomIn,
  FadeIn,
  SlideInUp,
  SlideInDown,
} from 'react-native-reanimated'
import { useTranslation } from 'react-i18next'
import CountDownComponent from '@/components/CountDownComponent'
import { globalStyles } from '@/constants'

type Props = {
  status: string
  onClose: () => void
}

type Result = {
  [key: string]: {
    bgImage: number
    tagImage: number
  }
}

const ResultMap: Result = {
  win: {
    bgImage: require('@/assets/images/games/rps/pk_round_result_win_bg.png'),
    tagImage: require('@/assets/images/games/rps/pk_round_result_win.png'),
  },
  lose: {
    bgImage: require('@/assets/images/games/rps/pk_round_result_lose_bg.png'),
    tagImage: require('@/assets/images/games/rps/pk_round_result_lose.png'),
  },
  draw: {
    bgImage: require('@/assets/images/games/rps/pk_round_result_draw_bg.png'),
    tagImage: require('@/assets/images/games/rps/pk_round_result_draw.png'),
  },
}

const RoundResult: React.FC<Props> = props => {
  const { t } = useTranslation()
  const { status, onClose } = props

  return (
    <View style={[StyleSheet.absoluteFill, styles.container]}>
      <Animated.View
        style={styles.roundResultBgAnimated}
        entering={ZoomIn.delay(500)
          .easing(Easing.inOut(Easing.quad))
          .duration(250)}
      >
        <Image
          style={styles.roundResultBgImage}
          source={ResultMap[status].bgImage}
        />
      </Animated.View>
      <Animated.View
        style={styles.roundResultImageAnimated}
        entering={ZoomIn.delay(600)
          .easing(Easing.inOut(Easing.quad))
          .duration(250)}
      >
        <Image
          style={styles.roundResultImage}
          source={ResultMap[status].tagImage}
        />
      </Animated.View>

      <Animated.View
        style={styles.roundResultCountDownAnimated}
        entering={FadeIn.delay(700).duration(250)}
      >
        <Text style={styles.enterNextRound}>Enter the next round after</Text>

        <CountDownComponent
          showSecondsOnly
          until={3}
          textStyle={[globalStyles.lilitaOneFamily, styles.countdown]}
          onFinish={onClose}
        />

        <Text style={styles.countdownLabel}>seconds</Text>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roundResultBgAnimated: {
    position: 'absolute',
    alignSelf: 'center',
  },
  roundResultBgImage: {
    height: 773,
    width: 790,
    resizeMode: 'cover',
    alignSelf: 'center',
  },
  roundResultImageAnimated: {
    position: 'absolute',
    alignSelf: 'center',
  },
  roundResultImage: {
    height: 160,
    width: 250,
    resizeMode: 'contain',
  },
  roundResultCountDownAnimated: {
    position: 'absolute',
    bottom: 160,
    alignSelf: 'center',
  },
  enterNextRound: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  countdown: {
    color: '#FFE604',
    fontSize: 60,
    textAlign: 'center',
  },
  countdownLabel: {
    color: '#FFE604',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
})

export default React.memo(RoundResult)
