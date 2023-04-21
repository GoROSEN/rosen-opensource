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
import { useSelector } from 'react-redux'
import { globalStyles } from '@/constants'
import SvgIcon from '@/components/SvgIcon'
import Header from '@/components/Header'
import { useLazyGetAssetsListQuery } from '@/services/modules/assets'
import { useTranslation } from 'react-i18next'
const windowWidth = Dimensions.get('window').width
const itemWidth = (windowWidth - 48) / 2 - 10

function assetsReducer(state, action) {
  switch (action.type) {
    case 'ADD':
      return state.concat(action.payload)
    case 'CLEAR':
      return []
    default:
      return state
  }
}

const Assets = props => {
  const { t, i18n } = useTranslation()
  const publicKey = useSelector(state => state.authPubKey.sol)
  const navigation = useNavigation()
  const [fetchAssetsTrigger, { isFetching }] = useLazyGetAssetsListQuery()
  const [assetsList, dispatch] = React.useReducer(assetsReducer, [])
  const queryPage = React.useRef(1)
  const [pageLoadingFull, setPageLoadingFull] = React.useState(false)
  // 获取数据
  const loadData = React.useCallback(
    params => {
      fetchAssetsTrigger({ page: params.page, walletAddress: publicKey }).then(
        result => {
          console.log(result)
          if (params.page >= result.data.totalPages) {
            setPageLoadingFull(true)
          } else {
            setPageLoadingFull(false)
          }
          dispatch({ type: 'ADD', payload: result.data.assets })
        },
      )
    },
    [fetchAssetsTrigger, publicKey],
  )

  // 上拉加载更多数据
  const handleLoadMore = () => {
    if (!pageLoadingFull && !isFetching) {
      queryPage.current = queryPage.current + 1
      loadData({
        page: queryPage.current,
      })
    }
  }

  React.useEffect(() => {
    // 将分页重置为1
    queryPage.current = 1

    // 清空列表
    dispatch({ type: 'CLEAR' })

    // 获取数据
    loadData({ page: 1 })
  }, [loadData])

  const listFooter = () => {
    let end = null

    if (isFetching) {
      end = (
        <View style={styles.loading}>
          <ActivityIndicator color="#0CC4FF" />
        </View>
      )
    } else {
      if (assetsList.length === 0) {
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
      <Header title={t('page.personalcell.assets.digital-assets')} />
      <FlatList
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        data={assetsList}
        numColumns={2}
        columnWrapperStyle={styles.assetsItemWrapper}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            key={index}
            activeOpacity={0.8}
            style={styles.assetsItem}
          >
            <Image
              defaultSource={globalStyles.defaultImage}
              source={{ uri: item.imageUrl }}
              style={styles.assetsItemImage}
            />
          </TouchableOpacity>
        )}
        ListFooterComponent={listFooter}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  assetsItem: {
    borderRadius: 24,
    overflow: 'hidden',
    width: itemWidth,
    height: itemWidth,
  },
  assetsItemImage: {
    width: '100%',
    height: '100%',
  },
  assetsItemWrapper: {
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

export default React.memo(Assets)
