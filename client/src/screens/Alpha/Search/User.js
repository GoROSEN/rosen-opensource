import React from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  View,
  Text,
  TextInput,
  Image,
  ImageBackground,
  TouchableOpacity,
  FlatList,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import TouchIcon from '@/components/TouchIcon'
import SvgIcon from '@/components/SvgIcon'
import { useLazyGetNearbyProducerListByPageQuery } from '@/services/modules/producer'
import { useTranslation } from 'react-i18next'

function producerListReducer(state, action) {
  switch (action.type) {
    case 'UPDATE':
      return state.concat(action.payload)
    case 'CLEAR':
      return []
    default:
      return state
  }
}

const initialCoordinates = {
  latitude: 48.8582602,
  longitude: 2.2944991,
}

const User = props => {
  const { t, i18n } = useTranslation()
  const navigation = useNavigation()
  const [fetchProducerListTrigger, { isFetching }] =
    useLazyGetNearbyProducerListByPageQuery()

  const queryPage = React.useRef(1)
  const [keyword, setKeyword] = React.useState('')
  const [producerList, dispatch] = React.useReducer(producerListReducer, [])
  const [pageLoadingFull, setPageLoadingFull] = React.useState(false)

  // 获取数据
  const loadData = React.useCallback(
    params => {
      fetchProducerListTrigger({
        lat: initialCoordinates.latitude,
        lng: initialCoordinates.longitude,
        radius: 150000,
        keyword: params.keyword,
        page: params.page,
      }).then(result => {
        if (params.page >= result.data.pager.pageCount) {
          setPageLoadingFull(true)
        } else {
          setPageLoadingFull(false)
        }
        dispatch({ type: 'UPDATE', payload: result.data.items })
      })
    },
    [fetchProducerListTrigger],
  )

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

  const handleKeywordChange = React.useCallback(value => {
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
      keyword: '',
    })
  }, [loadData])

  return (
    <FlatList
      showsVerticalScrollIndicator={false}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.3}
      data={producerList}
      ListHeaderComponent={
        <View>
          <View style={styles.search}>
            <TextInput
              style={styles.searchInput}
              onChangeText={handleKeywordChange}
              onSubmitEditing={handleSearch}
              placeholder={t('page.search.user.search-for-user')}
              placeholderTextColor="rgba(255,255,255,0.2)"
            />
            <TouchIcon
              iconName="search"
              iconSize={24}
              onPress={handleSearch}
              style={[styles.searchIcon]}
            />
          </View>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsHeaderTitle}>
              {t('page.common.results')}
            </Text>
          </View>
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.resultItem}
          activeOpacity={0.9}
          key={item.id}
          onPress={() => {
            navigation.navigate('PersonalCell', { id: item.id })
          }}
        >
          <Image
            source={{ uri: `${item.avatar}?x-oss-process=style/p_20` }}
            style={styles.userAvatar}
          />
          <Text style={styles.userName}>{item.name}</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#232631',
    padding: 13,
    borderRadius: 20,
    marginBottom: 20,
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

export default React.memo(User)
