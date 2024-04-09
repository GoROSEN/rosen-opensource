import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Dimensions,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CountUp } from 'use-count-up'
import { globalStyles } from '@/constants'
import Avatar from '@/components/Avatar'
import SvgIcon from '@/components/SvgIcon'
import LinearGradientText from '@/components/LinearGradientText'

const { width: screenWidth } = Dimensions.get('screen')

type Props = {
  summaryResult: string
  matcherInfo?: Record<string, any>
}

type Summary = {
  [key: string]: {
    title: string
    subTitle: string
    image: number
  }
}

const SummaryMap: Summary = {
  win: {
    title: 'CONGRATS',
    subTitle: "You're the Winner!",
    image: require('@/assets/images/games/rps/pk_summary_win.png'),
  },
  lose: {
    title: 'You Lose',
    subTitle: 'Try again',
    image: require('@/assets/images/games/rps/pk_summary_lose.png'),
  },
}

const Summary: React.FC<Props> = props => {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { summaryResult } = props

  return (
    <View style={[styles.container, { paddingTop: insets.top + 60 }]}>
      <View style={styles.titleWrapper}>
        <LinearGradientText
          start={{ x: 0, y: 0 }}
          end={{ x: 0.9, y: 0.9 }}
          color={['#FEF48A', '#FFAA06']}
          textStyle={[globalStyles.luckiestGuyFamily, styles.title]}
        >
          {SummaryMap[summaryResult].title}
        </LinearGradientText>
        <LinearGradientText
          color={['#FEF48A', '#FFAA06']}
          textStyle={[styles.subTitle]}
        >
          {SummaryMap[summaryResult].subTitle}
        </LinearGradientText>
      </View>

      <ImageBackground
        style={styles.pkSummaryImage}
        source={SummaryMap[summaryResult].image}
      >
        <ImageBackground
          style={styles.pkSummaryBg}
          source={require('@/assets/images/games/rps/selection_round_bg.png')}
        />
        <Avatar size="large" style={styles.avatar} />
      </ImageBackground>

      <View style={styles.goldCoinWrapper}>
        <SvgIcon iconName="gold_coin" iconSize={50} />
        <Text style={styles.goldCoinAmount}>
          {summaryResult === 'win' && (
            <>
              <Text>+</Text>
              <CountUp isCounting end={30} duration={2} />
            </>
          )}
          {summaryResult === 'lose' && (
            <>
              <Text>-</Text>
              <CountUp isCounting end={20} duration={2} />
            </>
          )}
        </Text>
      </View>

      <View style={styles.tipsWrapper}>
        {summaryResult === 'win' && (
          <Text style={styles.tipsText}>
            The system will deduct 10% of the above income as gas fee
          </Text>
        )}
      </View>
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
  titleWrapper: {
    alignItems: 'center',
  },
  title: {
    fontSize: 58,
    color: '#FFAA06',
    textAlign: 'center',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    textShadowColor: '#000000',
  },
  subTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFAA06',
    textAlign: 'center',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
    textShadowColor: '#000000',
  },
  pkSummaryBg: {
    height: screenWidth * 0.9 * 0.36,
    width: screenWidth * 0.9,
    resizeMode: 'contain',
    position: 'absolute',
    top: -20,
    alignSelf: 'center',
  },
  pkSummaryImage: {
    width: screenWidth * 0.8,
    height: screenWidth * 0.8,
    resizeMode: 'contain',
    alignItems: 'center',
    position: 'relative',
  },
  avatar: {
    marginTop: 40,
  },
  goldCoinWrapper: {
    alignItems: 'center',
  },
  goldCoinAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  tipsWrapper: {
    width: '50%',
  },
  tipsText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
})

export default React.memo(Summary)
