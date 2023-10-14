import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
  FadeIn,
} from 'react-native-reanimated'
import { useTranslation } from 'react-i18next'
import { globalStyles } from '@/constants'
import CountDownComponent from '@/components/CountDownComponent'
import Avatar from '@/components/Avatar'
import Button from '../Components/Button'

type Props = {
  matcherInfo: API.UserInfo
  onMatchSuccessConfirm: () => void
}

const MatchSuccess: React.FC<Props> = props => {
  const { t } = useTranslation()
  const { matcherInfo, onMatchSuccessConfirm } = props

  const [visible, setVisible] = useState(false)

  const avatarZoomAnimatedValue = useSharedValue(1.5)
  const avatarTranslateYAnimatedValue = useSharedValue(30)
  const avatarZoomAnimatedStyles = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: avatarZoomAnimatedValue.value,
        },
        {
          translateY: avatarTranslateYAnimatedValue.value,
        },
      ],
    }
  })

  useEffect(() => {
    avatarZoomAnimatedValue.value = withDelay(
      1500,
      withTiming(1.1, { duration: 350, easing: Easing.ease }, isFinished => {
        if (isFinished) {
          runOnJS(setVisible)(true)
        }
      }),
    )
    avatarTranslateYAnimatedValue.value = withDelay(
      2000,
      withTiming(20, {
        duration: 250,
        easing: Easing.ease,
      }),
    )
  }, [avatarZoomAnimatedValue, avatarTranslateYAnimatedValue])

  const handleConfirm = useCallback(() => {
    onMatchSuccessConfirm()
  }, [onMatchSuccessConfirm])

  return (
    <Animated.View style={styles.matchSuccess} entering={FadeIn}>
      <Text style={styles.matcerName}>{matcherInfo.displayName}</Text>
      <Animated.View style={avatarZoomAnimatedStyles}>
        <Avatar
          size="xlarge"
          avatarImage={matcherInfo.avatar}
          equip={matcherInfo.equip}
        />
      </Animated.View>
      {visible && (
        <Animated.View style={styles.matherResult} entering={FadeIn.delay(500)}>
          <Text style={styles.matherGamesInfoText}>
            The Blazer has participated in 3 games this month, with a winning
            rate of 90%
          </Text>

          <View style={styles.countdown}>
            <Text style={styles.countdownLabel}>Countdown</Text>
            <CountDownComponent
              showSecondsOnly
              until={40}
              textStyle={[globalStyles.lilitaOneFamily, styles.countdownText]}
              onFinish={handleConfirm}
            />
            <Text style={styles.countdownSymbol}>
              {t('page.common.seconds')}
            </Text>
          </View>

          <Button size="medium" onPress={handleConfirm}>
            Ready Go!
          </Button>
        </Animated.View>
      )}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  matchSuccess: {
    alignItems: 'center',
  },
  matcerName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  matherResult: {
    alignItems: 'center',
  },
  matherGamesInfoText: {
    marginTop: 30,
    marginBottom: 15,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  countdown: {
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  countdownLabel: {
    fontSize: 12,
    marginRight: 5,
  },
  countdownText: {
    fontSize: 20,
    color: '#FFE604',
    marginRight: 3,
  },
  countdownSymbol: {
    fontSize: 12,
    fontWeight: 'bold',
  },
})

export default React.memo(MatchSuccess)
