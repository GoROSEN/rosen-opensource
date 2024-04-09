import React from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  View,
  Text,
  ImageBackground,
  FlatList,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { SafeAreaView } from 'react-native-safe-area-context'
import { globalStyles } from '@/constants'
import Header from '@/components/Header'
import Avatar from '@/components/Avatar'
import SvgIcon from '@/components/SvgIcon'

import { useLazyGetFollowerListQuery } from '@/services/modules/friend'

function recordReducer(state, action) {
  switch (action.type) {
    case 'ADD':
      return state.concat(action.payload)
    case 'CLEAR':
      return []
    default:
      return state
  }
}

const BattleRecord = () => {
  const { t } = useTranslation()

  const [fetchFollowerListTrigger] = useLazyGetFollowerListQuery()
  const [recordList, dispatch] = React.useReducer(recordReducer, [])
  const queryPage = React.useRef(1)
  const [pageLoading, setPageLoading] = React.useState(false)
  const [pageLoadingFull, setPageLoadingFull] = React.useState(false)

  // 获取数据
  const loadFollowerData = React.useCallback(
    (params: Record<string, any>) => {
      setPageLoading(true)

      setTimeout(() => {
        dispatch({ type: 'ADD', payload: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] })
        setPageLoading(false)
        setPageLoadingFull(true)
      }, 1000)

      // fetchFollowerListTrigger({ page: params.page }).then(result => {
      //   setPageLoading(false)
      //   if (params.page >= result.data.pager.pageCount) {
      //     setPageLoadingFull(true)
      //   } else {
      //     setPageLoadingFull(false)
      //   }
      //   dispatch({ type: 'ADD', payload: result.data.items })
      // })
    },
    [fetchFollowerListTrigger],
  )

  // 上拉加载更多数据
  const handleLoadMore = React.useCallback(() => {
    if (!pageLoadingFull && !pageLoading) {
      setPageLoading(true)
      queryPage.current = queryPage.current + 1
      loadFollowerData({
        page: queryPage.current,
      })
    }
  }, [loadFollowerData, pageLoading, pageLoadingFull])

  const listFooter = React.useCallback(() => {
    let end = null

    if (pageLoading) {
      end = (
        <View style={styles.loading}>
          <ActivityIndicator color="#0CC4FF" />
        </View>
      )
    } else {
      if (recordList.length === 0) {
        end = (
          <View style={styles.resultEmpty}>
            <SvgIcon iconName="nodata" iconSize={160} />
          </View>
        )
      } else {
        if (pageLoadingFull) {
          end = (
            <View style={styles.loadingFull}>
              <Text style={styles.loadingFullText}>
                {t('page.common.the-end')}
              </Text>
            </View>
          )
        }
      }
    }

    return end
  }, [recordList.length, pageLoading, pageLoadingFull, t])

  React.useEffect(() => {
    // 获取数据
    loadFollowerData({ page: 1 })
  }, [loadFollowerData])

  return (
    <ImageBackground
      source={require('@/assets/images/games/rps/page_bg.jpg')}
      style={styles.containerBg}
    >
      <SafeAreaView style={[styles.container, globalStyles.containerPadding]}>
        <Header
          title={t('page.games.rock-paper-scissors.battle-record')}
          bgColor="transparent"
        />

        <FlatList
          showsVerticalScrollIndicator={false}
          // onEndReached={handleLoadMore}
          // onEndReachedThreshold={0.3}
          data={recordList}
          renderItem={({ item }) => (
            <View style={styles.recordItem}>
              <Avatar size="small" style={styles.recordAvatar} />
              <View style={styles.recordItemInner}>
                <View style={globalStyles.flexRow}>
                  <SvgIcon iconName="win" iconSize={20} />
                  <Text style={styles.recordName}>Summer</Text>
                </View>
                <View style={globalStyles.flexRow}>
                  <SvgIcon iconName="gold_coin" iconSize={20} />
                  <Text style={styles.recordAmount}>200</Text>
                </View>
              </View>
            </View>
          )}
          ListFooterComponent={listFooter}
        />
      </SafeAreaView>
    </ImageBackground>
  )
}

export default React.memo(BattleRecord)

const styles = StyleSheet.create({
  containerBg: {
    position: 'relative',
    flex: 1,
  },
  container: {
    flex: 1,
  },
  recordContainer: {
    paddingVertical: 20,
  },
  recordItem: {
    backgroundColor: 'rgba(0,0,0, 0.2)',
    borderRadius: 20,
    height: 37,
    position: 'relative',
    marginBottom: 20,
  },
  recordItemInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '100%',
    paddingLeft: 50,
    paddingRight: 30,
  },
  recordAvatar: {
    position: 'absolute',
    left: -5,
    top: -5,
  },
  recordName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 5,
  },
  recordAmount: {
    fontSize: 12,
    color: '#fff',
    marginLeft: 5,
  },

  loading: {
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingFull: {
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingFullText: {
    color: 'rgba(255,255,255,0.4)',
  },
  resultEmpty: {
    paddingVertical: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultEmptyText: {
    color: 'rgba(255,255,255,0.4)',
  },
})
