import React, { useRef, useState, useCallback } from 'react'
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  Image,
  ImageBackground,
  TouchableOpacity,
  Text,
  ScrollView,
  Pressable,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Carousel from 'react-native-reanimated-carousel'
import { useSelector } from 'react-redux'
import { globalStyles } from '@/constants'
import { useNavigation } from '@react-navigation/native'
import { BlurView } from 'expo-blur'
import TouchIcon from '@/components/TouchIcon'
import SvgIcon from '@/components/SvgIcon'
import Header from '@/components/Header'
import Avatar from './Component/Avatar'
import {
  useGetProducerBasicQuery,
  useGetProducerPlotListQuery,
  useGetProducerGalleryListQuery,
} from '@/services/modules/member'
import {
  useFollowMutation,
  useUnFollowMutation,
} from '@/services/modules/friend'
import { useTranslation } from 'react-i18next'

const PersonalCell = props => {
  const { t, i18n } = useTranslation()
  const navigation = useNavigation()
  const { data: baseInfo = {}, refetch } = useGetProducerBasicQuery(props.id, {
    refetchOnMountOrArgChange: true,
  })
  const { data: plotList = [] } = useGetProducerPlotListQuery(props.id, {
    refetchOnMountOrArgChange: true,
  })
  const { data: galleryList = [] } = useGetProducerGalleryListQuery(props.id, {
    refetchOnMountOrArgChange: true,
  })
  const [followTrigger, { isLoading: isFollowFetching }] = useFollowMutation()
  const [unFollowTrigger, { isLoading: isUnFollowFetching }] =
    useUnFollowMutation()

  const scaleAnimFrom = {
    value: 1,
  }
  const scaleAnimTo = {
    value: 0,
  }
  const scaleBack = useRef(new Animated.Value(scaleAnimFrom.value)).current
  const scaleUp = useRef(new Animated.Value(scaleAnimTo.value)).current

  const opacityAnimFrom = {
    value: 1,
  }
  const opacityAnimTo = {
    value: 0,
  }
  const opacityReduce = useRef(
    new Animated.Value(opacityAnimFrom.value),
  ).current
  const opacityIncrease = useRef(
    new Animated.Value(opacityAnimTo.value),
  ).current

  const followAmin = () => {
    Animated.stagger(150, [
      Animated.parallel([
        Animated.timing(scaleBack, {
          toValue: scaleAnimTo.value,
          duration: 400,
          easing: Easing.bezier(0.27, 0.3, 0, 0.98),
          useNativeDriver: true,
        }).start(),
        Animated.timing(opacityReduce, {
          toValue: opacityAnimTo.value,
          duration: 400,
          easing: Easing.bezier(0.27, 0.3, 0, 0.98),
          useNativeDriver: true,
        }).start(),
      ]),
      Animated.parallel([
        Animated.timing(scaleUp, {
          toValue: scaleAnimFrom.value,
          duration: 400,
          easing: Easing.bezier(0.27, 0.3, 0.6, 1.7),
          useNativeDriver: true,
        }).start(),
        Animated.timing(opacityIncrease, {
          toValue: opacityAnimFrom.value,
          duration: 400,
          easing: Easing.bezier(0.27, 0.3, 0, 0.98),
          useNativeDriver: true,
        }).start(),
      ]),
    ])
  }

  const unFollowAmin = () => {
    Animated.stagger(150, [
      Animated.parallel([
        Animated.timing(scaleUp, {
          toValue: scaleAnimTo.value,
          duration: 400,
          easing: Easing.bezier(0.27, 0.3, 0, 0.98),
          useNativeDriver: true,
        }).start(),
        Animated.timing(opacityIncrease, {
          toValue: opacityAnimTo.value,
          duration: 400,
          easing: Easing.bezier(0.27, 0.3, 0, 0.98),
          useNativeDriver: true,
        }).start(),
      ]),
      Animated.parallel([
        Animated.timing(scaleBack, {
          toValue: scaleAnimFrom.value,
          duration: 400,
          easing: Easing.bezier(0.27, 0.3, 0.6, 1.7),
          useNativeDriver: true,
        }).start(),
        Animated.timing(opacityReduce, {
          toValue: opacityAnimFrom.value,
          duration: 400,
          easing: Easing.bezier(0.27, 0.3, 0, 0.98),
          useNativeDriver: true,
        }).start(),
      ]),
    ])
  }

  const headerRightPart = () => {
    return (
      <View style={styles.headerRightPart}>
        <Pressable
          onPressIn={follow}
          hitSlop={20}
          style={[globalStyles.flexCenter, styles.headerRightPartBtn]}
        >
          <View style={styles.headerRightPartBtnInner}>
            <Animated.View
              style={[
                {
                  transform: [{ scale: scaleBack }],
                  opacity: opacityReduce,
                },
                styles.followIcon,
              ]}
            >
              <SvgIcon iconName="follow" iconSize={18} />
            </Animated.View>
            <Animated.View
              style={[
                {
                  transform: [{ scale: scaleUp }],
                  opacity: opacityIncrease,
                },
                styles.followIcon,
              ]}
            >
              <SvgIcon iconName="unfollow" iconSize={18} />
            </Animated.View>
          </View>
        </Pressable>
      </View>
    )
  }

  const follow = () => {
    if (isFollowFetching || isUnFollowFetching) {
      return
    }

    if (baseInfo.following) {
      unFollowAmin()
      unFollowTrigger(props.id).then(res => {
        if (res.data.code === 20000) {
          refetch()
        } else {
          followAmin()
          console.log(res.data.msg)
        }
      })
    } else {
      followAmin()
      followTrigger(props.id).then(res => {
        if (res.data.code === 20000) {
          refetch()
        } else {
          unFollowAmin()
          console.log(res.data.msg)
        }
      })
    }
  }

  React.useEffect(() => {
    if (baseInfo.following) {
      followAmin()
    } else {
      unFollowAmin()
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseInfo.following])

  return (
    <SafeAreaView
      style={[globalStyles.container, globalStyles.containerPadding]}
    >
      <Header rightPart={headerRightPart()} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.info}>
          <ImageBackground
            source={require('@/assets/images/personal_cell_avatar_bg.png')}
            style={styles.avatarContainer}
          >
            {baseInfo.avatar && (
              <Avatar image={`${baseInfo.avatar}?x-oss-process=style/p_30`} />
            )}
          </ImageBackground>
          <Text style={styles.userName}>{baseInfo.displayName}</Text>
          <Text style={styles.bioText}>{baseInfo.bio}</Text>
        </View>
        <View style={styles.socialMedia}>
          <TouchIcon
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
          />
          <TouchIcon
            iconName="sns_logo_facebook"
            iconSize={20}
            iconColor=""
            onPress={() => {}}
            style={[styles.socialMediaIcon]}
          />
          <TouchIcon
            iconName="sns_logo_tiktok"
            iconSize={20}
            iconColor=""
            onPress={() => {}}
            style={[styles.socialMediaIcon]}
          />
        </View>
        <View style={styles.assets}>
          <View style={styles.assetsItem}>
            <Text style={styles.assetsCount}>{baseInfo.followers}</Text>
            <View>
              <Text style={styles.assetsLabel}>
                {t('page.common.followers')}
              </Text>
            </View>
          </View>
          <View style={styles.assetsItem}>
            <Text style={styles.assetsCount}>{baseInfo.followings}</Text>
            <View>
              <Text style={styles.assetsLabel}>
                {t('page.common.followings')}
              </Text>
            </View>
          </View>
        </View>
        {plotList.length > 0 && (
          <Carousel
            style={styles.plotCarousel}
            width={240}
            height={240}
            pagingEnabled={true}
            snapEnabled={true}
            loop={true}
            data={plotList}
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
            <Text style={styles.moduleHeadText}>Gallery</Text>
          </View>
          {galleryList.length > 0 && (
            <ScrollView
              showsHorizontalScrollIndicator={false}
              horizontal={true}
              style={styles.galleryScroll}
            >
              {galleryList.map(
                (item, index) =>
                  index < 10 && (
                    <TouchableOpacity
                      key={index}
                      activeOpacity={0.8}
                      style={styles.galleryItem}
                    >
                      <Image
                        defaultSource={globalStyles.defaultImage}
                        source={{
                          uri: `${item.logo}?x-oss-process=style/p_50`,
                        }}
                        style={styles.galleryItemImage}
                      />
                    </TouchableOpacity>
                  ),
              )}
            </ScrollView>
          )}
          {galleryList.length === 0 && (
            <View style={styles.galleryNodata}>
              <SvgIcon iconName="nodata" iconSize={160} />
            </View>
          )}
        </View>
      </ScrollView>
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
  headerRightPartBtnInner: {
    width: 18,
    height: 18,
    position: 'relative',
  },
  followIcon: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  moreOptionsPopover: {
    backgroundColor: 'rgba(255,255,255,0.1)',
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
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    textAlign: 'left',
  },
  moduleHeadText: {
    fontSize: 20,
    color: '#ffffff',
  },

  assets: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 100,
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
    paddingVertical: 10,
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
