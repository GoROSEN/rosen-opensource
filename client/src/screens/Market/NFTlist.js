import React, { useCallback } from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  View,
  Text,
  Pressable,
  Image,
  FlatList,
} from 'react-native'
import SvgIcon from '@/components/SvgIcon'
import { useLazyGetNFTMarketListQuery } from '@/services/modules/market'
import Button from '@/components/Button'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'

function NFTReducer(state, action) {
  switch (action.type) {
    case 'ADD':
      return state.concat(action.payload)
    case 'CLEAR':
      return []
    default:
      return state
  }
}

const M2Eimgs = [
  {
    img: require('@/assets/images/avatar_default_bg.png'),
    icon: require('@/assets/images/equipment_thumbnail_01.png'),
    marketItem: require('@/assets/images/NFTMarketplaceItem0.png'),
  },
  {
    img: require('@/assets/images/frog1.png'),
    icon: require('@/assets/images/equipment_thumbnail_02.png'),
    marketItem: require('@/assets/images/NFTMarketplaceItem1.png'),
  },
  {
    img: require('@/assets/images/frog2.png'),
    icon: require('@/assets/images/equipment_thumbnail_03.png'),
    marketItem: require('@/assets/images/NFTMarketplaceItem2.png'),
  },
]

const List = props => {
  const { t, i18n } = useTranslation()
  const [fetchNFTListTrigger] = useLazyGetNFTMarketListQuery()
  const [NFTList, dispatch] = React.useReducer(NFTReducer, [])
  const queryPage = React.useRef(1)
  const queryId = React.useRef(1)
  const [pageLoading, setPageLoading] = React.useState(false)
  const [pageLoadingFull, setPageLoadingFull] = React.useState(false)
  const navigation = useNavigation()

  // 获取数据
  const loadNFTList = React.useCallback(
    params => {
      setPageLoading(true)
      fetchNFTListTrigger({ id: params.id, page: params.page }).then(result => {
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
    [fetchNFTListTrigger],
  )

  // 上拉加载更多数据
  const handleLoadMore = useCallback(() => {
    if (!pageLoadingFull && !pageLoading) {
      setPageLoading(true)
      queryPage.current = queryPage.current + 1
      loadNFTList({
        id: queryId.current,
        page: queryPage.current,
      })
    }
  }, [loadNFTList, pageLoading, pageLoadingFull])

  React.useEffect(() => {
    // 将分页重置为1
    queryPage.current = 1

    // 清空列表
    dispatch({ type: 'CLEAR' })
    console.log('update')
    // 获取数据
    loadNFTList({ id: queryId.current, page: queryPage.current })
  }, [loadNFTList])

  const listFooter = useCallback(() => {
    let end = null

    if (pageLoading) {
      end = (
        <View style={styles.loading}>
          <ActivityIndicator color="#0CC4FF" />
        </View>
      )
    } else {
      if (NFTList.length === 0) {
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
  }, [NFTList.length, pageLoading, pageLoadingFull, t])

  return (
    <FlatList
      showsVerticalScrollIndicator={false}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.3}
      data={NFTList}
      numColumns={2}
      key={item => item.id}
      renderItem={({ item, index }) => (
        <View style={styles.itemContainer}>
          <Pressable
            onPress={() => {
              navigation.navigate('NFTDetails', {
                item: item,
                image: M2Eimgs[Number(item.image)].marketItem,
              })
            }}
          >
            <Image
              source={M2Eimgs[Number(item.image)].marketItem}
              style={styles.marketNFT}
              resizeMode="contain"
            />
          </Pressable>
          <View style={styles.infoWrapper}>
            <View style={styles.priceContainer}>
              {/* <Text style={styles.price}>{item.price}</Text>
              <Text style={styles.coin}>ROS</Text> */}
            </View>
            <Button size={'small'} style={styles.buttonSize} disabled={true}>
              {t('page.common.coming-soon')}
            </Button>
          </View>
        </View>
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
  buttonSize: {
    height: 22,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemContainer: {
    width: 154,
    height: 218,
    overflow: 'hidden',
    marginHorizontal: 10,
  },
  price: {
    color: 'white',
    fontWeight: '700',
    fontSize: 24,
  },
  coin: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
    alignSelf: 'flex-end',
    bottom: 3,
    marginLeft: 3,
  },
  marketNFT: {
    width: 154,
    height: 177,
    marginBottom: 10,
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
