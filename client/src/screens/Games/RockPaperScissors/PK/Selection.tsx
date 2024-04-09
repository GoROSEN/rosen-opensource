import React, { useCallback, useState } from 'react'
import { View, Text, StyleSheet, ImageBackground, Image } from 'react-native'
import Svg, { Image as SvgImage, Path, Defs, ClipPath } from 'react-native-svg'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { globalStyles } from '@/constants'
import SvgIcon from '@/components/SvgIcon'
import CountDownComponent from '@/components/CountDownComponent'
import Button from '../Components/Button'

type Props = {
  winCount: number
  roundCount: number
  onSelectionConfirm: (id: number) => void
}

type Selection = {
  [key: number]: {
    color: string
    image: number
  }
}

const selectionMap: Selection = {
  1: {
    color: '#FF7247',
    image: require('@/assets/images/games/rps/selection_r.png'),
  },
  2: {
    color: '#FDCA28',
    image: require('@/assets/images/games/rps/selection_p.png'),
  },
  3: {
    color: '#47A6FF',
    image: require('@/assets/images/games/rps/selection_s.png'),
  },
}

const Selection: React.FC<Props> = props => {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { winCount, roundCount, onSelectionConfirm } = props

  // 随机生成一个石头剪刀布的id值
  const offerIdMap = [1, 2, 3]
  const randomIndex = Math.floor(Math.random() * offerIdMap.length)
  const defaultOfferId = offerIdMap[randomIndex]
  const [offerId, setOfferId] = useState(defaultOfferId)

  const [loading, setLoading] = useState(false)

  const handleConfirm = useCallback(() => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      onSelectionConfirm(offerId)
    }, 1000)
  }, [offerId, onSelectionConfirm])

  const handleSelect = useCallback((key: number) => {
    setOfferId(key)
  }, [])

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <View style={styles.countdownWrapper}>
        <CountDownComponent
          showSecondsOnly
          until={40}
          textStyle={[globalStyles.lilitaOneFamily, styles.countdown]}
          onFinish={handleConfirm}
        />
        <Text style={styles.countdownLabel}>Countdown and seconds reading</Text>
      </View>

      <View style={styles.selectionWrapper}>
        <View style={styles.selectionGroup}>
          <Svg width="320" height="252" viewBox="0 0 320 252">
            <Path
              d="M0.32373 237.778V97.4071C0.32373 91.1704 4.48417 85.6996 10.4943 84.0334L95.879 60.3624C105.726 57.6325 115.047 66.1209 113.248 76.18L83.9031 240.221C82.7195 246.838 76.9639 251.656 70.2419 251.656H14.2019C6.53718 251.656 0.32373 245.442 0.32373 237.778Z"
              fill={offerId === 1 ? selectionMap[1].color : '#fff'}
              onPress={() => {
                handleSelect(1)
              }}
            />
            <Path
              d="M92.7181 232.659L122.296 64.5587C123.38 58.398 127.916 53.4128 133.947 51.7534L208.627 31.2064C220.104 28.0489 230.95 37.9382 228.863 49.6567L195.261 238.304C193.885 246.029 187.168 251.656 179.321 251.656H108.664C98.5999 251.656 90.974 242.571 92.7181 232.659Z"
              fill={offerId === 2 ? selectionMap[2].color : '#fff'}
              onPress={() => {
                handleSelect(2)
              }}
            />
            <Path
              d="M203.366 235.301L240.491 30.6023C241.436 25.3911 245.264 21.1721 250.36 19.7272L301.857 5.12357C310.716 2.61115 319.521 9.26626 319.521 18.4752V237.777C319.521 245.442 313.308 251.655 305.643 251.655H217.022C208.366 251.655 201.822 243.818 203.366 235.301Z"
              fill={offerId === 3 ? selectionMap[3].color : '#fff'}
              onPress={() => {
                handleSelect(3)
              }}
            />

            {/* 定义裁剪路径 */}
            <Defs>
              <ClipPath id="rclip">
                <Path d="M0.32373 237.778V97.4071C0.32373 91.1704 4.48417 85.6996 10.4943 84.0334L95.879 60.3624C105.726 57.6325 115.047 66.1209 113.248 76.18L83.9031 240.221C82.7195 246.838 76.9639 251.656 70.2419 251.656H14.2019C6.53718 251.656 0.32373 245.442 0.32373 237.778Z" />
              </ClipPath>
              <ClipPath id="pclip">
                <Path d="M92.7181 232.659L122.296 64.5587C123.38 58.398 127.916 53.4128 133.947 51.7534L208.627 31.2064C220.104 28.0489 230.95 37.9382 228.863 49.6567L195.261 238.304C193.885 246.029 187.168 251.656 179.321 251.656H108.664C98.5999 251.656 90.974 242.571 92.7181 232.659Z" />
              </ClipPath>
              <ClipPath id="sclip">
                <Path d="M203.366 235.301L240.491 30.6023C241.436 25.3911 245.264 21.1721 250.36 19.7272L301.857 5.12357C310.716 2.61115 319.521 9.26626 319.521 18.4752V237.777C319.521 245.442 313.308 251.655 305.643 251.655H217.022C208.366 251.655 201.822 243.818 203.366 235.301Z" />
              </ClipPath>
            </Defs>
            {/* 需要裁剪的图片 */}
            <SvgImage
              x="3%"
              y="40%"
              height="161"
              width="161"
              href={selectionMap[1].image}
              clipPath="url(#rclip)"
              onPress={() => {
                handleSelect(1)
              }}
            />
            <SvgImage
              x="35%"
              y="35%"
              height="161"
              width="161"
              href={selectionMap[2].image}
              clipPath="url(#pclip)"
              onPress={() => {
                handleSelect(2)
              }}
            />
            <SvgImage
              x="70%"
              y="33%"
              height="161"
              width="161"
              href={selectionMap[3].image}
              clipPath="url(#sclip)"
              onPress={() => {
                handleSelect(3)
              }}
            />
          </Svg>
        </View>
        <Text style={styles.selectionLabel}>
          Choose what you want to produce:
        </Text>
      </View>

      <ImageBackground
        style={styles.roundWrapper}
        source={require('@/assets/images/games/rps/selection_round_bg.png')}
      >
        <Text style={styles.roundText}>Round {roundCount}</Text>
        <View style={styles.winStar}>
          {Array.from({ length: winCount }).map((_, index) => (
            <SvgIcon iconName="star" iconSize={16} key={index} />
          ))}
        </View>
      </ImageBackground>

      <View style={styles.tipsWrapper}>
        <Text style={styles.tipsText}>
          If no selection is made at the end of the second reading, your frog
          Avatar will help you make a random selection; If there is no frog
          Avatar, it will be considered as a waiver and this round will be
          negative.
        </Text>
      </View>

      <View style={styles.selectionResultWrapper}>
        <Text style={styles.selectionResultLabel}>You chose a</Text>
        <Image
          source={selectionMap[offerId].image}
          style={styles.selectionResultImage}
        />
      </View>

      <Button
        loading={loading}
        size="large"
        onPress={() => {
          handleConfirm()
        }}
      >
        {t('page.common.confirm')}
      </Button>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  countdownWrapper: {
    alignItems: 'center',
  },
  countdown: {
    fontSize: 90,
    color: '#FFE604',
  },
  countdownLabel: {
    color: '#fff',
    fontSize: 10,
  },
  selectionWrapper: {
    alignItems: 'center',
  },
  selectionGroup: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  selectionLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  roundWrapper: {
    height: 93,
    width: 258,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
  },
  winStar: {
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 4,
  },
  tipsWrapper: {
    width: 226,
  },
  tipsText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 18,
  },
  selectionResultWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionResultLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  selectionResultImage: {
    width: 70,
    height: 70,
    resizeMode: 'contain',
  },
})

export default React.memo(Selection)
