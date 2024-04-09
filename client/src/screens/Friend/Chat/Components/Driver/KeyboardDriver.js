import { Keyboard, Animated } from 'react-native'

export class KeyboardDriver {
  constructor() {}

  mainY = 0
  senderY = 0
  animation = new Animated.Value(0)

  name = 'keyboard'
  shown = false
  mainAnimateHeight = 0
  senderAnimateHeight = 0

  show = (mainAnimateHeight, senderAnimateHeight, state) => {
    const { driver, setDriver, setMainTranslateY, setSenderTranslateY } = state

    if (driver && driver !== this) {
      // 记录主界面当前位置
      this.mainY = driver.shown ? driver.mainAnimateHeight : 0
      this.senderY = driver.shown ? driver.senderAnimateHeight : 0
      // 隐藏前一个 driver
      driver.hide({
        driver: this,
        setDriver,
        setMainTranslateY,
        setSenderTranslateY,
      })
    }

    this.mainAnimateHeight = mainAnimateHeight
    this.senderAnimateHeight = senderAnimateHeight
    this.shown = true
    setDriver(this)
    setMainTranslateY(this.mainTranslateY)
    setSenderTranslateY(this.senderTranslateY)

    Animated.timing(this.animation, {
      toValue: this.senderAnimateHeight,
      duration: 200,
      useNativeDriver: true,
    }).start()
  }

  hide = state => {
    Keyboard.dismiss()
    const { driver, setDriver, setMainTranslateY, setSenderTranslateY } = state

    this.shown = false
    this.mainY = 0
    this.senderY = 0

    if (driver === this) {
      setDriver(undefined)
      setMainTranslateY(this.mainTranslateY)
      setSenderTranslateY(this.senderTranslateY)
      Animated.timing(this.animation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start()
    } else {
      this.animation.setValue(0)
    }
  }

  resetMainAnimateHeight = (mainAnimateHeight, state) => {
    const { setMainTranslateY } = state
    if (mainAnimateHeight === 0) {
      return
    }

    this.mainY = this.mainAnimateHeight
    this.mainAnimateHeight = mainAnimateHeight

    const mainAnimation = new Animated.Value(0)

    setMainTranslateY(
      mainAnimation.interpolate({
        inputRange: [0, mainAnimateHeight],
        outputRange: [-this.mainY, -this.mainAnimateHeight],
        extrapolate: 'clamp',
      }),
    )
    Animated.timing(mainAnimation, {
      toValue: mainAnimateHeight,
      duration: 200,
      useNativeDriver: true,
    }).start()
  }

  get mainTranslateY() {
    // console.log(
    //   this.name,
    //   'height',
    //   this.height,
    //   'y',
    //   this.y,
    //   'extraHeight',
    //   extraHeight,
    // )

    if (!this.shown || this.mainY === 0) {
      return this.animation.interpolate({
        inputRange: [0, this.senderAnimateHeight],
        outputRange: [0, -this.mainAnimateHeight],
        extrapolate: 'clamp',
      })
    } else {
      return this.animation.interpolate({
        inputRange: [0, this.senderAnimateHeight],
        outputRange: [-this.mainY, -this.mainAnimateHeight],
        extrapolate: 'clamp',
      })
    }
  }

  get senderTranslateY() {
    if (!this.shown || this.senderY === 0) {
      return this.animation.interpolate({
        inputRange: [0, this.senderAnimateHeight],
        outputRange: [0, -this.senderAnimateHeight],
        extrapolate: 'clamp',
      })
    } else {
      return this.animation.interpolate({
        inputRange: [0, this.senderAnimateHeight],
        outputRange: [-this.senderY, -this.senderAnimateHeight],
        extrapolate: 'clamp',
      })
    }
  }
}
