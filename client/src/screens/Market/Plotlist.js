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
import {
  useLazyGetPlotMarketListQuery,
  useBuyListedPlotMutation,
} from '@/services/modules/market'
import Button from '@/components/Button'
import { useNavigation } from '@react-navigation/native'
import CountDownComponent from '@/components/CountDownComponent'
import { useTranslation } from 'react-i18next'
import ModalComp from '@/components/Popup'

function PlotReducer(state, action) {
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
  const [popupVis, setpopupVis] = React.useState(false)
  const [popupContent, setPopupContent] = React.useState('')
  const { t, i18n } = useTranslation()
  const [fetchPlotListTrigger] = useLazyGetPlotMarketListQuery()
  const [buyPlotTrigger, { isLoading: isBuyFetching }] =
    useBuyListedPlotMutation()
  const [NFTList, dispatch] = React.useReducer(PlotReducer, [])
  const queryPage = React.useRef(1)
  const [pageLoading, setPageLoading] = React.useState(false)
  const [pageLoadingFull, setPageLoadingFull] = React.useState(false)
  const [time, setTime] = React.useState(0)
  const navigation = useNavigation()

  const closePopUp = useCallback(() => {
    setpopupVis(false)
  }, [])

  // 获取数据
  const loadPlotList = React.useCallback(
    params => {
      setPageLoading(true)
      fetchPlotListTrigger({ id: params.id, page: params.page }).then(
        result => {
          setTime(parseInt(result.startedTimeStamp / 1000))
          setPageLoading(false)
          console.log(result)
          if (params.page >= result.data.pager.pageCount) {
            setPageLoadingFull(true)
          } else {
            setPageLoadingFull(false)
          }
          dispatch({ type: 'ADD', payload: result.data.items })
        },
      )
    },
    [fetchPlotListTrigger],
  )

  // 上拉加载更多数据
  const handleLoadMore = React.useCallback(() => {
    if (!pageLoadingFull && !pageLoading) {
      setPageLoading(true)
      queryPage.current = queryPage.current + 1
      loadPlotList({
        page: queryPage.current,
      })
    }
  }, [loadPlotList, pageLoading, pageLoadingFull])

  const handleBuy = React.useCallback(
    (id, price) => {
      buyPlotTrigger({ listingId: id }).then(result => {
        if (result.data.code !== 20000) {
          console.log(result.data.msg)
          setpopupVis(false)
          props.showPopUp({
            content: t(result.data.msg, {
              fail: 'Purchase failed',
              item: 'plot',
            }),
          })
        } else {
          setpopupVis(false)
          props.showPopUp({
            content: t('message.buy-plot.success', {
              amount: price,
              token: 'USDT',
            }),
          })
        }
      })
    },
    [buyPlotTrigger, props, t],
  )

  React.useEffect(() => {
    // 将分页重置为1
    queryPage.current = 1

    // 清空列表
    dispatch({ type: 'CLEAR' })
    console.log('update')
    // 获取数据
    loadPlotList({ page: queryPage.current })
  }, [loadPlotList])

  const listFooter = React.useCallback(() => {
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
          <ModalComp
            visible={popupVis}
            content={popupContent}
            confirmButton={() => {
              handleBuy(item.id, item.price)
            }}
            cancelButton={closePopUp}
            isLoading={isBuyFetching}
          />
          <Pressable
            onPress={() => {
              navigation.navigate('PlotDetails', {
                item: item,
              })
            }}
          >
            {item.plot.style === 0 && (
              <Image
                source={{ uri: `${item.plot.logo}?x-oss-process=style/p_50` }}
                style={styles.marketPlot}
                resizeMode="contain"
              />
            )}
            {item.plot.style !== 0 && (
              <View style={styles.marketPlotContainer}>
                <Image
                  source={{ uri: `${item.plot.logo}?x-oss-process=style/p_50` }}
                  style={styles.marketActivityPlot}
                  resizeMode="contain"
                />
              </View>
            )}
          </Pressable>
          <Text style={styles.plotName}>{item.plot.name}</Text>
          <View style={styles.infoWrapper}>
            <View style={styles.priceContainer}>
              <Text style={styles.price}>{item.price}</Text>
              <Text style={styles.coin}>USDT</Text>
            </View>
            {time - item.sellAt >= 0 && (
              <Button
                size={'small'}
                style={styles.buttonSize}
                onPress={() => {
                  setPopupContent('Do you confirm?')
                  setpopupVis(true)
                }}
                loading={isBuyFetching}
              >
                {t('page.common.buy')}
              </Button>
            )}
            {time - item.sellAt < 0 && (
              <CountDownComponent
                until={item.sellAt - time}
                textStyle={styles.CountDownText}
              />
            )}
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
  plotName: {
    fontSize: 14,
    color: 'white',
    marginBottom: 2,
  },
  CountDownText: {
    fontSize: 14,
    color: 'white',
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
    paddingTop: 7,
  },
  buttonSize: {
    width: 66,
    height: 22,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  itemContainer: {
    width: 154,
    marginHorizontal: 10,
    marginBottom: 5,
    paddingBottom: 5,
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
  marketPlotContainer: {
    width: 154,
    height: 154,
    marginBottom: 10,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#232631',
  },
  marketPlot: {
    width: 154,
    height: 154,
    marginBottom: 10,
    borderRadius: 10,
  },
  marketActivityPlot: {
    width: 154,
    height: 154,
    borderRadius: 0,
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
