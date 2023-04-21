import React from 'react'
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { globalStyles } from '@/constants'
import SvgIcon from '@/components/SvgIcon'
import Header from '@/components/Header'
import { useLazyGetGalleryListQuery } from '@/services/modules/member'
import { useTranslation } from 'react-i18next'

const windowWidth = Dimensions.get('window').width
const itemWidth = (windowWidth - 48) / 2 - 10

function galleryReducer(state, action) {
  switch (action.type) {
    case 'ADD':
      return state.concat(action.payload)
    case 'CLEAR':
      return []
    default:
      return state
  }
}

const Gallery = props => {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const [fetchGalleryListTrigger, { isFetching }] = useLazyGetGalleryListQuery()
  const [galleryList, dispatch] = React.useReducer(galleryReducer, [])
  const queryPage = React.useRef(1)
  const [pageLoadingFull, setPageLoadingFull] = React.useState(false)

  // 获取数据
  const loadFollowerData = React.useCallback(
    params => {
      fetchGalleryListTrigger({ page: params.page })
        .unwrap()
        .then(data => {
          if (params.page >= data.pager.pageCount) {
            setPageLoadingFull(true)
          } else {
            setPageLoadingFull(false)
          }
          dispatch({ type: 'ADD', payload: data.items })
        })
        .catch(error => setPageLoadingFull(true))
    },
    [fetchGalleryListTrigger],
  )

  // 上拉加载更多数据
  const handleLoadMore = () => {
    if (!pageLoadingFull && !isFetching) {
      queryPage.current = queryPage.current + 1
      loadFollowerData({
        page: queryPage.current,
      })
    }
  }

  React.useEffect(() => {
    // 将分页重置为1
    queryPage.current = 1

    // 清空好友列表
    dispatch({ type: 'CLEAR' })

    // 获取数据
    loadFollowerData({ page: 1 })
  }, [loadFollowerData])

  const listFooter = () => {
    let end = null

    if (isFetching) {
      end = (
        <View style={styles.loading}>
          <ActivityIndicator color="#0CC4FF" />
        </View>
      )
    } else {
      if (galleryList.length === 0) {
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
  }

  return (
    <SafeAreaView
      style={[globalStyles.container, globalStyles.containerPadding]}
    >
      <Header title={t('page.personalcell.gallery')} />
      <FlatList
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        data={galleryList}
        numColumns={2}
        columnWrapperStyle={styles.galleryItemWrapper}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            key={index}
            activeOpacity={0.8}
            style={styles.galleryItem}
            onPress={() => navigation.navigate('Share', { id: item.id })}
          >
            <Image
              defaultSource={globalStyles.defaultImage}
              source={{ uri: `${item.logo}?x-oss-process=style/p_50` }}
              style={styles.galleryItemImage}
            />
          </TouchableOpacity>
        )}
        ListFooterComponent={listFooter}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  galleryItem: {
    borderRadius: 24,
    overflow: 'hidden',
    width: itemWidth,
    height: itemWidth,
  },
  galleryItemImage: {
    width: '100%',
    height: '100%',
  },
  galleryItemWrapper: {
    justifyContent: 'space-between',
    marginBottom: 20,
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

export default React.memo(Gallery)
