import React, { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  View,
  Image,
  ImageBackground,
  Pressable,
  TouchableOpacity,
  Text,
  ScrollView,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Carousel from 'react-native-reanimated-carousel'
import Popover from 'react-native-popover-view'
import Popup from '@/components/Popup'
import { useSelector } from 'react-redux'
import { globalStyles } from '@/constants'
import { useNavigation } from '@react-navigation/native'
import { BlurView } from 'expo-blur'
import TouchIcon from '@/components/TouchIcon'
import SvgIcon from '@/components/SvgIcon'
import Header from '@/components/Header'
import Avatar from './Component/Avatar'
import {
  useGetUserBasicQuery,
  useGetGalleryListQuery,
  useDeviceUnbindMutation,
} from '@/services/modules/member'
import { useGetPlotListQuery } from '@/services/modules/plot'
import { useGetAssetsListQuery } from '@/services/modules/assets'
import { useTranslation } from 'react-i18next'

const PersonalCell = ({ route }) => {
  const { t, i18n } = useTranslation()
  const publicKey = useSelector(state => state.authPubKey.sol)
  const navigation = useNavigation()
  const [showPopup, setShowPopup] = React.useState(false)
  const userInfo = useSelector(state => state.authUser.userInfo)
  const notificationPushToken = useSelector(
    state => state.permission.notificationPushToken,
  )
  const {
    data: baseInfo = {},
    isLoading: isBaseInfoLoading,
    isFetching: isBaseInfoFetching,
    isError: isBaseInfoError,
    refetch: baseInfoRefetch,
  } = useGetUserBasicQuery('', {
    refetchOnMountOrArgChange: true,
  })
  const {
    data: plotList = { items: [] },
    isLoading: isPlotListLoading,
    isFetching: isPlotListFetching,
    isError: isPlotListError,
    refetch: plotListRefetch,
  } = useGetPlotListQuery(1, {
    refetchOnMountOrArgChange: true,
  })
  const {
    data: galleryList = { items: [] },
    isLoading: isGalleryLoading,
    isFetching: isGalleryFetching,
    isError: isGalleryError,
    refetch: galleryRefetch,
  } = useGetGalleryListQuery(
    { page: 1, pageSize: 4 },
    {
      refetchOnMountOrArgChange: true,
    },
  )
  // console.log(galleryList.items)
  // const { data: assetsList = { assets: [] }, isLoading: isAssetsLoading } =
  //   useGetAssetsListQuery(
  //     { page: 3, pageSize: 5, walletAddress: publicKey },
  //     {
  //       refetchOnMountOrArgChange: true,
  //     },
  //   )
  // console.log(assetsList)

  const [deviceUnbindTrigger, { isLoading: isLogOutLoading }] =
    useDeviceUnbindMutation()

  const popoverTrigger = useRef()
  const [refreshing, setRefreshing] = React.useState(false)
  const [showPopover, setShowPopover] = useState(false)

  const handleRefresh = () => {
    setRefreshing(true)
    baseInfoRefetch()
    plotListRefetch()
    galleryRefetch()
  }

  const handleLogout = () => {
    setShowPopup(true)
    setShowPopover(false)
  }
  const handlePopupCancel = React.useCallback(() => {
    setShowPopup(false)
  }, [])
  const handlePopupConfirm = React.useCallback(() => {
    // 退出之前解绑一下设备
    deviceUnbindTrigger({
      devType: notificationPushToken.type,
      token: notificationPushToken.data,
    }).then(res => {
      setShowPopup(false)
      if (res.data.code === 20000) {
        // 跳转到登录页
        navigation.reset({
          index: 0,
          routes: [
            {
              name: 'Login',
            },
          ],
        })
      }
    })
  }, [deviceUnbindTrigger, navigation, notificationPushToken])

  const headerRightPart = React.useCallback(() => {
    return (
      <View style={styles.headerRightPart}>
        <TouchIcon
          iconName="personal_cell_frog"
          iconSize={18}
          onPress={() => navigation.navigate('Equipment')}
          style={[styles.headerRightPartBtn]}
        />
        <TouchIcon
          iconName="rosen_logo"
          iconSize={18}
          onPress={() => navigation.navigate('Dashboard')}
          style={[styles.headerRightPartBtn]}
        />
        <TouchIcon
          iconName="ddd"
          iconSize={20}
          style={[styles.headerRightPartBtn]}
          innerRef={popoverTrigger}
          onPress={() => setShowPopover(true)}
        />
      </View>
    )
  }, [navigation])

  useEffect(() => {
    if (
      (!isBaseInfoFetching || isBaseInfoError) &&
      (!isGalleryFetching || isGalleryError) &&
      (!isPlotListFetching || isPlotListError)
    ) {
      setRefreshing(false)
    }
  }, [
    isBaseInfoFetching,
    isBaseInfoError,
    isGalleryFetching,
    isGalleryError,
    isPlotListFetching,
    isPlotListError,
  ])

  return (
    <SafeAreaView
      style={[globalStyles.container, globalStyles.containerPadding]}
    >
      <Header rightPart={headerRightPart()} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#999999"
          />
        }
      >
        <View style={styles.info}>
          <ImageBackground
            source={require('@/assets/images/personal_cell_avatar_bg.png')}
            style={styles.avatarContainer}
          >
            <Avatar
              image={`${userInfo?.member.avatar}?x-oss-process=style/p_50`}
            />
          </ImageBackground>
          <Text style={styles.userName}>{baseInfo.displayName}</Text>
          <Text style={styles.bioText}>{baseInfo.bio}</Text>
        </View>
        <View style={styles.socialMedia}>
          {/* <TouchIcon
            iconName="sns_logo_twitter"
            iconSize={20}
            iconColor=""
            onPress={() => {}}
            style={[styles.socialMediaIcon]}
          />
          <TouchIcon
            iconName="sns_logo_instagram"
            iconSize={20}
            onPress={() => {}}
            style={[styles.socialMediaIcon]}
          /> */}
          {/* <TouchIcon
            iconName="sns_logo_facebook"
            iconSize={20}
            iconColor=""
            onPress={() => {}}
            style={[styles.socialMediaIcon]}
          /> */}
          {/* <TouchIcon
            iconName="sns_logo_tiktok"
            iconSize={20}
            iconColor=""
            onPress={() => {}}
            style={[styles.socialMediaIcon]}
          /> */}
        </View>
        <View style={styles.assets}>
          <View style={styles.assetsItem}>
            <Text style={styles.assetsCount}>{baseInfo.energy}</Text>
            <View style={globalStyles.flexRow}>
              <SvgIcon
                iconName="energy_symbol"
                iconSize={18}
                style={globalStyles.mR3}
              />
              <Text style={styles.assetsLabel}>ENGY</Text>
            </View>
          </View>
          <View style={styles.assetsItem}>
            <Text style={styles.assetsCount}>{baseInfo.token}</Text>
            <View style={globalStyles.flexRow}>
              <SvgIcon
                iconName="usdt_symbol"
                iconSize={18}
                style={globalStyles.mR3}
              />
              <Text style={styles.assetsLabel}>USDT</Text>
            </View>
          </View>
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.assetsItem}
            onPress={() => {
              navigation.push('Follow', { friendType: 1 })
            }}
          >
            <Text style={styles.assetsCount}>{baseInfo.followers}</Text>
            <View>
              <Text style={styles.assetsLabel}>
                {t('page.common.followers')}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.assetsItem}
            onPress={() => {
              navigation.push('Follow', { friendType: 2 })
            }}
          >
            <Text style={styles.assetsCount}>{baseInfo.followings}</Text>
            <View>
              <Text style={styles.assetsLabel}>
                {t('page.common.followings')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
        {plotList.items.length > 0 && (
          <Carousel
            style={styles.plotCarousel}
            width={240}
            height={240}
            pagingEnabled={true}
            snapEnabled={true}
            loop={true}
            data={plotList.items}
            mode="horizontal-stack"
            modeConfig={{
              snapDirection: 'left',
              stackInterval: 50,
              scaleInterval: 0.1,
              opacityInterval: 0.2,
            }}
            customConfig={() => ({ type: 'negative' })}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={styles.plotCarouselItem}
                activeOpacity={1}
                onPress={() => {
                  navigation.navigate('Alpha', {
                    showPlotCard: true,
                    plotId: item.id,
                    lat: item.lat,
                    lng: item.lng,
                  })
                }}
              >
                {item.style === 0 && (
                  <Image
                    defaultSource={globalStyles.defaultImage}
                    source={{ uri: `${item.logo}?x-oss-process=style/p_80` }}
                    style={styles.plotCarouselItemImage}
                  />
                )}
                {item.style === 1 && (
                  <View style={styles.activityPlotCarouselItemContainer}>
                    <Image
                      defaultSource={globalStyles.defaultImage}
                      source={{ uri: `${item.logo}?x-oss-process=style/p_80` }}
                      style={styles.activityPlotCarouselItemImage}
                    />
                  </View>
                )}
                <View style={styles.plotCarouselItemLocationContainer}>
                  <BlurView
                    style={styles.plotCarouselItemLocation}
                    intensity={50}
                    tint="dark"
                  >
                    <SvgIcon iconName="location" iconSize={12} />
                    <Text style={styles.plotCarouselItemLocationText}>
                      {item.name}
                    </Text>
                  </BlurView>
                </View>
              </TouchableOpacity>
            )}
          />
        )}

        <View style={styles.gallery}>
          <View style={styles.moduleHead}>
            <Text style={styles.moduleHeadText}>
              {t('page.personalcell.gallery')}
            </Text>
            <Pressable
              hitSlop={20}
              onPress={() => navigation.navigate('Gallery')}
            >
              <Text style={styles.moduleHeadMoreText}>
                {t('page.common.more')}
              </Text>
            </Pressable>
          </View>
          {isGalleryLoading && (
            <View style={styles.galleryLoading}>
              <ActivityIndicator color="#0CC4FF" />
            </View>
          )}
          {!isGalleryLoading && galleryList.items.length > 0 && (
            <ScrollView
              showsHorizontalScrollIndicator={false}
              horizontal={true}
              style={styles.galleryScroll}
            >
              {galleryList.items.map((item, index) => (
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
              ))}
            </ScrollView>
          )}
          {!isGalleryLoading && galleryList.items.length === 0 && (
            <View style={styles.galleryNodata}>
              <SvgIcon iconName="nodata" iconSize={160} />
            </View>
          )}
        </View>
        {/* <View style={styles.digitalAssets}>
          <View style={styles.moduleHead}>
            <Text style={styles.moduleHeadText}>
              {t('page.personalcell.item-&-digital-assets')}
            </Text>
          </View>
          <View style={styles.digitalAssetsList}>
            {isAssetsLoading && (
              <View style={styles.digitalAssetsLoading}>
                <ActivityIndicator color="#0CC4FF" />
              </View>
            )}
            {!isAssetsLoading &&
              assetsList.assets.map(
                (item, index) =>
                  index < 4 && (
                    <View
                      key={index}
                      style={[
                        styles.digitalAssetsItem,
                        { zIndex: assetsList.assets.length + 2 - index },
                      ]}
                    >
                      <Image
                        defaultSource={globalStyles.defaultImage}
                        source={{ uri: item.imageUrl }}
                        style={styles.digitalAssetsItemImage}
                      />
                    </View>
                  ),
              )}
            {!isAssetsLoading && assetsList.assets.length > 4 && (
              <View style={styles.digitalAssetsMore}>
                <TouchIcon
                  iconName="ddd"
                  iconSize={20}
                  onPress={() => navigation.navigate('Assets')}
                  style={[styles.digitalAssetsMoreIcon]}
                />
              </View>
            )}
            {!isAssetsLoading && assetsList.assets.length === 0 && (
              <View style={styles.digitalAssetsNodata}>
                <SvgIcon iconName="nodata" iconSize={160} />
              </View>
            )}
          </View>
        </View> */}
      </ScrollView>

      <Popup
        visible={showPopup}
        content="Are you sure to logout?"
        cancelButton={handlePopupCancel}
        confirmButton={handlePopupConfirm}
        isLoading={isLogOutLoading}
      />

      <Popover
        from={popoverTrigger}
        mode="js-modal"
        animationConfig={{ duration: 200 }}
        popoverStyle={styles.moreOptionsPopover}
        backgroundStyle={styles.moreOptionsPopoverBg}
        arrowSize={styles.moreOptionsPopoveArrowSize}
        isVisible={showPopover}
        // verticalOffset={-StatusBar.currentHeight}
        onRequestClose={() => setShowPopover(false)}
      >
        <View style={styles.moreOptionsPopoverInner}>
          {/* <Pressable style={styles.moreOptionsPopoverItem}>
            <SvgIcon iconName="share" iconSize={14} />
            <Text style={styles.moreOptionsPopoverItemText}>
              {t('page.common.share')}
            </Text>
          </Pressable> */}
          <Pressable
            style={styles.moreOptionsPopoverItem}
            onPress={() => {
              setShowPopover(false)
              console.log('Address from pc==========')
              console.log(baseInfo.walletAddresses[0])
              navigation.navigate('Settings', {
                pubKey: baseInfo.walletAddresses[0],
              })
            }}
          >
            <SvgIcon iconName="setting" iconSize={14} />
            <Text style={styles.moreOptionsPopoverItemText}>
              {t('page.personalcell.setting')}
            </Text>
          </Pressable>
          <Pressable
            style={styles.moreOptionsPopoverItem}
            onPress={() => {
              setShowPopover(false)
              navigation.navigate('WalletExchange')
            }}
          >
            <SvgIcon iconName="wallet" iconSize={14} />
            <Text style={styles.moreOptionsPopoverItemText}>
              {t('page.personalcell.wallet')}
            </Text>
          </Pressable>
          <Pressable
            style={styles.moreOptionsPopoverItem}
            onPress={() => {
              setShowPopover(false)
              navigation.navigate('Notification')
            }}
          >
            <SvgIcon iconName="notifications" iconSize={14} />
            <Text style={styles.moreOptionsPopoverItemText}>Notifications</Text>
          </Pressable>
          <Pressable
            style={styles.moreOptionsPopoverItem}
            onPress={handleLogout}
          >
            <SvgIcon iconName="logout" iconSize={14} />
            <Text style={styles.moreOptionsPopoverItemText}>
              {t('page.personalcell.logout')}
            </Text>
          </Pressable>
        </View>
      </Popover>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  headerRightPart: {
    flexDirection: 'row',
  },
  headerRightPartBtn: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    borderStyle: 'solid',
    borderRadius: 18,
    marginLeft: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreOptionsPopover: {
    backgroundColor: '#191919',
    borderRadius: 10,
  },
  moreOptionsPopoverInner: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  moreOptionsPopoverItem: {
    marginVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  moreOptionsPopoverItemText: {
    color: 'rgba(255,255,255,1)',
    fontSize: 14,
    marginLeft: 5,
  },
  moreOptionsPopoverBg: {
    opacity: 0,
  },
  moreOptionsPopoveArrowSize: {
    width: 10,
    height: 6,
  },

  info: {
    alignItems: 'center',
  },
  avatarContainer: {
    width: 159,
    height: 126,
    marginBottom: 14,
    position: 'relative',
    // backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  bioText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 14,
    paddingHorizontal: 14,
  },
  socialMedia: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  socialMediaIcon: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    borderStyle: 'solid',
    borderRadius: 8,
    padding: 4,
    margin: 15,
  },
  moduleHead: {
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moduleHeadText: {
    fontSize: 20,
    color: '#ffffff',
  },
  moduleHeadMoreText: {
    fontSize: 14,
    color: '#ffffff',
  },

  assets: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  assetsItem: {
    alignItems: 'center',
  },
  assetsCount: {
    fontSize: 20,
    color: '#fff',
    marginBottom: 10,
  },
  assetsLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
  },

  plotCarousel: {
    width: '100%',
    marginBottom: 45,
  },
  plotCarouselItem: {
    // borderRadius: 24,
    // overflow: 'hidden',
  },
  plotCarouselItemImage: {
    height: 240,
    width: 240,
    borderRadius: 24,
  },
  activityPlotCarouselItemContainer: {
    height: 240,
    width: 240,
    borderRadius: 24,
    backgroundColor: '#232631',
    overflow: 'hidden',
  },
  activityPlotCarouselItemImage: {
    height: 240,
    width: 240,
    resizeMode: 'contain',
  },
  plotCarouselItemLocationContainer: {
    borderColor: 'rgba(255,225,255,0.6)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: 12,
    position: 'absolute',
    bottom: 14,
    left: 16,
    overflow: 'hidden',
  },
  plotCarouselItemLocation: {
    height: 24,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  plotCarouselItemLocationText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 5,
  },

  gallery: {
    marginBottom: 30,
  },
  galleryNodata: {
    height: 160,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  galleryLoading: {
    height: 160,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  galleryScroll: {
    flexGrow: 0,
    height: 160,
    overflow: 'hidden',
  },
  galleryItem: {
    borderRadius: 24,
    overflow: 'hidden',
    marginRight: 20,
    height: 160,
  },
  galleryItemImage: {
    width: 160,
    height: 160,
  },
  digitalAssetsList: {
    flexDirection: 'row',
    marginBottom: 50,
  },
  digitalAssetsItem: {
    height: 88,
    width: 88,
    borderRadius: 44,
    overflow: 'hidden',
    marginRight: -20,
    position: 'relative',
  },
  digitalAssetsItemImage: {
    height: 88,
    width: 88,
  },
  digitalAssetsMore: {
    height: 88,
    width: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginLeft: -30,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  digitalAssetsMoreIcon: {
    marginRight: 10,
  },
  digitalAssetsLoading: {
    height: 160,
    flexDirection: 'row',
    justifyContent: 'center',
    flex: 1,
  },
  digitalAssetsNodata: {
    height: 160,
    flexDirection: 'row',
    justifyContent: 'center',
    flex: 1,
  },
  NFTCardWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  NFTCard: {
    width: 280,
    height: 320,
    borderRadius: 24,
    overflow: 'hidden',
    alignItems: 'center',
    position: 'relative',
  },
  NFTCardImage: {
    width: '100%',
    height: '100%',
  },
  NFTCardClose: {
    position: 'absolute',
    right: 10,
    top: 10,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

export default PersonalCell
