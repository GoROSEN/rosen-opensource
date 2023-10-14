import React, { useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AvatarAnimation from './AvatarAnimation'
import VSAnimation from './VSAnimation'

type Props = {
  matcherInfo: API.UserInfo
  onStart: () => void
}

const Start: React.FC<Props> = props => {
  const insets = useSafeAreaInsets()
  const { matcherInfo, onStart } = props

  useEffect(() => {
    setTimeout(() => {
      onStart()
    }, 2500)
  }, [onStart])

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40 }]}>
      <AvatarAnimation matcherInfo={matcherInfo} />

      <VSAnimation />

      <AvatarAnimation />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 20,
  },
  avatar: {
    position: 'relative',
  },
  userName: {
    fontSize: 24,
    textAlign: 'center',
    color: '#C7CDCF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
    textShadowColor: '#000',
  },
})

export default React.memo(Start)
