import React, { useRef, useState, useCallback } from 'react'
import {
  ActivityIndicator,
  Animated,
  Easing,
  StyleSheet,
  View,
  Image,
  ImageBackground,
  TouchableOpacity,
  Text,
  Dimensions,
} from 'react-native'
import { BlurView } from 'expo-blur'
import moment from 'moment'
import Swiper from 'react-native-swiper'
import { useNavigation } from '@react-navigation/native'
import { globalStyles } from '@/constants'
import Button from '@/components/Button'
import SvgIcon from '@/components/SvgIcon'
import { ddtodms, ordinalSuffixOf } from '@/utils'
import {
  useLazyGetPlotByIdQuery,
  useOccupyMutation,
} from '@/services/modules/plot'
import { useLazyGetUserBasicQuery } from '@/services/modules/member'
import { useUnListPlotOnMarketMutation } from '@/services/modules/market'
import CountDownComponent from '@/components/CountDownComponent'
import { useTranslation } from 'react-i18next'

const windowHeight = Dimensions.get('window').height
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity)

const PlotCard = props => {
  const { t, i18n } = useTranslation()

  const [fetchBaseInfoTrigger, { data: baseInfo = {} }] =
    useLazyGetUserBasicQuery()
  const [
    fetchPlotDetailTrigger,
    { data: plotData = {}, isFetching: isPlotFetching },
  ] = useLazyGetPlotByIdQuery()
  const [occupyTrigger, { isLoading: isOccupyFetching }] = useOccupyMutation()
  const [unListTrigger, { isLoading: isUnListFetching }] =
    useUnListPlotOnMarketMutation()

  const hideCallback = props.onHide
  const navigation = useNavigation()
  const [cardWidth, setCardWidth] = useState(0)
  const [cardHeight, setCardHeight] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)
  const onLayout = event => {
    setCardWidth(event.nativeEvent.layout.width)
    setCardHeight(event.nativeEvent.layout.width + 160)
  }
  const [isOccupy, setIsOccupy] = useState(false)

  // 位置信息面板动画
  const plotCardAnimFrom = {
    translateY: windowHeight,
  }
  const plotCardAnimTo = {
    translateY: 0,
  }
  const plotCardY = useRef(
    new Animated.Value(plotCardAnimFrom.translateY),
  ).current

  const showPlotCard = useCallback(() => {
    setContainerHeight(windowHeight)
    showPlotCardMask()
    Animated.timing(plotCardY, {
      toValue: plotCardAnimTo.translateY,
      duration: 150,
      easing: Easing.bezier(0.27, 0.3, 0, 0.98),
      useNativeDriver: true,
    }).start()
  }, [plotCardY, plotCardAnimTo.translateY, showPlotCardMask])

  const hidePlotCard = useCallback(() => {
    Animated.timing(plotCardY, {
      toValue: plotCardAnimFrom.translateY,
      duration: 150,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start(() => {
      setContainerHeight(0)
    })
    setIsOccupy(false)
    hideCallback()
    hidePlotCardMask()
  }, [plotCardY, plotCardAnimFrom.translateY, hidePlotCardMask, hideCallback])

  // 遮罩动画
  const plotCardMaskOpacityAnimFrom = {
    opacity: 0,
  }
  const plotCardMaskOpacityAnimTo = {
    opacity: 100,
  }
  const plotCardMaskOpacity = useRef(
    new Animated.Value(plotCardMaskOpacityAnimFrom.opacity),
  ).current
  const showPlotCardMask = useCallback(() => {
    Animated.timing(plotCardMaskOpacity, {
      toValue: plotCardMaskOpacityAnimTo.opacity,
      duration: 300,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start()
  }, [plotCardMaskOpacity, plotCardMaskOpacityAnimTo.opacity])
  const hidePlotCardMask = useCallback(() => {
    Animated.timing(plotCardMaskOpacity, {
      toValue: plotCardMaskOpacityAnimFrom.opacity,
      duration: 300,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start()
  }, [plotCardMaskOpacity, plotCardMaskOpacityAnimFrom.opacity])

  const handleOccupy = () => {
    occupyTrigger(props.plotId).then(res => {
      const { code, msg } = res.data
      if (code === 500 || code === 501 || code === 505) {
        props.onMessage(t(msg, { fail: 'Preemption failed' }))
      } else {
        // 延迟1.5秒出提示，让plot详情先显示出来
        setTimeout(() => {
          props.onMessage(
            t('message.occupy.success', {
              plot: plotData.name,
              amount: plotData.occupyPrice,
              token: 'USDT',
            }),
          )
        }, 1500)
      }
    })
  }

  const handleUnlisting = () => {
    unListTrigger({ listingId: plotData.listing.id, plotId: plotData.id }).then(
      res => {
        if (res.data && res.data.code === 20000) {
          props.onMessage('Successfully cancel the listing of the plot')
        } else {
          props.onMessage(res.data.msg)
        }
      },
    )
  }

  React.useEffect(() => {
    if (props.show) {
      showPlotCard()
    }
  }, [props.show, showPlotCard])

  React.useEffect(() => {
    if (props.plotId) {
      console.log(props.plotId)
      fetchPlotDetailTrigger(props.plotId)
      fetchBaseInfoTrigger()
    }
  }, [props.plotId, fetchPlotDetailTrigger, fetchBaseInfoTrigger])

  return (
    <View
      style={[
        {
          height: containerHeight,
        },
        styles.container,
      ]}
    >
      <AnimatedTouchable
        activeOpacity={1}
        style={[
          {
            opacity: plotCardMaskOpacity,
          },
          styles.plotCardMask,
        ]}
        delayPressIn={0}
        onPressIn={() => hidePlotCard()}
      />
      <Animated.View
        style={[
          {
            transform: [{ translateY: plotCardY }],
            height: cardHeight,
          },
          styles.plotCard,
        ]}
        onLayout={event => onLayout(event)}
      >
        {isPlotFetching && (
          <View style={styles.loadding}>
            <ActivityIndicator color="#0CC4FF" />
          </View>
        )}
        {!isPlotFetching && plotData.blazer && (
          <Swiper
            style={styles.plotCardSwiper}
            showsButtons={false}
            height={cardHeight}
            loop={false}
            dot={<View style={styles.plotCardSwiperDot} />}
            activeDot={<View style={styles.plotCardSwiperActiveDot} />}
            paginationStyle={styles.plotCardSwiperPagination}
          >
            <View style={styles.basicInfoSlide}>
              <View
                style={{
                  width: cardWidth,
                  height: cardWidth,
                }}
              >
                {plotData.cover && (
                  <Image
                    source={{
                      uri: `${plotData.cover}?x-oss-process=style/webp`,
                    }}
                    style={[
                      styles.basicInfoPlotPhotoImage,
                      plotData.style === 1
                        ? styles.basicInfoActivityPlotPhotoImage
                        : '',
                    ]}
                  />
                )}
                <ImageBackground
                  source={require('@/assets/images/plot_rank_bg.png')}
                  style={styles.basicInfoPlotRanking}
                >
                  <View style={styles.basicInfoPlotRankingNumWrapper}>
                    <Text style={styles.basicInfoPlotRankingNum}>
                      {plotData.rank}
                    </Text>
                    <Text style={styles.basicInfoPlotRankingNumTail}>
                      {ordinalSuffixOf(plotData.rank)}
                    </Text>
                  </View>
                </ImageBackground>
              </View>
              <View style={styles.basicInfoView}>
                <Text
                  style={styles.basicInfoPlotName}
                  ellipsizeMode="tail"
                  numberOfLines={1}
                >
                  {plotData.name}
                </Text>
                <View style={styles.basicInfoPrice}>
                  <SvgIcon iconName="usdt_symbol" iconSize={16} />
                  <Text style={styles.basicInfoPriceText}>
                    {plotData.mintPrice}
                  </Text>
                  <SvgIcon
                    iconName="blazer_manage"
                    iconSize={16}
                    style={[globalStyles.mR3, styles.mintIconBorder]}
                  />
                  <Text style={styles.basicInfoPriceText}>
                    {plotData.mintLimitCur - plotData.mintCountOD > 0
                      ? plotData.mintLimitCur - plotData.mintCountOD
                      : 0}
                  </Text>
                </View>
                <View style={styles.basicInfoBottom}>
                  <View style={styles.basicInfoPlotLonAndLat}>
                    <Text style={styles.basicInfoPlotLat}>
                      {ddtodms(plotData.lat)}
                    </Text>
                    <Text style={styles.basicInfoPlotLon}>
                      {ddtodms(plotData.lng, true)}
                    </Text>
                  </View>
                  <Button
                    size="middle"
                    onPress={() => {
                      navigation.navigate('MintManage', plotData)
                    }}
                  >
                    {t('page.alpha.plotcard.mint/trial')}
                  </Button>
                </View>
              </View>
            </View>
            <View style={styles.detailInfoSlide}>
              <View style={styles.detailInfoPlotBlock}>
                <Text style={styles.detailInfoPlotName}>{plotData.name}</Text>
                <Text style={styles.detailInfoPlotDescription}>
                  {plotData.description}
                </Text>
              </View>
              <View style={styles.detailInfoMiddlePart}>
                <View style={styles.detailInfoDataBlock}>
                  <View style={styles.detailInfoDataItem}>
                    <Text style={styles.detailInfoDataNum}>
                      {plotData.accessCount}
                    </Text>
                    <Text style={styles.detailInfoDataLabel}>
                      {t('page.common.views')}
                    </Text>
                  </View>
                  <View style={styles.detailInfoDataItem}>
                    <Text style={styles.detailInfoDataNum}>
                      {plotData.mintCount}
                    </Text>
                    <Text style={styles.detailInfoDataLabel}>
                      {t('page.common.mint-counts')}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailInfoBlazerBlock}>
                  <View style={styles.listingCountDownContainer}>
                    {plotData.listing && (
                      <View style={styles.listingCountDown}>
                        <CountDownComponent
                          until={parseInt(
                            plotData.listing.sellAt - Date.now() / 1000,
                            10,
                          )}
                          textStyle={styles.listingCountDownText}
                        />
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.detailInfoBlazerInfo}
                    onPress={() => {
                      navigation.navigate('PersonalCell', {
                        id: plotData.blazer?.id,
                      })
                    }}
                  >
                    <View style={styles.detailInfoBlazerAvatar}>
                      <Image
                        source={{
                          uri: `${plotData.blazer?.avatar}?x-oss-process=style/p_20`,
                        }}
                        style={styles.detailInfoBlazerAvatarImage}
                      />
                    </View>
                    <Text style={styles.detailInfoBlazerName}>
                      {plotData.blazer?.name}
                    </Text>
                  </TouchableOpacity>
                </View>
                {/* <View style={styles.detailInfoBlazerDescription}>
                  <Text style={styles.detailInfoBlazerDescriptionText}>
                    The square of the God of war in Paris, France.
                  </Text>
                </View> */}
                <View style={styles.detailInfoExpires}>
                  <Text style={styles.detailInfoExpiresText}>
                    EXP {moment(plotData.dueTo * 1000).format('DD/MM/YYYY')}
                  </Text>
                </View>
              </View>
              <View style={styles.detailInfoOperateBlock}>
                {plotData.blazer?.id === baseInfo.id && plotData.style === 0 && (
                  <View style={globalStyles.flexRowSpace}>
                    {!plotData.listing ? (
                      <Button
                        size="middle"
                        type="hollow"
                        onPress={() => {
                          navigation.navigate('Listing', {
                            img: plotData.cover,
                            name: plotData.name,
                            id: plotData.id,
                            style: plotData.style,
                          })
                        }}
                        style={styles.btn}
                      >
                        {t('page.common.listing')}
                      </Button>
                    ) : (
                      <Button
                        loading={isUnListFetching}
                        style={styles.cancelButton}
                        type={'hollow'}
                        onPress={handleUnlisting}
                      >
                        Cancel listing
                      </Button>
                    )}

                    <Button
                      size="middle"
                      onPress={() => {
                        navigation.navigate('BlazerManage', plotData.id)
                      }}
                    >
                      {t('page.common.maintain')}
                    </Button>
                  </View>
                )}
              </View>
            </View>
          </Swiper>
        )}
        {!isPlotFetching && !plotData.blazer && (
          <View style={styles.vacantPlot}>
            <View
              style={{
                width: cardWidth,
                height: cardWidth,
              }}
            >
              {plotData.cover && (
                <Image
                  defaultSource={globalStyles.defaultImage}
                  source={{ uri: `${plotData.cover}?x-oss-process=style/webp` }}
                  style={[
                    styles.vacantPlotPhotoImage,
                    plotData.style === 1
                      ? styles.vacantActivityPlotPhotoImage
                      : '',
                  ]}
                />
              )}
              <View style={styles.vacantPlotInfoContainer}>
                <BlurView
                  style={styles.vacantPlotInfo}
                  intensity={50}
                  tint="dark"
                >
                  <Text style={styles.vacantPlotName}>{plotData.name}</Text>
                  <View style={styles.vacantPlotInfoAttr}>
                    <View style={styles.vacantPlotInfoAttrItem}>
                      <View style={styles.discount}>
                        <Text style={styles.vacantPlotAmountText}>
                          {plotData.mintPrice}
                        </Text>
                        {plotData.mintPrice !== plotData.mintPrice && (
                          <Text style={styles.originalPriceText}>
                            {plotData.mintPrice}
                          </Text>
                        )}
                      </View>
                      <Text style={styles.vacantPlotAmountUnit}>
                        USDT/piece
                      </Text>
                      <Text style={styles.vacantPlotAmountLabel}>
                        Mint price
                      </Text>
                    </View>
                    <View style={styles.vacantPlotInfoAttrItem}>
                      <Text style={styles.vacantPlotAmountText}>
                        {moment()
                          .add(plotData.occupyDays || 0, 'days')
                          .format('MM/DD/YYYY')}
                      </Text>
                      <Text
                        style={styles.vacantPlotAmountUnit}
                      >{`${plotData.occupyDays}days`}</Text>
                      <Text style={styles.vacantPlotAmountLabel}>
                        Expire date
                      </Text>
                    </View>
                    <View style={styles.vacantPlotInfoAttrItem}>
                      <View style={styles.discount}>
                        <Text style={styles.vacantPlotAmountText}>
                          {plotData.occupyPrice}
                        </Text>
                        {plotData.originalOccupyPrice !==
                          plotData.occupyPrice && (
                          <Text style={styles.originalPriceText}>
                            {plotData.originalOccupyPrice}
                          </Text>
                        )}
                      </View>
                      <Text style={styles.vacantPlotAmountUnit}>USDT</Text>
                      <Text style={styles.vacantPlotAmountLabel}>
                        Occupy Price
                      </Text>
                    </View>
                  </View>
                  <View style={styles.vacantPlotToken}>
                    <Text style={styles.vacantPlotTokenRosText}>USDT</Text>
                    <SvgIcon
                      iconName="usdt_symbol"
                      iconSize={14}
                      style={globalStyles.mR3}
                    />
                    <Text style={styles.vacantPlotTokenAmountText}>
                      {baseInfo.token}
                    </Text>
                  </View>
                </BlurView>
              </View>
            </View>
            <View style={styles.occupy}>
              {!isOccupy && (
                <Button size="xlarge" onPress={() => setIsOccupy(true)}>
                  Occupy
                </Button>
              )}
              {isOccupy && (
                <View style={globalStyles.flexRowSpace}>
                  <Button
                    size="large"
                    type="hollow"
                    onPress={() => setIsOccupy(false)}
                    style={styles.btn}
                  >
                    {t('page.common.cancel')}
                  </Button>
                  <Button
                    loading={isOccupyFetching}
                    size="large"
                    onPress={handleOccupy}
                    style={styles.btn}
                  >
                    {t('page.common.confirm')}
                  </Button>
                </View>
              )}
            </View>
          </View>
        )}
      </Animated.View>
    </View>
  )
}

export default React.memo(PlotCard)

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: '100%',
    bottom: 0,
    left: 0,
    overflow: 'hidden',
  },
  btn: {
    width: '45%',
  },
  loadding: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plotCardMask: {
    position: 'absolute',
    height: '100%',
    width: '100%',
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  plotCard: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 20,
    flex: 1,
    backgroundColor: '#232631',
    borderRadius: 30,
    overflow: 'hidden',
  },
  discount: {
    flexDirection: 'row',
  },
  plotCardSwiperPagination: {
    bottom: 15,
  },
  originalPriceText: {
    fontSize: 10,
    textDecorationLine: 'line-through',
    color: 'white',
    alignSelf: 'flex-end',
    marginBottom: 2,
    marginLeft: 2,
  },
  plotCardSwiperDot: {
    backgroundColor: 'rgba(255,255,255,.3)',
    width: 7,
    height: 7,
    borderRadius: 4,
    marginLeft: 3,
    marginRight: 3,
    marginTop: 3,
    marginBottom: 3,
  },
  plotCardSwiperActiveDot: {
    backgroundColor: '#fff',
    width: 14,
    height: 7,
    borderRadius: 4,
    marginLeft: 3,
    marginRight: 3,
    marginTop: 3,
    marginBottom: 3,
  },

  basicInfoView: {
    paddingTop: 15,
    paddingBottom: 15,
    paddingHorizontal: 20,
    // flexDirection: 'row',
    // justifyContent: 'space-between',
  },
  basicInfoPlotPhotoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    resizeMode: 'contain',
  },
  basicInfoActivityPlotPhotoImage: {
    borderRadius: 0,
  },
  basicInfoPlotRanking: {
    position: 'absolute',
    left: 5,
    top: 5,
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  basicInfoPlotRankingNumWrapper: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  basicInfoPlotRankingNum: {
    fontSize: 24,
    color: 'rgba(255,255,255,0.8)',
  },
  basicInfoPlotRankingNumTail: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 3,
  },
  basicInfoPlotName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 13,
  },
  basicInfoPlotLat: {
    fontSize: 14,
    color: 'rgba(255,255,255,.3)',
    marginBottom: 5,
  },
  basicInfoPlotLon: {
    fontSize: 14,
    color: 'rgba(255,255,255,.3)',
  },
  basicInfoPrice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 13,
  },
  basicInfoPriceText: {
    fontSize: 18,
    color: '#fff',
    marginHorizontal: 3,
    marginRight: 10,
  },
  basicInfoBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  detailInfoSlide: {
    flex: 1,
    paddingTop: 25,
    paddingBottom: 35,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  detailInfoPlotBlock: {
    paddingBottom: 25,
    borderBottomColor: 'rgba(255,255,255,0.2)',
    borderBottomWidth: 1,
    borderStyle: 'solid',
  },
  detailInfoPlotName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  detailInfoPlotDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },

  detailInfoMiddlePart: {
    flex: 1,
  },

  detailInfoDataBlock: {
    paddingTop: 25,
    paddingBottom: 25,
    borderBottomColor: 'rgba(255,255,255,0.2)',
    borderBottomWidth: 1,
    borderStyle: 'solid',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  detailInfoDataItem: {
    alignItems: 'center',
  },
  detailInfoDataNum: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  detailInfoDataLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },

  detailInfoBlazerBlock: {
    paddingTop: 25,
    // flexDirection: 'row',
    // justifyContent: 'space-between',
    // alignItems: 'center',
  },
  detailInfoBlazerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  detailInfoBlazerAvatar: {
    borderRadius: 25,
    width: 50,
    height: 50,
    overflow: 'hidden',
    marginRight: 12,
  },
  listingCountDownContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  listingCountDown: {
    backgroundColor: '#5A8CFF',
    height: 20,
    width: 80,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listingCountDownText: {
    color: '#fff',
  },
  detailInfoBlazerAvatarImage: {
    width: '100%',
    height: '100%',
  },
  detailInfoBlazerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  detailInfoBlazerDescription: {
    marginTop: 20,
  },
  detailInfoBlazerDescriptionText: {
    color: 'rgba(255,255,255,.6)',
    fontSize: 12,
  },
  detailInfoExpires: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  detailInfoExpiresText: {
    color: 'rgba(255,255,255,0.3)',
  },

  vacantPlot: {
    flex: 1,
    justifyContent: 'space-between',
  },
  vacantPlotPhotoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    resizeMode: 'contain',
  },
  vacantActivityPlotPhotoImage: {
    borderRadius: 0,
  },
  vacantPlotInfoContainer: {
    borderColor: 'rgba(255,225,255,0.6)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: 12,
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    overflow: 'hidden',
  },
  vacantPlotInfo: {
    paddingVertical: 15,
    paddingHorizontal: 25,
  },
  vacantPlotName: {
    fontSize: 24,
    fontWeight: '400',
    color: '#fff',
    marginBottom: 20,
  },
  vacantPlotInfoAttr: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  vacantPlotInfoAttrItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  vacantPlotAmountText: {
    fontSize: 16,
    color: '#fff',
  },
  vacantPlotAmountUnit: {
    fontSize: 8,
    color: '#fff',
    marginBottom: 5,
  },
  vacantPlotAmountLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  vacantPlotToken: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  vacantPlotTokenRosText: {
    color: 'rgba(255, 255, 255, 0.6)',
    marginRight: 10,
  },
  vacantPlotTokenAmountText: {
    color: '#ffffff',
  },
  occupy: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 25,
  },
  occupyBtnContainer: {},
  mintIconBorder: {
    left: 3,
    borderWidth: 1,
    borderColor: '#fff',
    borderRadius: 3,
  },

  cancelButton: {
    width: 150,
  },
})
