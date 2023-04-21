import React, { useRef, useState, useCallback, useEffect } from 'react'
import {
  Animated,
  AppState,
  Easing,
  StyleSheet,
  View,
  Text,
  Dimensions,
} from 'react-native'
import Button from '@/components/Button'
import { globalStyles } from '@/constants'
import LinearGradientText from '@/components/LinearGradientText'
import { useTranslation } from 'react-i18next'
import CountDownComponent from '@/components/CountDownComponent'

const windowHeight = Dimensions.get('window').height

const M2ECard = props => {
  const { t, i18n } = useTranslation()
  const hideCallback = props.onHide
  const [offConfirm, setOffConfirm] = useState(false)
  const [seeResult, setSeeResult] = useState(false)

  // 计时器组件
  const span = useRef(0)
  const timer = useRef()
  const wentBackgroundAt = useRef(0)
  const [hour, setHour] = useState(0)
  const [minute, setMinute] = useState(0)
  const [second, setSecond] = useState(0)

  /**
   * 当前数字位数不足即向数值前面位数补零
   * 例如：
   * <Text>{formatZero(数值,位数)}</Text>
   */
  const YHFormatZero = (num, len) => {
    if (String(num).length > len) {
      return num
    }
    return (Array(len).join(0) + num).slice(-len)
  }

  const startTimer = useCallback(() => {
    span.current = 0
    timer.current = setInterval(updateTimer, 1000)
  }, [])

  const stopTimer = useCallback(() => {
    timer.current && clearInterval(timer.current)
  }, [])

  const updateTimer = () => {
    setHour(Math.floor(span.current / 3600))
    setMinute(Math.floor((span.current % 3600) / 60))
    setSecond(span.current % 60)
    span.current = span.current + 1
  }

  // 保证切后台计时也正确
  const handleAppStateChange = currentAppState => {
    console.log('App state change')
    if (
      currentAppState === 'active' &&
      wentBackgroundAt.current &&
      timer.current
    ) {
      const diff = (Date.now() - wentBackgroundAt.current) / 1000
      span.current = Math.floor(span.current + diff)
    }
    if (currentAppState === 'background') {
      wentBackgroundAt.current = Date.now()
    }
  }

  // 位置信息面板动画
  const m2eCardAnimFrom = {
    translateY: windowHeight / 2,
  }
  const m2eCardAnimTo = {
    translateY: 0,
  }
  const m2eCardY = useRef(
    new Animated.Value(m2eCardAnimFrom.translateY),
  ).current

  const showM2eCard = useCallback(() => {
    Animated.timing(m2eCardY, {
      toValue: m2eCardAnimTo.translateY,
      duration: 150,
      easing: Easing.bezier(0.27, 0.3, 0, 0.98),
      useNativeDriver: true,
    }).start()

    startTimer()
  }, [m2eCardY, m2eCardAnimTo.translateY, startTimer])

  const finishM2e = useCallback(() => {
    setOffConfirm(false)
    setSeeResult(true)
    hideCallback()
    stopTimer()
  }, [hideCallback, stopTimer])

  const hideM2eCard = useCallback(() => {
    Animated.timing(m2eCardY, {
      toValue: m2eCardAnimFrom.translateY,
      duration: 150,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start(() => {
      setSeeResult(false)
    })
  }, [m2eCardY, m2eCardAnimFrom.translateY])

  useEffect(() => {
    if (props.show) {
      showM2eCard()
    }
  }, [props.show, showM2eCard])

  useEffect(() => {
    const appStateSubscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    )

    return () => {
      appStateSubscription.remove()
    }
  }, [])

  const EndBecauseError = useCallback(() => {
    if (props.end) {
      finishM2e()
    }
  }, [finishM2e, props.end])

  return (
    <Animated.View
      style={[
        {
          transform: [{ translateY: m2eCardY }],
        },
        styles.m2eCard,
      ]}
    >
      <View style={styles.m2eData}>
        <View style={styles.m2eDataItem}>
          {props.onHide && (
            <LinearGradientText size={20}>
              {YHFormatZero(hour, 2)}:{YHFormatZero(minute, 2)}:
              {YHFormatZero(second, 2)}
            </LinearGradientText>
          )}
          <Text style={styles.m2eDataLabel}>
            {t('page.alpha.m2ecard.current-m2e-duration')}
          </Text>
        </View>
        <View style={styles.m2eDataItem}>
          <LinearGradientText size={20}>{props.currentEarn}</LinearGradientText>
          <Text style={styles.m2eDataLabel}>
            {t('page.alpha.m2ecard.engy-generated')}
          </Text>
        </View>
        <View style={styles.m2eDataItem}>
          {/* <LinearGradientText size={20}> */}
          <LinearGradientText size={20}>
            <CountDownComponent
              until={props.remainingTime}
              textStyle={styles.countdown}
            />
          </LinearGradientText>
          {/* </LinearGradientText> */}
          <Text style={styles.m2eDataLabel}>
            {t('page.alpha.m2ecard.avatar-remaining-time')}
          </Text>
        </View>
        <View style={styles.m2eDataItem}>
          <LinearGradientText size={20}>
            {props.earningRate} ENGY/Hr
          </LinearGradientText>
          <Text style={styles.m2eDataLabel}>
            {t('page.alpha.m2ecard.current-avatar-performance')}
          </Text>
        </View>
      </View>
      <View style={styles.btnContainer}>
        {!offConfirm && !seeResult && (
          <Button size="large" block onPress={() => setOffConfirm(true)}>
            {t('page.alpha.m2ecard.off')}
          </Button>
        )}
        {offConfirm && !seeResult && (
          <View style={globalStyles.flexRowSpace}>
            <Button
              size="large"
              type="hollow"
              onPress={() => setOffConfirm(false)}
              style={styles.btn}
            >
              {t('page.common.cancel')}
            </Button>
            <Button
              size="large"
              onPress={() => {
                finishM2e()
              }}
              style={styles.btn}
            >
              {t('page.common.confirm')}
            </Button>
          </View>
        )}
        {seeResult && (
          <View style={[globalStyles.flexRowSpace, styles.centerBtn]}>
            <Button
              size="large"
              onPress={() => {
                hideM2eCard()
              }}
              style={styles.centerBtn}
            >
              {t('page.common.confirm')}
            </Button>
          </View>
        )}
      </View>
    </Animated.View>
  )
}

export default React.memo(M2ECard)

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: '100%',
    bottom: 0,
    left: 0,
    overflow: 'hidden',
  },
  centerBtn: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  m2eCardMask: {
    position: 'absolute',
    height: '100%',
    width: '100%',
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  m2eCard: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 20,
    flex: 1,
    backgroundColor: '#232631',
    borderRadius: 30,
    overflow: 'hidden',
    padding: 30,
  },

  m2eData: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  m2eDataItem: {
    width: '50%',
    alignItems: 'center',
    marginBottom: 30,
  },
  m2eDataLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
  },
  countdown: {
    fontSize: 20,
    fontWeight: '700',
    top: 3,
  },
})
