import React from 'react'
import { StyleSheet, View, Text } from 'react-native'

type PageProps = {
  /** 未读消息数量 */
  unreadCount: number
}

const UnreadCount: React.FC<PageProps> = props => {
  return (
    <View style={styles.unreadCount}>
      <Text style={styles.unreadCountText}>
        {props.unreadCount >= 100 ? '99+' : props.unreadCount}
      </Text>
    </View>
  )
}

export default React.memo(UnreadCount)

const styles = StyleSheet.create({
  unreadCount: {
    backgroundColor: '#FF3A33',
    borderColor: '#000',
    borderWidth: 1,
    borderStyle: 'solid',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 2,
  },
  unreadCountText: {
    color: '#fff',
    fontSize: 8,
  },
})
