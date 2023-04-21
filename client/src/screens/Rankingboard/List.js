import React, { useEffect, useCallback } from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
} from 'react-native'
import { globalStyles } from '@/constants'
import SvgIcon from '@/components/SvgIcon'
import { useLazyGetPlotRankingQuery } from '@/services/modules/plot'
import TopPlot from './TopPlot'
import { useTranslation } from 'react-i18next'

function plotListReducer(state, action) {
  switch (action.type) {
    case 'UPDATE':
      return state.concat(action.payload)
    case 'CLEAR':
      return []
    default:
      return state
  }
}

const rankingType = ['all', 'month', 'day']

const List = props => {
  const { t, i18n } = useTranslation()
  // const queryPage = React.useRef(1)
  const [pageLoading, setPageLoading] = React.useState(false)
  const [pageLoadingFull, setPageLoadingFull] = React.useState(false)
  const [plotList, dispatch] = React.useReducer(plotListReducer, [])
  const [initialGet, setInitialGet] = React.useState(false)
  const [fetchPlotListTrigger] = useLazyGetPlotRankingQuery()

  useEffect(() => {
    setInitialGet(false)
    dispatch({ type: 'CLEAR' })
    fetchPlotListTrigger(rankingType[props.rankingType - 1]).then(
      plotRanking => {
        dispatch({ type: 'UPDATE', payload: plotRanking.data })
        console.log('update')
        setInitialGet(true)
      },
    )

    // queryPage.current = 1
    // loadData({
    //   page: queryPage.current,
    //   type: rankingType[props.rankingType - 1],
    // })
  }, [fetchPlotListTrigger, props.rankingType])

  // const loadData = React.useCallback(
  //   params => {
  //     setPageLoading(true)
  //     fetchPlotListTrigger(params.type).then(result => {
  //       setPageLoading(false)
  //       if (params.page === result.data.pager.pageCount) {
  //         setPageLoadingFull(true)
  //       } else {
  //         setPageLoadingFull(false)
  //       }
  //       dispatch({ type: 'UPDATE', payload: result.data.items })
  //       setInitialGet(true)
  //     })
  //   },
  //   [fetchPlotListTrigger],
  // )

  // 上拉加载更多数据
  // const handleLoadMore = () => {
  //   if (!pageLoadingFull && !pageLoading) {
  //     queryPage.current = queryPage.current + 1
  //     loadData({
  //       page: queryPage.current,
  //       type: rankingType[props.rankingType - 1],
  //     })
  //   }
  // }

  const listFooter = useCallback(() => {
    let end = null

    if (pageLoading) {
      end = (
        <View style={styles.loading}>
          <ActivityIndicator color="#0CC4FF" />
        </View>
      )
    } else {
      if (plotList.length === 0) {
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
  }, [pageLoading, pageLoadingFull, plotList.length, t])

  const rankingItem = useCallback(item => {
    return [item.mintCount, item.mintCountOM, item.mintCountOD]
  }, [])

  //   console.log('plotlist',plotList)
  if (initialGet) {
    console.log(plotList[0])
    console.log(plotList[1])
    console.log(plotList[2])
    return (
      <View style={[globalStyles.container, { paddingHorizontal: 10 }]}>
        <FlatList
          showsVerticalScrollIndicator={false}
          // onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          data={plotList.slice(3)}
          ListHeaderComponent={
            <View>
              <TopPlot
                plotListItem={plotList[0]}
                rank={1}
                rankAbr={'st'}
                rankingType={props.rankingType}
              />
              <TopPlot
                plotListItem={plotList[1]}
                rank={2}
                rankAbr={'nd'}
                rankingType={props.rankingType}
              />
              <TopPlot
                plotListItem={plotList[2]}
                rank={3}
                rankAbr={'rd'}
                rankingType={props.rankingType}
              />
            </View>
          }
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={styles.resultItem}
              activeOpacity={1}
              onPress={() => {}}
            >
              <View style={styles.plotInfoAlign}>
                {item.style === 0 && (
                  <Image
                    source={{ uri: `${item.logo}?x-oss-process=style/p_30` }}
                    style={styles.plotLogo}
                  />
                )}
                {item.style === 1 && (
                  <View style={styles.activityPlotLogoContainer}>
                    <Image
                      source={{ uri: `${item.logo}?x-oss-process=style/p_30` }}
                      style={styles.activityPlotLogo}
                    />
                  </View>
                )}

                <View style={styles.textInfoAlign}>
                  <Text style={styles.plotName}>{item.name}</Text>
                  <View style={styles.rowView}>
                    <Text style={styles.textItem}>{`${t(
                      'page.common.blazer',
                    )}: `}</Text>
                    {!!item.blazer && (
                      <>
                        <Image
                          style={styles.avatarIcon}
                          source={{
                            uri: `${item.blazer.avatar}?x-oss-process=style/p_10`,
                          }}
                        />
                        <Text style={styles.userName}>{item.blazer.name}</Text>
                      </>
                    )}
                  </View>
                  <View style={styles.rowView}>
                    <Text style={styles.textItem}>{`${t(
                      'page.common.mint',
                    )}: `}</Text>
                    <Text style={styles.userName}>
                      {rankingItem(item)[props.rankingType - 1]}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListFooterComponent={listFooter}
        />
      </View>
    )
  }
}

const styles = StyleSheet.create({
  rowView: {
    flexDirection: 'row',
  },
  avatarIcon: {
    width: 16,
    height: 16,
    borderRadius: 20,
    marginHorizontal: 3,
    alignSelf: 'flex-end',
  },
  rankingNumber: {
    fontSize: 21,
    color: '#FFFFFF',
  },
  rankingNumberAbbr: {
    fontSize: 8.75,
    color: '#FFFFFF',
    top: 5,
  },
  light: {
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  textItem: {
    fontSize: 12,
    color: '#999999',
  },
  textInfoAlign: {
    flexDirection: 'column',
    marginHorizontal: 15,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    height: 80,
    paddingVertical: 10,
  },
  plotInfoAlign: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  plotLogo: {
    height: 80,
    width: 80,
    borderRadius: 20,
  },
  activityPlotLogoContainer: {
    height: 80,
    width: 80,
    borderRadius: 20,
    overflow: 'hidden',
  },
  activityPlotLogo: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#232631',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 10,
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
    fontSize: 12,
    color: '#fff',
  },
  plotName: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '400',
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
