import React, { useState, useRef, useEffect } from 'react'
import { StyleSheet, View, Text, Pressable } from 'react-native'
import Button from '@/components/Button'
import { useLazyGetVerifyCodeQuery } from '@/services/modules/member'
import { useTranslation } from 'react-i18next'

let timer = null
const VerifyCodeBtn = props => {
  const { t, i18n } = useTranslation()
  const [trigger, { isFetching }] = useLazyGetVerifyCodeQuery()
  const [sendCode, setSendCode] = React.useState(false)
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
      setSendCode(false)
    }
  }, [time])

  const getCode = React.useCallback(() => {
    trigger({
      type: props.type,
      dest: props.dest,
      channel: props.channel,
      lang: 'en_US',
    }).then(() => {
      setTime(60)
      setSendCode(true)
    })
  }, [props.channel, props.dest, props.type, trigger])
  const send_code = t('page.loginsignup.verifycodebtn.send-code')
  return (
    <Button
      loading={isFetching}
      disabled={sendCode || !props.dest}
      size="middle"
      onPress={getCode}
      style={styles.btn}
    >
      {time ? `${time}s` : send_code}
    </Button>
  )
}
export default VerifyCodeBtn

const styles = StyleSheet.create({
  btn: {
    width: 140,
  },
})
