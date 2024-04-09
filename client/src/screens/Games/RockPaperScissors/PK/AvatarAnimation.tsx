import React from 'react'
import { Text, StyleSheet } from 'react-native'
import { useSelector } from 'react-redux'
import Animated, { BounceIn } from 'react-native-reanimated'
import { globalStyles } from '@/constants'
import Avatar from '@/components/Avatar'

type Props = {
  matcherInfo?: API.UserInfo
}

const AvatarAnimation: React.FC<Props> = props => {
  const { matcherInfo } = props
  const userInfo = useSelector(
    (state: Store.RootState) => state.authUser.userInfo,
  )
  return (
    <Animated.View
      entering={BounceIn.delay(500).duration(450)}
      style={styles.container}
    >
      {matcherInfo && (
        <Avatar
          size="xlarge"
          avatarImage={matcherInfo?.avatar}
          equip={matcherInfo?.equip}
        />
      )}
      {!matcherInfo && <Avatar size="xlarge" />}

      <Text style={[globalStyles.luckiestGuyFamily, styles.userName]}>
        {matcherInfo ? matcherInfo?.displayName : userInfo.displayName}
      </Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
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

export default React.memo(AvatarAnimation)
