import React from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { globalStyles } from '@/constants'
import Header from '@/components/Header'
import List from './FollowListCore'

import type { RootStackParamList } from '@/navigation/RootNavigator'

const Follow = () => {
  const navigation = useNavigation()
  const route = useRoute<RouteProp<RootStackParamList, 'Follow'>>()
  const { t } = useTranslation()
  const handleFriendPress = React.useCallback(
    (item: API.UserInfo) => {
      if (item?.id) {
        navigation.navigate('PersonalCell', { id: item.id })
      }
    },
    [navigation],
  )

  return (
    <SafeAreaView
      style={[globalStyles.container, globalStyles.containerPadding]}
    >
      <Header
        title={
          route.params.friendType === 1
            ? `${t('page.common.followers')}`
            : `${t('page.common.followings')}`
        }
      />
      <List
        chat={true}
        friendType={route.params.friendType}
        onPress={handleFriendPress}
      />
    </SafeAreaView>
  )
}

export default React.memo(Follow)
