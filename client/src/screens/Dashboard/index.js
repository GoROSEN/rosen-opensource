import React, { useState } from 'react'
import {
  StyleSheet,
  View,
  Text,
  Image,
  ImageBackground,
  TouchableOpacity,
} from 'react-native'
import { useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { globalStyles } from '@/constants'
import { useGetUserBasicQuery } from '@/services/modules/member'
import { updataUserInfo } from '@/store/authSlice'
import { connectPublicKey } from '@/store/blockchainAuth'

const Dashboard = ({ navigation }) => {
  const dispatch = useDispatch()
  const { t, i18n } = useTranslation()
  const { data: baseInfo = {} } = useGetUserBasicQuery('', {
    refetchOnMountOrArgChange: true,
  })
  // console.log('\x1b[34m', 'baseInfo')
  // console.log(baseInfo)

  React.useEffect(() => {
    if (baseInfo.walletAddresses) {
      dispatch(
        connectPublicKey({
          publicKey:
            baseInfo.walletAddresses.length >= 1
              ? baseInfo.walletAddresses[0]
              : null,
          chain: 'sol',
        }),
      )
    }
    if (baseInfo.avatar) {
      dispatch(
        updataUserInfo({
          avatar: baseInfo.avatar,
          displayName: baseInfo.displayName,
          email: baseInfo.email,
        }),
      )
    }
  }, [baseInfo, dispatch])

  return (
    <View style={globalStyles.container}>
      <ImageBackground
        source={require('@/assets/images/dashboard_bg.png')}
        style={styles.containerBg}
      />

      <ImageBackground
        source={require('@/assets/images/rosen_logo_horizontal.png')}
        style={styles.rosenLogo}
      />

      <ImageBackground
        source={require('@/assets/images/dashboard_planet.png')}
        style={styles.rosenPlanetBg}
      >
        <ImageBackground
          source={require('@/assets/images/dashboard_small_planet.png')}
          style={[styles.rosenSmallPlanet, styles.rosenSmallPlanetAlpha]}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            delayPressIn={0}
            style={styles.rosenSmallPlanetInner}
            onPressIn={() => navigation.navigate('Alpha')}
          >
            <Text
              style={[
                styles.rosenSmallPlanetText,
                styles.rosenSmallPlanetTextAlpha,
              ]}
            >
              {t('page.dashboard.alpha')}
            </Text>
          </TouchableOpacity>
        </ImageBackground>
        <ImageBackground
          source={require('@/assets/images/dashboard_small_planet.png')}
          style={[styles.rosenSmallPlanet, styles.rosenSmallPlanetMarket]}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            delayPressIn={0}
            style={styles.rosenSmallPlanetInner}
            onPressIn={() => navigation.navigate('Market', { type: 1 })}
          >
            <Text
              style={[
                styles.rosenSmallPlanetText,
                styles.rosenSmallPlanetTextMarket,
              ]}
            >
              {t('page.common.market')}
            </Text>
          </TouchableOpacity>
        </ImageBackground>

        <ImageBackground
          source={require('@/assets/images/dashboard_small_planet.png')}
          style={[styles.rosenSmallPlanet, styles.rosenSmallPlanetRanking]}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            delayPressIn={0}
            style={styles.rosenSmallPlanetInner}
            onPressIn={() => navigation.navigate('Rankingboard')}
          >
            <Text
              style={[
                styles.rosenSmallPlanetText,
                styles.rosenSmallPlanetTextRanking,
              ]}
            >
              {t('page.common.ranking-board')}
            </Text>
          </TouchableOpacity>
        </ImageBackground>
      </ImageBackground>

      <TouchableOpacity
        activeOpacity={0.8}
        delayPressIn={0}
        onPressIn={() => navigation.navigate('PersonalCell')}
        style={styles.cellEntryContainer}
      >
        <ImageBackground
          source={require('@/assets/images/dashboard_cell_entry_bg.png')}
          style={styles.cellEntry}
        >
          <Text style={styles.cellEntryText}>{t('page.dashboard.cell')}</Text>
        </ImageBackground>
      </TouchableOpacity>

      <View style={styles.summary}>
        <Image
          source={require('@/assets/images/dashboard_data_bg.png')}
          style={styles.summaryBg}
        />
        <View style={styles.userInfo}>
          <Text style={styles.userInfoName}>{baseInfo.displayName}</Text>
          <Text style={styles.userInfoRoles}>
            {baseInfo.role || t('page.common.producer')}
          </Text>
        </View>
        <View style={styles.summaryData}>
          <View style={styles.summaryDataItem}>
            <Text style={styles.summaryDataNum}>{baseInfo.followers || 0}</Text>
            <Text style={styles.summaryDataLabel}>
              {t('page.common.followers')}
            </Text>
          </View>
          <View style={styles.summaryDataItem}>
            <Text style={styles.summaryDataNum}>
              {baseInfo.followings || 0}
            </Text>
            <Text style={styles.summaryDataLabel}>
              {t('page.common.followings')}
            </Text>
          </View>
          <View style={styles.summaryDataItem}>
            <Text style={styles.summaryDataNum}>{baseInfo.energy || 0}</Text>
            <Text style={styles.summaryDataLabel}>ENGY</Text>
          </View>
          <View style={styles.summaryDataItem}>
            <Text style={styles.summaryDataNum}>{baseInfo.token || 0}</Text>
            <Text style={styles.summaryDataLabel}>USDT</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  containerBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    resizeMode: 'cover',
  },
  rosenLogo: {
    position: 'absolute',
    top: '10%',
    left: '50%',
    width: 120,
    height: 26,
    marginLeft: -60,
    resizeMode: 'cover',
  },
  rosenPlanetBg: {
    position: 'absolute',
    top: '25%',
    left: '50%',
    marginLeft: -200,
    width: 400,
    height: 345,
    resizeMode: 'cover',
  },
  rosenSmallPlanet: {
    position: 'absolute',
    overflow: 'hidden',
  },
  rosenSmallPlanetInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rosenSmallPlanetText: {
    color: 'rgba(170, 240, 255, 0.8)',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  rosenSmallPlanetTextMarket: {
    fontSize: 8,
  },
  rosenSmallPlanetTextRanking: {
    fontSize: 7,
  },
  rosenSmallPlanetAlpha: {
    height: 60,
    width: 60,
    left: 120,
    top: -51,
  },
  rosenSmallPlanetMarket: {
    height: 50,
    width: 50,
    left: 220,
    top: -40,
  },
  rosenSmallPlanetRanking: {
    height: 40,
    width: 40,
    left: 300,
    top: 0,
  },

  cellEntryContainer: {
    position: 'absolute',
    bottom: 140,
    left: '50%',
    marginLeft: -72,
    width: 144,
    height: 144,
  },
  cellEntry: {
    width: 144,
    height: 144,
    resizeMode: 'cover',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellEntryText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'rgba(170, 240, 255, 0.8)',
  },
  summary: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    height: 150,
  },
  summaryBg: {
    position: 'absolute',
    left: 0,
    top: 0,
    resizeMode: 'stretch',
    width: '100%',
    height: '100%',
  },
  userInfo: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 15,
  },
  userInfoName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  userInfoRoles: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
  summaryData: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryDataItem: {
    alignItems: 'center',
  },
  summaryDataNum: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  summaryDataLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
})

export default Dashboard
