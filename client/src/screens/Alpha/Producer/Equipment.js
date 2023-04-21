import React, { useRef, useCallback, useState } from 'react'
import {
  View,
  Image,
  StyleSheet,
  Text,
  ImageBackground,
  Dimensions,
} from 'react-native'
import Reanimated, {
  Extrapolate,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { globalStyles } from '@/constants'
import { useSelector } from 'react-redux'
import LinearGradientText from '@/components/LinearGradientText'
import Header from '@/components/Header'
import TouchIcon from '@/components/TouchIcon'
import CarouselPagination from '@/components/CarouselPagination'
import Carousel from 'react-native-reanimated-carousel'
import {
  useGetEquipmentListQuery,
  useSwitchEquimentMutation,
} from '@/services/modules/equipmentlist'
import Button from '@/components/Button'
import { useTranslation } from 'react-i18next'

const windowWidth = Dimensions.get('window').width

const M2Eimgs = [
  {
    img: require('@/assets/images/avatar_default_bg.png'),
    icon: require('@/assets/images/equipment_thumbnail_01.png'),
  },
  {
    img: require('@/assets/images/frog1.png'),
    icon: require('@/assets/images/equipment_thumbnail_02.png'),
  },
  {
    img: require('@/assets/images/frog2.png'),
    icon: require('@/assets/images/equipment_thumbnail_03.png'),
  },
]

const Equipment = props => {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const swiperAnimProgressValue = useSharedValue(0)
  const [currentIndex, setCurrentIndex] = useState(0)

  const { data: equipmentList = { items: [] } } = useGetEquipmentListQuery(1, {
    refetchOnMountOrArgChange: true,
  })
  const userInfo = useSelector(state => state.authUser.userInfo)
  const [switchEquimentTrigger, { isLoading }] = useSwitchEquimentMutation()

  const headerRightPart = () => {
    return (
      <View style={styles.headerRightPart}>
        <TouchIcon
          iconName="marketicon"
          iconSize={20}
          onPress={() => navigation.navigate('Market', { type: 1 })}
          style={[styles.headerRightPartBtn]}
        />
      </View>
    )
  }

  const avatarTriggerAnimStyle = useAnimatedStyle(() => {
    let inputRange = [0, 1, 2]
    let outputRange = [0, -110, -220]

    return {
      transform: [
        {
          translateX: interpolate(
            swiperAnimProgressValue?.value,
            inputRange,
            outputRange,
            Extrapolate.CLAMP,
          ),
        },
      ],
    }
  }, [])

  return (
    <SafeAreaView
      style={[globalStyles.container, globalStyles.containerPadding]}
    >
      <Header rightPart={headerRightPart()} />

      <Image
        style={styles.starsBackground}
        resizeMode="cover"
        source={require('@/assets/images/stars.png')}
      />

      <ImageBackground
        source={require('@/assets/images/light.png')}
        style={styles.lightBackground}
      >
        <Text style={styles.currentUsingText}>
          {t('page.producer.producermanage.current-using')}
        </Text>

        <Reanimated.View
          style={[
            {
              width: 110 * equipmentList.items.length,
              left:
                (windowWidth -
                  globalStyles.containerPadding.paddingHorizontal * 2 -
                  110) /
                2,
            },
            styles.triggerContainer,
            avatarTriggerAnimStyle,
          ]}
        >
          {equipmentList.items.map((item, index) => (
            <Image
              key={item.id}
              style={styles.triggerItem}
              resizeMode="cover"
              source={M2Eimgs[item.imgindex].icon}
            />
          ))}
        </Reanimated.View>

        <Carousel
          style={styles.swiper}
          width={
            windowWidth - globalStyles.containerPadding.paddingHorizontal * 2
          }
          loop={false}
          data={equipmentList.items}
          onSnapToItem={index => {
            setCurrentIndex(index)
          }}
          onProgressChange={(_, absoluteProgress) =>
            (swiperAnimProgressValue.value = absoluteProgress)
          }
          renderItem={({ item }) => (
            <View style={styles.slideItem} key={item.id}>
              <ImageBackground
                style={[
                  styles.slideItemBackground,
                  styles['slideItemBackground' + item.imgindex],
                ]}
                resizeMode="cover"
                source={M2Eimgs[item.imgindex].img}
              >
                <View style={[styles.avatar, styles['avatar' + item.imgindex]]}>
                  <Image
                    style={styles.avatarImage}
                    source={{
                      uri: `${userInfo?.member.avatar}?x-oss-process=style/p_20`,
                    }}
                  />
                </View>
              </ImageBackground>
            </View>
          )}
        />
        <CarouselPagination
          data={equipmentList.items}
          paginationStyle={styles.pagination}
          animValue={swiperAnimProgressValue}
        />

        <View style={styles.avatarProperty}>
          <View style={styles.avatarPropertyItem}>
            <LinearGradientText size={14}>
              {equipmentList.items[currentIndex]?.life}
            </LinearGradientText>
            <Text style={styles.avatarPropertyLabel}>
              {t('page.producer.producermanage.status')}
            </Text>
          </View>
          <View style={styles.avatarPropertyItem}>
            <LinearGradientText size={14}>
              {equipmentList.items[currentIndex]?.earnRate}
            </LinearGradientText>
            <Text style={styles.avatarPropertyLabel}>
              {t('page.producer.producermanage.earning-rate')}
            </Text>
          </View>
        </View>
      </ImageBackground>

      <Button
        loading={isLoading}
        size="xlarge"
        style={styles.btn}
        disabled={true}
        onPress={() => {
          switchEquimentTrigger(equipmentList.items[currentIndex]?.id).then(
            () => {
              navigation.navigate('Alpha', { m2eStart: true })
            },
          )
        }}
      >
        {t('page.common.coming-soon')}
        {/* {t('page.producer.producermanage.on')} */}
      </Button>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    overflow: 'hidden',
    alignItems: 'center',
  },
  headerRightPart: {
    flexDirection: 'row',
  },
  headerRightPartBtn: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    borderStyle: 'solid',
    borderRadius: 20,
    marginLeft: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  starsBackground: {
    position: 'absolute',
    top: 178,
    left: 22,
    width: '100%',
    height: 282,
  },
  lightBackground: {
    flex: 1,
    resizeMode: 'contain',
    position: 'relative',
  },

  currentUsingText: {
    fontSize: 18,
    color: '#5a8cff',
    textAlign: 'center',
  },
  triggerContainer: {
    marginTop: 30,
    flexDirection: 'row',
  },
  triggerItem: {
    width: 64,
    height: 68.91,
    marginHorizontal: 23,
  },

  btn: {
    marginBottom: 24,
  },

  swiper: {
    flex: 1,
  },
  slideItem: {
    // backgroundColor: 'rgba(255,255,255,0.5)',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: windowWidth - 48,
  },
  slideItemBackground: {
    width: windowWidth * 0.6,
    height: windowWidth * 0.6 * (361 / 292),
    alignItems: 'center',
  },
  slideItemBackground0: {
    width: windowWidth * 0.3,
    height: windowWidth * 0.3,
  },

  pagination: {
    marginBottom: windowWidth * 0.07,
  },

  avatar: {
    width: windowWidth * 0.25,
    height: windowWidth * 0.25,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  avatar0: {
    top: 10,
  },
  avatar1: {
    top: 38,
    left: 1,
  },
  avatar2: {
    top: 38,
    left: 1,
  },
  avatarImage: {
    height: '100%',
    width: '100%',
    borderRadius: windowWidth * 0.15,
  },

  avatarProperty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  avatarPropertyItem: {
    alignItems: 'center',
  },
  avatarPropertyLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
})

export default React.memo(Equipment)
