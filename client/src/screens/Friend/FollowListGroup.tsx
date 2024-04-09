import React from 'react'
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native'
import { useTranslation } from 'react-i18next'
import List from './FollowListCore'

type PageProps = {
  /** 切换好友选中状态 */
  onChange?: (item?: API.UserInfo) => void
  /** 好友点击事件 */
  onPress: (item: API.UserInfo) => void
}

const FollowListGroup: React.FC<PageProps> = props => {
  const [friendType, setFriendType] = React.useState(1)
  const { t } = useTranslation()
  // 切换好友类型
  const toggleFriendType = (type: number) => {
    setFriendType(type)
  }

  return (
    <View style={styles.container}>
      <View style={styles.switch}>
        <TouchableOpacity
          style={[
            styles.switchItem,
            friendType === 1 ? styles.switchItemActive : null,
          ]}
          onPress={() => {
            toggleFriendType(1)
          }}
        >
          <Text
            style={[
              styles.switchItemText,
              friendType === 1 ? styles.switchItemTextActive : null,
            ]}
          >
            {t('page.common.followers')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.switchItem,
            friendType === 2 ? styles.switchItemActive : null,
          ]}
          onPress={() => {
            toggleFriendType(2)
          }}
        >
          <Text
            style={[
              styles.switchItemText,
              friendType === 2 ? styles.switchItemTextActive : null,
            ]}
          >
            {t('page.common.followings')}
          </Text>
        </TouchableOpacity>
      </View>
      <List
        friendType={friendType}
        onChange={props.onChange}
        onPress={props.onPress}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  switch: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 12,
    padding: 7,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  switchItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 46,
    borderRadius: 8,
  },
  switchItemActive: {
    backgroundColor: '#000',
  },
  switchItemText: {
    color: 'rgba(255,255,255,0.1)',
    fontSize: 20,
    fontWeight: '400',
  },
  switchItemTextActive: {
    color: '#fff',
  },
})

export default React.memo(FollowListGroup)
