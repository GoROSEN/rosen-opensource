import React from 'react'
import {
  Animated,
  ActivityIndicator,
  Easing,
  StyleSheet,
  View,
  Text,
  TextInput,
  Image,
  ImageBackground,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  FlatList,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import Checkbox from '@/components/Checkbox'
import TouchIcon from '@/components/TouchIcon'
import SvgIcon from '@/components/SvgIcon'
import { globalStyles } from '@/constants'
import { useLazyGetNearbyPlotListByPageQuery } from '@/services/modules/plot'
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

const initialCoordinates = {
  latitude: 48.8582602,
  longitude: 2.2944991,
}

const Plot = props => {
  const navigation = useNavigation()
  const { t } = useTranslation()
  const [fetchPlotListTrigger, { isFetching }] =
    useLazyGetNearbyPlotListByPageQuery()
  const queryPage = React.useRef(1)
  const [keyword, setKeyword] = React.useState('')
  const [vacant, setVacant] = React.useState('')
  const [continent, setContinent] = React.useState('')
  const [sort, setSort] = React.useState('')
  const [isContinentOpen, setIsContinentOpen] = React.useState(false)
  const [plotList, dispatch] = React.useReducer(plotListReducer, [])
  const [pageLoadingFull, setPageLoadingFull] = React.useState(false)
  // console.log(plotList.length)

  const continents = [
    {
      name: t('page.search.plot.europe'),
    },
    {
      name: t('page.search.plot.asia'),
    },
    {
      name: t('page.search.plot.oceania'),
    },
    {
      name: t('page.search.plot.africa'),
    },
    {
      name: t('page.search.plot.north-america'),
    },
    {
      name: t('page.search.plot.south-america'),
    },
    {
      name: t('page.search.plot.antarctica'),
    },
  ]

  // 位置信息面板动画
  const continentsHeightFrom = {
    height: 0,
  }
  const continentsHeightTo = {
    height: 30,
  }
  const continentsHeight = React.useRef(
    new Animated.Value(continentsHeightFrom.height),
  ).current
  const toggleContinents = React.useCallback(() => {
    if (isContinentOpen) {
      Animated.timing(continentsHeight, {
        toValue: continentsHeightFrom.height,
        duration: 300,
        easing: Easing.bezier(0.61, 1, 0.88, 1),
        useNativeDriver: false,
      }).start()
      setIsContinentOpen(false)
    } else {
      Animated.timing(continentsHeight, {
        toValue: continentsHeightTo.height,
        duration: 300,
        easing: Easing.bezier(0.61, 1, 0.88, 1),
        useNativeDriver: false,
      }).start()
      setIsContinentOpen(true)
    }
  }, [
    isContinentOpen,
    continentsHeight,
    continentsHeightFrom.height,
    continentsHeightTo.height,
  ])

  // 获取数据
  const loadData = React.useCallback(
    params => {
      fetchPlotListTrigger({
        lat: initialCoordinates.latitude,
        lng: initialCoordinates.longitude,
        radius: 150000,
        vacant: params.vacant === true ? 1 : '',
        continent: params.continent,
        keyword: params.keyword,
        sort: params.sort,
        page: params.page,
      }).then(result => {
        // console.log(result.data)
        if (params.page >= result.data.pager.pageCount) {
          setPageLoadingFull(true)
        } else {
          setPageLoadingFull(false)
        }
        dispatch({ type: 'UPDATE', payload: result.data.items })
      })
    },
    [fetchPlotListTrigger],
  )

  // 搜索
  const handleSearch = React.useCallback(() => {
    // 清空数据
    dispatch({ type: 'CLEAR' })
    queryPage.current = 1
    setSort('')

    // 获取数据
    loadData({
      page: 1,
      vacant: '',
      continent: '',
      keyword: keyword,
      sort: '',
    })
  }, [keyword, loadData])

  const handleKeywordChange = React.useCallback(value => {
    setKeyword(value)
  }, [])

  // 是否空地
  const handleVacantChange = React.useCallback(() => {
    dispatch({ type: 'CLEAR' })
    queryPage.current = 1
    setSort('')
    // 获取数据
    loadData({
      page: 1,
      vacant: !vacant,
      continent: continent,
      keyword: keyword,
      sort: '',
    })
    setVacant(!vacant)
  }, [continent, keyword, loadData, vacant])

  // 选择大洲
  const handleContinentChange = React.useCallback(
    continentName => {
      dispatch({ type: 'CLEAR' })
      queryPage.current = 1
      setSort('')
      if (continent && continent === continentName) {
        // 获取数据
        loadData({
          page: 1,
          vacant: vacant,
          continent: '',
          keyword: keyword,
          sort: '',
        })
        setContinent('')
      } else {
        // 获取数据
        loadData({
          page: 1,
          vacant: vacant,
          continent: continentName,
          keyword: keyword,
          sort: '',
        })
        setContinent(continentName)
      }
    },
    [continent, keyword, loadData, vacant],
  )

  // 点击地块，跳转到Alpha
  const handlePlotPress = React.useCallback(
    data => {
      navigation.navigate('Alpha', data)
    },
    [navigation],
  )

  // 上拉加载更多数据
  const handleLoadMore = React.useCallback(() => {
    if (!pageLoadingFull && !isFetching) {
      queryPage.current = queryPage.current + 1
      loadData({
        page: queryPage.current,
        vacant: vacant,
        continent: continent,
        keyword: keyword,
        sort: sort,
      })
    }
  }, [continent, isFetching, keyword, loadData, pageLoadingFull, sort, vacant])

  const handleSort = React.useCallback(
    sortKey => {
      let s
      if (sort === '') {
        s = '-' + sortKey
      } else {
        if (sort.indexOf(sortKey) !== -1) {
          if (sort.indexOf('-') !== -1) {
            s = sortKey
          } else {
            s = ''
          }
        } else {
          s = '-' + sortKey
        }
      }

      setSort(s)
      queryPage.current = 1

      // 清空数据
      dispatch({ type: 'CLEAR' })

      // 获取数据
      loadData({
        page: 1,
        vacant: vacant,
        continent: continent,
        keyword: keyword,
        sort: s,
      })
    },
    [continent, keyword, loadData, sort, vacant],
  )

  React.useEffect(() => {
    setVacant(props.searchVacantParams || '')
    setContinent('')
    setKeyword('')
    setSort('')
    queryPage.current = 1

    // 清空数据
    dispatch({ type: 'CLEAR' })

    // 获取数据
    loadData({
      page: 1,
      vacant: props.searchVacantParams,
      continent: '',
      keyword: '',
      sort: '',
    })
  }, [loadData, props.searchVacantParams])

  const listFooter = React.useCallback(() => {
    let end = null

    if (isFetching) {
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
  }, [isFetching, pageLoadingFull, plotList.length, t])

  return (
    <FlatList
      showsVerticalScrollIndicator={false}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.3}
      data={plotList}
      ListHeaderComponent={
        <View>
          <View style={styles.search}>
            <TextInput
              value={keyword}
              style={styles.searchInput}
              onChangeText={handleKeywordChange}
              onSubmitEditing={handleSearch}
              placeholder={t('page.search.plot.search-for-plot')}
              placeholderTextColor="rgba(255,255,255,0.2)"
            />
            <TouchIcon
              iconName="search"
              iconSize={24}
              onPress={handleSearch}
              style={[styles.searchIcon]}
            />
          </View>
          <View style={styles.filter}>
            <View style={styles.filterInner}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.filterItem,
                  vacant ? styles.filterItemActive : '',
                  styles.filterItemCheckbox,
                ]}
                onPress={handleVacantChange}
              >
                <Checkbox
                  disableText
                  isChecked={vacant}
                  size={20}
                  fillColor="#fff"
                  disableBuiltInState
                  onPress={handleVacantChange}
                />
                <Text style={styles.filterItemCheckboxText}>
                  {t('page.search.plot.vacant')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.filterItem,
                  isContinentOpen ? styles.filterItemActive : '',
                  styles.filterItemDropdown,
                ]}
                onPress={() => {
                  toggleContinents()
                }}
              >
                <Text style={styles.filterItemCheckboxText}>
                  {t('page.search.plot.by-continent')}
                </Text>
                <SvgIcon iconName="arrow_down" iconSize={18} />
              </TouchableOpacity>
            </View>
            <Animated.View
              style={[{ height: continentsHeight }, styles.continentList]}
            >
              <ScrollView
                showsHorizontalScrollIndicator={false}
                horizontal={true}
                style={styles.continentListScroll}
              >
                {continents.map((item, index) => (
                  <TouchableOpacity
                    style={[
                      styles.continentItem,
                      item.name === continent
                        ? styles.continentItemSelected
                        : '',
                    ]}
                    key={index}
                    onPress={() => handleContinentChange(item.name)}
                  >
                    <Text style={styles.continentItemText}>{item.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Animated.View>
          </View>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsHeaderTitle}>
              {t('page.common.results')}
            </Text>
            <View style={styles.resultsSort}>
              <TouchableOpacity
                style={styles.resultsSortItem}
                onPress={() => handleSort('rank')}
              >
                <Text
                  style={[
                    styles.resultsSortItemText,
                    sort === 'rank' || sort === '-rank'
                      ? styles.resultsSortItemActiveText
                      : '',
                  ]}
                >
                  {t('page.common.ranking')}
                </Text>
                {sort === '-rank' && (
                  <SvgIcon
                    iconName="sort_down"
                    iconSize={14}
                    iconColor="#fff"
                  />
                )}
                {sort === 'rank' && (
                  <SvgIcon iconName="sort_up" iconSize={14} iconColor="#fff" />
                )}
                {sort !== '-rank' && sort !== 'rank' && (
                  <SvgIcon
                    iconName="sort_down"
                    iconSize={14}
                    iconColor="rgba(255,255,255,0.6)"
                  />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.resultsSortItem}
                onPress={() => handleSort('name')}
              >
                <Text
                  style={[
                    styles.resultsSortItemText,
                    sort === 'name' || sort === '-name'
                      ? styles.resultsSortItemActiveText
                      : '',
                  ]}
                >
                  name
                </Text>
                {sort === '-name' && (
                  <SvgIcon
                    iconName="sort_down"
                    iconSize={14}
                    iconColor="#fff"
                  />
                )}
                {sort === 'name' && (
                  <SvgIcon iconName="sort_up" iconSize={14} iconColor="#fff" />
                )}
                {sort !== '-name' && sort !== 'name' && (
                  <SvgIcon
                    iconName="sort_down"
                    iconSize={14}
                    iconColor="rgba(255,255,255,0.6)"
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.resultItem}
          activeOpacity={0.9}
          key={item.id}
          onPress={() =>
            handlePlotPress({
              showPlotCard: true,
              plotId: item.id,
              lat: item.lat,
              lng: item.lng,
            })
          }
        >
          {item.style === 0 && (
            <Image
              defaultSource={globalStyles.defaultImage}
              source={{ uri: `${item.logo}?x-oss-process=style/p_30` }}
              style={styles.plotCover}
            />
          )}
          {item.style === 1 && (
            <View style={styles.plotCoverContainer}>
              <Image
                defaultSource={globalStyles.defaultImage}
                source={{ uri: `${item.logo}?x-oss-process=style/p_30` }}
                style={styles.activityPlotCover}
              />
            </View>
          )}
          <View style={styles.plotInfo}>
            <Text style={styles.plotName}>{item.name}</Text>
            {item.blazer && (
              <View style={[styles.localtionInfoRow, styles.blazer]}>
                <Text style={styles.localtionInfoLable}>blazer:</Text>
                <Text style={styles.localtionInfoValue}>
                  {item.blazer.name}
                </Text>
              </View>
            )}
            <View style={[styles.localtionInfoRow, styles.continent]}>
              <Text style={styles.localtionInfoLable}>
                {t('page.common.continent')}:
              </Text>
              <Text style={styles.localtionInfoValue}>{item.continent}</Text>
            </View>
            <View style={[styles.localtionInfoRow, styles.ranking]}>
              <Text style={styles.localtionInfoLable}>
                {t('page.common.ranking')}:
              </Text>
              <Text style={styles.localtionInfoValue}>{item.rank}</Text>
            </View>
          </View>
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

  filter: {
    marginBottom: 30,
  },
  filterInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterItem: {
    flexDirection: 'row',
    flex: 1,
    borderRadius: 8,
    borderColor: '#232631',
    borderWidth: 1,
    borderStyle: 'solid',
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterItemActive: {
    backgroundColor: '#232631',
  },
  filterItemCheckbox: {
    marginRight: 26,
  },
  filterItemCheckboxText: {
    color: '#fff',
    marginHorizontal: 5,
  },
  continentList: {
    marginTop: 10,
    overflow: 'hidden',
  },
  continentListScroll: {
    flexGrow: 0,
  },
  continentItem: {
    borderColor: '#232631',
    borderWidth: 1,
    borderStyle: 'solid',
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
    paddingHorizontal: 17,
    marginRight: 10,
    marginBottom: 10,
  },
  continentItemSelected: {
    backgroundColor: '#5A8CFF',
    borderColor: '#5A8CFF',
  },
  continentItemText: {
    color: '#fff',
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
  resultsSort: {
    flexDirection: 'row',
  },
  resultsSortItem: {
    marginLeft: 22,
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultsSortItemText: {
    color: 'rgba(255,255,255,0.6)',
    marginRight: 5,
  },
  resultsSortItemActiveText: {
    color: '#fff',
  },

  result: {
    flex: 1,
  },
  resultLoading: {
    flex: 1,
    paddingVertical: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultItem: {
    flexDirection: 'row',
    backgroundColor: '#232631',
    padding: 13,
    borderRadius: 20,
    marginBottom: 20,
  },
  plotCoverContainer: {
    width: 100,
    height: 100,
    borderRadius: 20,
    overflow: 'hidden',
  },
  plotCover: {
    width: 100,
    height: 100,
    borderRadius: 20,
  },
  activityPlotCover: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  plotInfo: {
    marginLeft: 18,
    justifyContent: 'space-between',
    flex: 1,
  },
  localtionInfoRow: {
    flexDirection: 'row',
  },
  plotName: {
    fontSize: 16,
    color: '#fff',
  },
  localtionInfoLable: {
    color: '#999',
  },
  localtionInfoValue: {
    color: '#fff',
    marginLeft: 3,
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

export default React.memo(Plot)
