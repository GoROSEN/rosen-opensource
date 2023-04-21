import React from 'react'
import {
  StyleSheet,
  View,
  Text,
  Image,
  ImageBackground,
  TouchableOpacity,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useTranslation } from 'react-i18next'

const color = [
  ['rgba(168, 82, 255, 0.5)', 'rgba(17, 19, 24, 0.5)'],
  ['rgba(120, 117, 255, 0.5)', 'rgba(17, 19, 24, 0.5)'],
  ['rgba(75, 150, 255, 0.5)', 'rgba(17, 19, 24, 0.5)'],
]

const TopPlot = ({ plotListItem, rank, rankAbr, rankingType }) => {
  const { t, i18n } = useTranslation()
  const rankingItem = [
    plotListItem.mintCount,
    plotListItem.mintCountOM,
    plotListItem.mintCountOD,
  ]
  return (
    <TouchableOpacity
      style={styles.resultItem}
      activeOpacity={1}
      onPress={() => {}}
    >
      <LinearGradient
        start={{ x: 0, y: 0.25 }}
        end={{ x: 0.8, y: 1 }}
        colors={color[rank - 1]}
        style={styles.resultItemLinearGradientBg}
      />
      <View style={styles.plotInfoAlign}>
        {plotListItem.style === 0 && (
          <Image
            source={{ uri: `${plotListItem.logo}?x-oss-process=style/p_30` }}
            style={styles.plotLogo}
          />
        )}
        {plotListItem.style === 1 && (
          <View style={styles.activityPlotLogoContainer}>
            <Image
              source={{ uri: `${plotListItem.logo}?x-oss-process=style/p_30` }}
              style={styles.activityPlotLogo}
            />
          </View>
        )}
        <View style={styles.textInfoAlign}>
          <Text style={styles.plotName}>{plotListItem.name}</Text>
          <View style={styles.rowView}>
            <Text style={styles.textItem}>{`${t(
              'page.common.blazer',
            )}: `}</Text>
            {!!plotListItem.blazer && (
              <>
                <Image
                  style={styles.avatarIcon}
                  source={{
                    uri: `${plotListItem.blazer.avatar}`,
                  }}
                />
                <Text style={styles.userName}>{plotListItem.blazer.name}</Text>
              </>
            )}
          </View>
          <View style={styles.rowView}>
            <Text style={styles.textItem}>{`${t('page.common.mint')}: `}</Text>
            <Text style={styles.userName}>{rankingItem[rankingType - 1]}</Text>
          </View>
        </View>
        <View style={styles.lightAlign}>
          <ImageBackground
            style={styles.light}
            source={require('@/assets/images/rankinglight.png')}
          >
            <Text style={styles.rankingNumber}>{rank}</Text>
            <Text style={styles.rankingNumberAbbr}>{rankAbr}</Text>
          </ImageBackground>
        </View>
      </View>
    </TouchableOpacity>
  )
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
  lightAlign: {
    position: 'absolute',
    left: 260,
    top: 10,
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
    alignSelf: 'flex-end',
    top: 13,
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
    width: 340,
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

export default TopPlot
