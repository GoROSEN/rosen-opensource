import React, {
  useState,
  useReducer,
  useRef,
  useCallback,
  useEffect,
} from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { globalStyles } from '@/constants'
import Header from '@/components/Header'
import SvgIcon from '@/components/SvgIcon'
import moment from 'moment'
import {
  useLazyGetNotificationListQuery,
  useSetNotificationReadMutation,
} from '@/services/modules/notification'

type FollowerRequestParams = {
  page: number
}

function notificationReducer(
  state: API.Notification[],
  action: { type: string; payload?: API.Notification },
) {
  let list: API.Notification[] = []
  switch (action.type) {
    case 'ADD':
      return state.concat(action.payload || [])
    case 'UPDATE':
      state.forEach((item: API.Notification) => {
        if (item.id === action.payload?.id) {
          list.push(Object.assign({}, item, { unread: false }))
        } else {
          list.push(item)
        }
      })
      state = list
      return state
    case 'CLEAR':
      return []
    default:
      return state
  }
}

const Notifications = () => {
  const [fetchNotificationListTrigger, { isFetching }] =
    useLazyGetNotificationListQuery()
  const [fetchSetNotificationReadTrigger] = useSetNotificationReadMutation()

  const [notificationList, notificationListDispatch] = useReducer(
    notificationReducer,
    [],
  )
  const queryPage = useRef(1)
  const [pageLoadingFull, setPageLoadingFull] = useState(false)

  // 获取数据
  const loadFollowerData = useCallback(
    async (params: FollowerRequestParams) => {
      const result = await fetchNotificationListTrigger({ page: params.page })
      if (params.page >= result.data.pager.pageCount) {
        setPageLoadingFull(true)
      } else {
        setPageLoadingFull(false)
      }
      notificationListDispatch({ type: 'ADD', payload: result.data.items })
    },
    [fetchNotificationListTrigger],
  )

  // 设置为已读
  const setRead = useCallback(
    async (item: API.Notification) => {
      if (item.unread) {
        const readRes = await fetchSetNotificationReadTrigger({
          id: item.id,
        })
        if ('data' in readRes) {
          if (readRes.data.code === 20000) {
            notificationListDispatch({
              type: 'UPDATE',
              payload: { id: item.id } as API.Notification,
            })
          }
        }
      }
    },
    [fetchSetNotificationReadTrigger],
  )

  // 上拉加载更多数据
  const handleLoadMore = useCallback(() => {
    if (!pageLoadingFull && !isFetching) {
      queryPage.current = queryPage.current + 1
      loadFollowerData({
        page: queryPage.current,
      })
    }
  }, [isFetching, loadFollowerData, pageLoadingFull])

  useEffect(() => {
    // 将分页重置为1
    queryPage.current = 1

    // 清空列表
    notificationListDispatch({ type: 'CLEAR' })

    // 获取数据
    loadFollowerData({ page: 1 })
  }, [loadFollowerData])

  const listFooter = useCallback(() => {
    let end = null

    if (isFetching) {
      end = (
        <View style={styles.loading}>
          <ActivityIndicator color="#0CC4FF" />
        </View>
      )
    } else {
      if (notificationList.length === 0) {
        end = (
          <View style={styles.resultEmpty}>
            <SvgIcon iconName="nodata" iconSize={160} />
          </View>
        )
      } else {
        if (pageLoadingFull) {
          end = (
            <View style={styles.loadingFull}>
              <Text style={styles.loadingFullText}>The End</Text>
            </View>
          )
        }
      }
    }

    return end
  }, [notificationList.length, isFetching, pageLoadingFull])

  return (
    <SafeAreaView
      style={[globalStyles.container, globalStyles.containerPadding]}
    >
      <Header title="Notifications" />
      <FlatList
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        data={notificationList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.resultItem}
            activeOpacity={1}
            key={item.id}
            onPress={() => {
              setRead(item)
            }}
          >
            {item.unread && <View style={styles.unreadMarker} />}
            <View style={styles.resultItemHead}>
              <Text style={styles.notificationTitle}>{item.title}</Text>
              <Text style={styles.notificationTime}>
                {moment(item.time).format('YYYY/MM/DD HH:mm')}
              </Text>
            </View>
            <View>
              <Text style={styles.notificationContent}>{item.content}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListFooterComponent={listFooter}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  resultItem: {
    backgroundColor: '#232631',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
  },
  unreadMarker: {
    position: 'absolute',
    left: 7,
    top: 27,
    backgroundColor: '#ff0000',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  resultItemHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  notificationTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  notificationTime: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
  notificationContent: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },

  resultEnd: {
    // position: 'absolute',
    // bottom: 10,
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

export default Notifications
