import React, { useCallback } from 'react'
import { useSelector } from 'react-redux'
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Image,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native'
import { useGetUserBasicQuery } from '@/services/modules/member'
import Header from '@/components/Header'
import { globalStyles } from '@/constants'
import SvgIcon from '@/components/SvgIcon'
import NFTlist from './NFTlist'
import Exchange from './Exchange'
import Plotlist from './Plotlist'
import ModalComp from '@/components/Popup'
import { useTranslation } from 'react-i18next'

const Markets = props => {
  const { t, i18n } = useTranslation()
  const [marketType, setmarketType] = React.useState(props.route.params.type)
  const [popupVis, setpopupVis] = React.useState(false)
  const [popupContent, setPopupContent] = React.useState('')
  const { data: baseInfo = {} } = useGetUserBasicQuery('', {
    refetchOnMountOrArgChange: true,
  })
  const userInfo = useSelector(state => state.authUser.userInfo)
  // 切换市场类型
  const togglemarketType = useCallback(type => {
    setmarketType(type)
  }, [])
  const [showHeader, setShowHeader] = React.useState(true)
  const handleInputFocus = useCallback(() => {
    setShowHeader(false)
  }, [])
  const handleInputBlur = useCallback(() => {
    setShowHeader(true)
  }, [])

  const closePopUp = useCallback(() => {
    setpopupVis(false)
  }, [])

  const showPopUp = useCallback(props => {
    setPopupContent(props.content)
    setpopupVis(true)
  }, [])
  //1 store 2 token 3 property

  return (
    <View style={styles.container}>
      {showHeader && <Header title={t('page.market.index.official-store')} />}
      {marketType !== 2 && (
        <ModalComp
          visible={popupVis}
          content={popupContent}
          confirmButton={closePopUp}
        />
      )}
      <TouchableWithoutFeedback
        onPress={() => {
          Keyboard.dismiss()
        }}
      >
        <KeyboardAvoidingView
          behavior="position"
          style={{ alignItems: 'center' }}
          contentContainerStyle={{ alignItems: 'center' }}
          keyboardVerticalOffset={-80}
        >
          <View style={styles.tokenboard}>
            <View style={styles.verticalView}>
              <View style={styles.iconWraper}>
                <Image
                  source={{
                    uri: `${userInfo?.member.avatar}?x-oss-process=style/p_10`,
                  }}
                  resizeMode="cover"
                  style={styles.icon}
                />
              </View>
              <View style={styles.assets}>
                <View style={styles.assetsItem}>
                  <Text style={styles.assetsCount}>{baseInfo.energy}</Text>
                  <View style={globalStyles.flexRow}>
                    <SvgIcon
                      iconName="energy_symbol"
                      iconSize={12}
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
                      iconSize={12}
                      style={globalStyles.mR3}
                    />
                    <Text style={styles.assetsLabel}>USDT</Text>
                  </View>
                </View>
                <View style={styles.alignBackground}>
                  <Image
                    source={require('@/assets/images/rosen_background.png')}
                    style={styles.rosenBackgroud}
                    resizeMode={'contain'}
                  />
                </View>
              </View>
            </View>
          </View>
          <View style={styles.switch}>
            <TouchableOpacity
              style={[
                styles.switchItem,
                marketType === 1 ? styles.switchItemActive : '',
              ]}
              onPress={() => {
                togglemarketType(1)
              }}
            >
              <Text
                style={[
                  styles.switchItemText,
                  marketType === 1 ? styles.switchItemTextActive : '',
                ]}
              >
                {t('page.market.index.nft-store')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.switchItem,
                marketType === 2 ? styles.switchItemActive : '',
              ]}
              onPress={() => {
                togglemarketType(2)
              }}
            >
              <Text
                style={[
                  styles.switchItemText,
                  marketType === 2 ? styles.switchItemTextActive : '',
                ]}
              >
                {t('page.market.index.token-exchange')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.switchItem,
                marketType === 3 ? styles.switchItemActive : '',
              ]}
              onPress={() => {
                togglemarketType(3)
              }}
            >
              <Text
                style={[
                  styles.switchItemText,
                  marketType === 3 ? styles.switchItemTextActive : '',
                ]}
              >
                {t('page.market.index.plot-trade')}
              </Text>
            </TouchableOpacity>
          </View>

          {marketType === 1 && (
            <NFTlist marketType={marketType} showPopUp={showPopUp} />
          )}

          {marketType === 2 && (
            <Exchange
              handleInputFocus={handleInputFocus}
              handleInputBlur={handleInputBlur}
            />
          )}

          {marketType === 3 && (
            <Plotlist marketType={marketType} showPopUp={showPopUp} />
          )}
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
  },
  tokenSwitchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    bottom: 15,
  },
  alignBackground: {
    position: 'absolute',
    width: 85,
    height: 86,
    borderRadius: 25,
    overflow: 'hidden',
    left: 246,
  },
  rosenBackgroud: {
    width: 87,
    height: 86,
    position: 'absolute',
  },
  choose: {
    backgroundColor: '#232631',
    flex: 1,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notChoose: {
    flex: 1,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alignBtn: {
    flex: 1,
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
    paddingVertical: 32,
  },
  btn: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  itemAlign: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 5,
  },
  moreContainer: {
    paddingVertical: 5,
  },
  textInputView: {
    height: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 32,
    justifyContent: 'center',
    paddingLeft: 12,
    marginVertical: 5,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
  },
  itemNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
  moreText: {
    color: 'rgba(255, 255, 255, 0.3)',
    alignSelf: 'center',
  },
  exchangeBoard: {
    width: 327,
    backgroundColor: '#232631',
    justifyContent: 'space-between',
    flexDirection: 'column',
    borderRadius: 20,
    padding: 24,
    bottom: 10,
  },
  tokenTitle: {
    fontSize: 20,
    color: 'white',
    fontWeight: '700',
  },
  switchToken: {
    width: 327,
    top: 20,
    borderColor: '#232631',
    borderWidth: 1,
    justifyContent: 'space-around',
    flexDirection: 'row',
    borderRadius: 20,
    height: 90,
  },
  buyTokenView: { flex: 1, flexDirection: 'column' },
  assets: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 50,
    flex: 1,
    bottom: 24,
  },
  assetsItem: {
    alignItems: 'center',
  },
  assetsCount: {
    fontSize: 20,
    color: '#fff',
    marginBottom: 5,
    fontWeight: '700',
  },
  assetsLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
  },
  assetsLabelChoose: {
    fontSize: 14,
    color: 'white',
  },
  assetsLabelNotChoose: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
  },
  tokenAlign: {
    flexDirection: 'row',
  },
  iconWraper: {
    alignItems: 'center',
    bottom: 25,
  },
  tokenboard: {
    backgroundColor: '#232631',
    width: 327,
    height: 86,
    borderRadius: 20,
    marginTop: 145,
    alignSelf: 'center',
  },
  verticalView: { flexDirection: 'column', flex: 1 },
  icon: { width: 50, height: 50, borderRadius: 50 },
  switch: {
    borderRadius: 12,
    padding: 7,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'flex-end',
    marginBottom: 20,
    height: 50,
    width: '100%',
    marginVertical: 10,
  },
  switchItem: {
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#232631',
    minWidth: 64,
  },
  switchItemActive: {
    backgroundColor: '#5A8CFF',
  },
  switchItemText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '400',
  },
  switchItemTextActive: {
    color: '#fff',
  },
})

export default Markets
