import React, { useCallback } from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Pressable,
  GestureResponderEvent,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import TouchIcon from '@/components/TouchIcon'
import SvgIcon from '@/components/SvgIcon'
import { globalStyles } from '@/constants'
import { useLazyGetNearbyProducerListByPageQuery } from '@/services/modules/producer'

import Header from '@/components/Header'

import type { RootStackParamList } from '@/navigation/RootNavigator'

type ProducerListRequestParams = {
  keyword: string
  page: number
}

function producerListReducer(
  state: API.UserInfo[],
  action: { type: string; payload?: API.UserInfo },
) {
  switch (action.type) {
    case 'UPDATE':
      return state.concat(action.payload || [])
    case 'CLEAR':
      return []
    default:
      return state
  }
}

const screenWidth = Dimensions.get('screen').width

const Search = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'UserSearch'>>()
  const navigation = useNavigation()
  const { t } = useTranslation()
  const [fetchProducerListTrigger, { isFetching }] =
    useLazyGetNearbyProducerListByPageQuery()

  const queryPage = React.useRef(1)
  const [keyword, setKeyword] = React.useState(route.params.keyword || '')
  const [producerList, dispatch] = React.useReducer(producerListReducer, [])
  const [pageLoadingFull, setPageLoadingFull] = React.useState(false)

  // 获取数据
  const loadData = React.useCallback(
    (params: ProducerListRequestParams) => {
      fetchProducerListTrigger({
        keyword: params.keyword,
        page: params.page,
      }).then(result => {
        if (params.page >= result.data.pager.pageCount) {
          setPageLoadingFull(true)
        } else {
          setPageLoadingFull(false)
        }

        if (params.keyword) {
          dispatch({ type: 'UPDATE', payload: result.data.items })
        }
      })
    },
    [fetchProducerListTrigger],
  )

  const handleChat = (e: GestureResponderEvent, id: number) => {
    e.stopPropagation()
    navigation.navigate('ChatP2P', { id: id })
  }

  // 搜索
  const handleSearch = React.useCallback(() => {
    // 清空数据
    dispatch({ type: 'CLEAR' })
    queryPage.current = 1

    // 获取数据
    loadData({
      page: 1,
      keyword: keyword,
    })
  }, [keyword, loadData])

  const handleKeywordChange = React.useCallback((value: string) => {
    setKeyword(value)
  }, [])

  // 上拉加载更多数据
  const handleLoadMore = React.useCallback(() => {
    if (!pageLoadingFull && !isFetching) {
      queryPage.current = queryPage.current + 1
      loadData({
        page: queryPage.current,
        keyword: keyword,
      })
    }
  }, [isFetching, keyword, loadData, pageLoadingFull])

  const listFooter = React.useCallback(() => {
    let end = null

    if (isFetching) {
      end = (
        <View style={styles.loading}>
          <ActivityIndicator color="#0CC4FF" />
        </View>
      )
    } else {
      if (producerList.length === 0) {
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
  }, [isFetching, pageLoadingFull, producerList.length, t])

  // 初始化数据
  React.useEffect(() => {
    // 清空数据
    dispatch({ type: 'CLEAR' })

    loadData({
      page: 1,
      keyword: route.params.keyword,
    })
  }, [loadData, route.params.keyword])

  const headerRightPart = useCallback(() => {
    return (
      <View style={styles.search}>
        <TextInput
          value={keyword}
          style={styles.searchInput}
          onChangeText={handleKeywordChange}
          onSubmitEditing={handleSearch}
          placeholder={t('page.friends.search.placeholder') as string}
          placeholderTextColor="rgba(255,255,255,0.2)"
        />
        <TouchIcon
          iconName="search"
          iconSize={18}
          onPress={handleSearch}
          style={styles.searchIcon}
        />
      </View>
    )
  }, [handleKeywordChange, handleSearch, keyword, t])

  return (
    <SafeAreaView
      style={[globalStyles.container, globalStyles.containerPadding]}
    >
      <Header rightPart={headerRightPart()} />
      <FlatList
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        data={producerList}
        ListHeaderComponent={
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsHeaderTitle}>
              {t('page.common.results')}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[globalStyles.flexRowSpace, styles.resultItem]}
            activeOpacity={0.9}
            key={item.id}
            onPress={() => {
              navigation.navigate('PersonalCell', { id: item.id })
            }}
          >
            <View style={styles.userInfo}>
              <Image
                source={{ uri: `${item.avatar}?x-oss-process=style/p_20` }}
                style={styles.userAvatar}
              />
              <Text
                style={styles.userName}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.displayName}
              </Text>
            </View>

            <Pressable
              hitSlop={20}
              onPress={e => {
                handleChat(e, item.id)
              }}
            >
              <SvgIcon iconName="chat" iconSize={18} />
            </Pressable>
          </TouchableOpacity>
        )}
        ListFooterComponent={listFooter}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  header: {
    position: 'absolute',
    top: 30,
    left: 0,
    right: 0,
    backgroundColor: '#000',
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  search: {
    position: 'relative',
  },
  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    paddingVertical: 5,
    paddingHorizontal: 15,
    height: 30,
    width: screenWidth - 100,
    fontSize: 12,
    color: '#fff',
  },
  searchIcon: {
    position: 'absolute',
    right: 15,
    top: 6,
  },

  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 17,
  },
  resultsHeaderTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },

  resultLoading: {
    flex: 1,
    paddingVertical: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultItem: {
    backgroundColor: '#232631',
    padding: 13,
    borderRadius: 20,
    marginBottom: 20,
  },
  userInfo: {
    width: '80%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 20,
  },
  userName: {
    color: '#fff',
    fontSize: 20,
  },

  loading: {
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingFull: {
    paddingVertical: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingFullText: {
    color: 'rgba(255,255,255,0.4)',
  },
  resultEmpty: {
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultEmptyText: {
    color: 'rgba(255,255,255,0.4)',
  },
})

export default React.memo(Search)
