import React, { useState, useRef, useEffect } from 'react'
import { StyleSheet, View, Text, Pressable } from 'react-native'
import Button from '@/components/Button'

let timer = null
const VerifyCode = () => {
  const [sendCode, setSendCode] = React.useState(true)
  const [time, setTime] = useState(0)

  useEffect(() => {
    timer && clearInterval(timer)
    return () => timer && clearInterval(timer)
  }, [])

  useEffect(() => {
    if (time === 60) {
      timer = setInterval(() => setTime(time => --time), 1000)
    } else if (time === 0) {
      clearInterval(timer)
      setSendCode(true)
    }
  }, [time])

  const getCode = () => {
    // 作为组件使用
    sendCode && setTime(60)
    setSendCode(false)
  }

  return (
    <Button size="small" style={styles.rectangleView2} onPress={getCode}>
      <Text style={{ color: 'white', textAlign: 'center' }}>
        {time ? `${time}s` : 'Send code'}
      </Text>
    </Button>
  )
}
export default React.memo(VerifyCode)

const styles = StyleSheet.create({
  rectangleView2: {
    position: 'absolute',
    top: 418,
    left: 227,
    borderRadius: 91.74,
    shadowColor: 'rgba(0, 0, 0, 0.25)',
    shadowOffset: {
      width: 0,
      height: 3.669724702835083,
    },
    shadowRadius: 9.17,
    elevation: 9.17,
    shadowOpacity: 1,
    width: 100,
    height: 40,
    justifyContent: 'center',
  },
})
