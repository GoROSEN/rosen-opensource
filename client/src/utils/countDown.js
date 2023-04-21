import React, { useCallback } from 'react'
import { StyleSheet, View, Text } from 'react-native'

const CountDown = props => {
  const time = React.useRef(parseInt(props.seconds))
  const formattedTime = React.useRef('')
  const timer = React.useRef()
  startTimer(timer, time, formattedTime)
  return formattedTime.current
}

const startTimer = (timer, time, formattedTime) => {
  timer.current = setInterval(() => {
    formattedTime.current = timeFilter(time.current)
    time.current = time.current - 1
  }, 1000)
}

const stopTimer = timer => {
  timer.current && clearInterval(timer.current)
}

const timeFilter = seconds => {
  var ss = parseInt(seconds) // 秒
  var mm = 0 // 分
  var hh = 0 // 小时
  if (ss > 60) {
    mm = parseInt(ss / 60)
    ss = parseInt(ss % 60)
  }
  if (mm > 60) {
    hh = parseInt(mm / 60)
    mm = parseInt(mm % 60)
  }
  var result = ('00' + parseInt(ss)).slice(-2)
  if (mm > 0) {
    result = ('00' + parseInt(mm)).slice(-2) + ':' + result
  } else {
    result = '00:' + result
  }
  if (hh > 0) {
    result = ('00' + parseInt(hh)).slice(-2) + ':' + result
  }
  return result
}

export default CountDown
