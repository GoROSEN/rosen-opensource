import React from 'react'
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  View,
  Text,
  TextInput,
  Image,
  ImageBackground,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import TouchIcon from '@/components/TouchIcon'
import SvgIcon from '@/components/SvgIcon'
import {
  useLazyGetFollowerListQuery,
  useLazyGetFollowingListQuery,
} from '@/services/modules/friend'
import { useTranslation } from 'react-i18next'

function friendReducer(state, action) {
  switch (action.type) {
    case 'ADD':
      return state.concat(action.payload)
    case 'CLEAR':
      return []
    default:
      return state
  }
}

const List = props => {
  const { t, i18n } = useTranslation()
  const [fetchFollowerListTrigger] = useLazyGetFollowerListQuery()
  const [fetchFollowingListTrigger] = useLazyGetFollowingListQuery()
  const [friendList, dispatch] = React.useReducer(friendReducer, [])
  const queryPage = React.useRef(1)
  const [curSelectedIndex, setCurSelectedIndex] = React.useState()
  const [pageLoading, setPageLoading] = React.useState(false)
  const [pageLoadingFull, setPageLoadingFull] = React.useState(false)
  const [searchKeyword, setSearchKeyword] = React.useState('')

  const handleKeywordChange = React.useCallback(value => {
    setSearchKeyword(value)
  }, [])

  // 搜索
  const handleSearch = React.useCallback(() => {
    // 清空选中的好友
    setCurSelectedIndex()
    props.onChange && props.onChange()

    // 将分页重置为1
    queryPage.current = 1

    // 清空好友列表
    dispatch({ type: 'CLEAR' })

    // 获取数据
    loadFollowerData({
      type: props.friendType,
      page: 1,
      keyword: searchKeyword,
    })
  }, [loadFollowerData, props, searchKeyword])

  // 切换好友选中状态
  const toggleSelect = React.useCallback(
    index => {
      if (props.onChange) {
        if (curSelectedIndex === index) {
          setCurSelectedIndex(null)
          props.onChange()
        } else {
          setCurSelectedIndex(index)
          props.onChange(friendList[index])
        }
      }
      // 单纯follower/following模式直接点击，不需要选中
      if (props.onPress) {
        props.onPress(friendList[index])
      }
    },
    [curSelectedIndex, friendList, props],
  )

  // 获取数据
  const loadFollowerData = React.useCallback(
    params => {
      const trigger =
        params.type === 1 ? fetchFollowerListTrigger : fetchFollowingListTrigger
      setPageLoading(true)
      trigger({ page: params.page, keyword: params.keyword }).then(result => {
        setPageLoading(false)
        console.log(result)
        if (params.page >= result.data.pager.pageCount) {
          setPageLoadingFull(true)
        } else {
          setPageLoadingFull(false)
        }
        dispatch({ type: 'ADD', payload: result.data.items })
      })
    },
    [fetchFollowerListTrigger, fetchFollowingListTrigger],
  )

  // 上拉加载更多数据
  const handleLoadMore = React.useCallback(() => {
    if (!pageLoadingFull && !pageLoading) {
      setPageLoading(true)
      queryPage.current = queryPage.current + 1
      loadFollowerData({
        type: props.friendType,
        page: queryPage.current,
        keyword: searchKeyword,
      })
    }
  }, [
    loadFollowerData,
    pageLoading,
    pageLoadingFull,
    props.friendType,
    searchKeyword,
  ])

  React.useEffect(() => {
    // 清空选中的好友
    setCurSelectedIndex()
    props.onChange && props.onChange()

    // 将分页重置为1
    queryPage.current = 1

    // 清空好友列表
    dispatch({ type: 'CLEAR' })

    // 获取数据
    loadFollowerData({ type: props.friendType, page: 1, keyword: '' })
  }, [loadFollowerData, props])

  const listFooter = React.useCallback(() => {
    let end = null

    if (pageLoading) {
      end = (
        <View style={styles.loading}>
          <ActivityIndicator color="#0CC4FF" />
        </View>
      )
    } else {
      if (friendList.length === 0) {
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
  }, [friendList.length, pageLoading, pageLoadingFull, t])

  return (
    <FlatList
      showsVerticalScrollIndicator={false}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.3}
      data={friendList}
      ListHeaderComponent={
        <View style={styles.search}>
          <TextInput
            style={styles.searchInput}
            onChangeText={handleKeywordChange}
            onSubmitEditing={handleSearch}
            placeholder={t('page.mint.friend.search')}
            placeholderTextColor="rgba(255,255,255,0.2)"
          />
          <TouchIcon
            iconName="search"
            iconSize={24}
            onPress={handleSearch}
            style={[styles.searchIcon]}
          />
        </View>
      }
      renderItem={({ item, index }) => (
        <TouchableOpacity
          style={styles.resultItem}
          activeOpacity={1}
          key={item.id}
          onPress={() => {
            toggleSelect(index)
          }}
        >
          {curSelectedIndex === index && (
            <LinearGradient
              start={{ x: 0, y: 0.25 }}
              end={{ x: 0.8, y: 1 }}
              colors={['#B04CFF', '#0CC4FF']}
              style={styles.resultItemLinearGradientBg}
            />
          )}
          <Image
            source={{ uri: `${item.avatar}?x-oss-process=style/p_20` }}
            style={styles.userAvatar}
          />
          <Text style={styles.userName}>{item.displayName}</Text>
        </TouchableOpacity>
      )}
      ListFooterComponent={listFooter}
    />
  )
}

const styles = StyleSheet.create({
  search: {
    position: 'relative',
    marginBottom: 20,
  },
  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    height: 50,
    fontSize: 12,
    color: '#fff',
  },
  searchIcon: {
    position: 'absolute',
    right: 20,
    top: 13,
  },

  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#232631',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
  },
  resultItemLinearGradientBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userName: {
    fontSize: 20,
    color: '#fff',
    marginLeft: 20,
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

export default React.memo(List)
