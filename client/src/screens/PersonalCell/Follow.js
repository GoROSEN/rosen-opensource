import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { globalStyles } from '@/constants'
import Header from '@/components/Header'
import List from '@/screens/Friend/List'
import { useTranslation } from 'react-i18next'

const Follow = ({ navigation, route }) => {
  const { t, i18n } = useTranslation()
  const handleFriendPress = React.useCallback(
    item => {
      if (item?.id) {
        navigation.push('PersonalCell', { id: item.id })
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
      <List friendType={route.params.friendType} onPress={handleFriendPress} />
    </SafeAreaView>
  )
}

export default React.memo(Follow)
