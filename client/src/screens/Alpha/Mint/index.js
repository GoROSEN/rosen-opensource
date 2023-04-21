import React, { useRef, useState } from 'react'
import {
  Alert,
  View,
  Text,
  TextInput,
  Image,
  StyleSheet,
  PixelRatio,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { useSelector } from 'react-redux'
import { captureRef } from 'react-native-view-shot'
import * as Sharing from 'expo-sharing'
import * as FileSystem from 'expo-file-system'
import { BlurView } from 'expo-blur'
import Header from '@/components/Header'
import Button from '@/components/Button'
import Popup from '@/components/Popup'
import Checkbox from '@/components/Checkbox'
import SvgIcon from '@/components/SvgIcon'
import Avatar from './Avatar2'
import Aword from './Aword'
import ShareCard from '@/screens/PersonalCell/Component/ShareCard'
import { globalStyles } from '@/constants'
import { ddtodms } from '@/utils'
import Friends from './Friends'
import { useGetUserBasicQuery } from '@/services/modules/member'
import { useMintMutation } from '@/services/modules/producer'
import { useTranslation } from 'react-i18next'

function MintManage({ route }) {
  const { t, i18n } = useTranslation()
  const navigation = useNavigation()
  const { data: baseInfo = {} } = useGetUserBasicQuery('', {
    refetchOnMountOrArgChange: true,
  })
  const [mintTrigger, { isLoading: isMintLoading }] = useMintMutation()
  const friendsCount = useRef(0)

  const { params: plotInfo = {} } = route
  const [nftPreviewWidth, setNftPreviewWidth] = useState(0)
  const [nftImageUri, setNftImageUri] = useState()
  const [shareImagePath, setShareImagePath] = useState()
  const [step, setStep] = useState(1)
  const [showFriends, setShowFriends] = useState(false)
  const [friends, setFriends] = useState([])
  const [showShareCardFlag, setShowShareCardFlag] = useState(false)
  const [optionThought, setOptionThought] = useState(false)
  const [optionBlazer, setOptionBlazer] = useState(false)
  const [optionYourself, setOptionYourself] = useState(false)
  const [optionLngAndLat, setOptionLngAndLat] = useState(false)
  const [thought, setThought] = useState()
  const [nftAmount, setNftAmount] = useState(plotInfo.mintPrice)
  const [nftQuantity, setNftQuantity] = useState('1')
  const [isTrial, setIsTrial] = useState(false)
  const [trialLoading, setTrialLoading] = useState(false)
  const [shareLoading, setShareLoading] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const [PopupContent, setPopupContent] = useState('')

  const onNftPreviewLayout = event => {
    setNftPreviewWidth(event.nativeEvent.layout.width)
  }

  const nftContainer = useRef()
  const shareContainer = useRef()

  // 将nft图片存到本地，mint的时候用
  const saveNFTImageToLocal = React.useCallback(imageUri => {
    const tmpFile = FileSystem.cacheDirectory + 'nft.png'
    return FileSystem.writeAsStringAsync(
      tmpFile,
      imageUri.replace('data:image/png;base64,', ''),
      {
        encoding: 'base64',
      },
    ).then(() => {
      return tmpFile
    })
  }, [])

  // 将share图片存到本地，share的时候用
  const saveShareImageToLocal = React.useCallback(imageUri => {
    const tmpFile = FileSystem.cacheDirectory + 'share.png'
    return FileSystem.writeAsStringAsync(
      tmpFile,
      imageUri.replace('data:image/png;base64,', ''),
      {
        encoding: 'base64',
      },
    ).then(() => {
      setShareImagePath(tmpFile)
      return tmpFile
    })
  }, [])

  // 生成nft图片
  const genNFTSnapshots = React.useCallback(() => {
    const targetPixelCount = 800
    const pixelRatio = PixelRatio.get()
    const pixels = targetPixelCount / pixelRatio

    return captureRef(nftContainer, {
      result: 'data-uri',
      height: pixels,
      width: pixels,
      quality: 0.7,
      format: 'png',
    })
  }, [])

  // 生成分享图片
  const genShareImage = React.useCallback(() => {
    const pixelRatio = PixelRatio.get()

    return captureRef(shareContainer, {
      result: 'data-uri',
      height: (750 * 1.8533) / pixelRatio,
      width: 750 / pixelRatio,
      quality: 0.7,
      format: 'png',
    })
  }, [])

  const handleBlazerPick = React.useCallback(() => {
    if (!optionBlazer) {
      if (friendsCount.current >= 4) {
        setShowPopup(true)
        setPopupContent(
          'The number of friends that can be added has reached the maximum',
        )
        return
      }
      friendsCount.current = friendsCount.current + 1
    } else {
      friendsCount.current = friendsCount.current - 1
    }
    setOptionBlazer(!optionBlazer)
  }, [optionBlazer])

  const handleYourselfPick = React.useCallback(() => {
    if (!optionYourself) {
      if (friendsCount.current >= 4) {
        setShowPopup(true)
        setPopupContent(
          'The number of friends that can be added has reached the maximum',
        )
        return
      }
      friendsCount.current = friendsCount.current + 1
    } else {
      friendsCount.current = friendsCount.current - 1
    }
    setOptionYourself(!optionYourself)
  }, [optionYourself])

  const stepNext = React.useCallback(curStep => {
    setStep(curStep)
  }, [])

  const handleHideFriends = React.useCallback(() => {
    setShowFriends(false)
  }, [])

  const handleSelectFriends = React.useCallback(
    item => {
      // 每次关闭需要将showFriends置为false
      // 不然下次打不开
      setShowFriends(false)

      if (friendsCount.current >= 4) {
        setShowPopup(true)
        setPopupContent(
          'The number of friends that can be added has reached the maximum',
        )
        return
      }

      // 给每次出现的位置设置随机数，最大值为250，最小值为16
      let friendItem = {}
      Object.keys(item).forEach(key => {
        friendItem[key] = item[key]
      })
      friendItem.id = friendItem.id + Math.floor(Math.random() * 99999)
      friendItem.initPositionX = Math.floor(Math.random() * (250 - 16 + 1) + 16)
      friendItem.initPositionY = Math.floor(Math.random() * (250 - 16 + 1) + 16)
      setFriends([...friends, friendItem])
      friendsCount.current = friendsCount.current + 1
    },
    [friends],
  )

  const handleTrial = React.useCallback(() => {
    setIsTrial(true)
    setTrialLoading(true)
    genNFTSnapshots().then(uri => {
      setTrialLoading(false)
      setNftImageUri(uri)
      stepNext(3)
    })
  }, [genNFTSnapshots, stepNext])

  const createFormData = React.useCallback((imageUri, body = {}) => {
    const fileName = imageUri.split('/').pop()
    const fileType = fileName.split('.').pop()
    const data = new FormData()
    Object.keys(body).forEach(key => {
      data.append(key, body[key])
    })
    data.append('img', {
      uri: imageUri,
      name: fileName,
      type: `image/${fileType}`,
    })
    return data
  }, [])

  const handleMint = React.useCallback(() => {
    setIsTrial(false)
    genNFTSnapshots().then(uri => {
      setNftImageUri(uri)
      saveNFTImageToLocal(uri).then(nftFile => {
        const body = createFormData(nftFile, {
          plotId: plotInfo.id,
          count: Number(nftQuantity),
        })
        mintTrigger(body).then(res => {
          if (res.data.code !== 20000) {
            setShowPopup(true)
            setPopupContent(t(res.data.msg, { fail: 'Mint failed' }))
          } else {
            setShowPopup(true)
            setPopupContent(
              t('message.mint.success', {
                quantity: nftQuantity,
                amount: Number(nftQuantity) * plotInfo.mintPrice,
                token: 'USDT',
              }),
            )
            stepNext(3)
          }
        })
      })
    })
  }, [
    createFormData,
    genNFTSnapshots,
    mintTrigger,
    nftQuantity,
    plotInfo.id,
    plotInfo.mintPrice,
    saveNFTImageToLocal,
    stepNext,
    t,
  ])

  const handleShare = React.useCallback(() => {
    if (shareImagePath) {
      setShareLoading(true)
      // setShowShareCardFlag(true)
      setTimeout(() => {
        setShareLoading(false)
        Sharing.shareAsync(shareImagePath, { mimeType: 'image/png' })
      }, 1000)
    } else {
      setShareLoading(true)
      genShareImage().then(uri => {
        // setShowShareCardFlag(true)
        saveShareImageToLocal(uri).then(nftFile => {
          setTimeout(() => {
            setShareLoading(false)
            Sharing.shareAsync(nftFile, { mimeType: 'image/png' })
          }, 1000)
        })
      })
    }
  }, [genShareImage, saveShareImageToLocal, shareImagePath])

  const handleDone = React.useCallback(() => {
    navigation.goBack()
  }, [navigation])

  const handlePopupClose = React.useCallback(() => {
    setShowPopup(false)
  }, [])

  // 监听返回事件
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', e => {
      console.log('beforeRemove')
      if (showFriends) {
        setShowFriends(false)
        e.preventDefault()
      }
    })
    return unsubscribe
  }, [navigation, showFriends])

  return (
    <SafeAreaView
      style={[globalStyles.container, globalStyles.containerPadding]}
    >
      <Header title={t('page.common.mint')} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {(step === 1 || step === 2) && (
          <KeyboardAvoidingView behavior="position" keyboardVerticalOffset={70}>
            <View
              style={[styles.nftPreview, { height: nftPreviewWidth }]}
              onLayout={event => onNftPreviewLayout(event)}
              ref={nftContainer}
            >
              <Image
                source={{ uri: `${plotInfo.cover}` }}
                style={[
                  { width: nftPreviewWidth, height: nftPreviewWidth },
                  styles.nftPrevieImg,
                ]}
              />
              <View style={styles.location}>
                <BlurView
                  style={styles.locationBlur}
                  intensity={50}
                  tint="dark"
                >
                  <SvgIcon iconName="location" iconSize={12} />
                  <Text style={styles.locationText}>{plotInfo.name}</Text>
                </BlurView>
              </View>
              {optionLngAndLat && (
                <View style={styles.coordinates}>
                  <BlurView
                    style={styles.coordinatesBlur}
                    intensity={50}
                    tint="dark"
                  >
                    <SvgIcon iconName="coordinates" iconSize={12} />
                    <View>
                      <Text style={styles.coordinatesText}>
                        {ddtodms(plotInfo.lat)}
                      </Text>
                      <Text style={styles.coordinatesText}>
                        {ddtodms(plotInfo.lng, true)}
                      </Text>
                    </View>
                  </BlurView>
                </View>
              )}
              {optionThought && (
                <Aword
                  containerHeight={nftPreviewWidth}
                  containerWidth={nftPreviewWidth}
                  word={thought}
                  initPositionX={16}
                  initPositionY={287}
                />
              )}
              {optionBlazer && (
                <Avatar
                  containerHeight={nftPreviewWidth}
                  containerWidth={nftPreviewWidth}
                  avatarImage={plotInfo.blazer?.avatar}
                  avatarName={plotInfo.blazer?.name}
                  initPositionX={250}
                  initPositionY={50}
                />
              )}
              {optionYourself && (
                <Avatar
                  containerHeight={nftPreviewWidth}
                  containerWidth={nftPreviewWidth}
                  avatarImage={baseInfo.avatar}
                  avatarName={baseInfo.displayName}
                  initPositionX={250}
                  initPositionY={100}
                />
              )}
              {friends.map((item, index) => (
                <Avatar
                  containerHeight={nftPreviewWidth}
                  containerWidth={nftPreviewWidth}
                  key={item.id}
                  avatarImage={item.avatar}
                  avatarName={item.displayName}
                  initPositionX={item.initPositionX}
                  initPositionY={item.initPositionY}
                  // 用来区分本地图片还是线上图片
                  local={item.local}
                />
              ))}
            </View>
            {step === 1 && (
              <View style={[styles.settingStep, styles.settingStep1]}>
                <View style={styles.settingStep1Item}>
                  <Checkbox
                    disableText
                    isChecked={optionThought}
                    size={20}
                    fillColor="#fff"
                    disableBuiltInState
                    onPress={() => {
                      setOptionThought(!optionThought)
                    }}
                  />
                  <View style={styles.settingStep1ItemValue}>
                    <TextInput
                      editable={optionThought}
                      value={thought}
                      style={styles.settingStep1ThoughtInput}
                      onChangeText={text => {
                        setThought(text)
                      }}
                      placeholder={t('page.mint.index.insert-your-thought')}
                      placeholderTextColor="rgba(255,255,255,0.2)"
                    />
                  </View>
                </View>
                <View style={styles.settingStep1Item}>
                  <Checkbox
                    disableText
                    isChecked={optionBlazer}
                    size={20}
                    fillColor="#fff"
                    disableBuiltInState
                    onPress={handleBlazerPick}
                  />
                  <View style={styles.settingStep1ItemValue}>
                    <Text style={styles.settingStep1ItemValueText}>
                      {t('page.common.blazer')}
                    </Text>
                  </View>
                </View>
                <View style={styles.settingStep1Item}>
                  <Checkbox
                    disableText
                    isChecked={optionYourself}
                    size={20}
                    fillColor="#fff"
                    disableBuiltInState
                    onPress={handleYourselfPick}
                  />
                  <View style={styles.settingStep1ItemValue}>
                    <Text style={styles.settingStep1ItemValueText}>
                      {t('page.mint.index.yourself')}
                    </Text>
                  </View>
                </View>
                <View
                  style={[styles.settingStep1Item, styles.settingStep1ItemLast]}
                >
                  <Checkbox
                    disableText
                    isChecked={optionLngAndLat}
                    size={20}
                    fillColor="#fff"
                    disableBuiltInState
                    onPress={() => {
                      setOptionLngAndLat(!optionLngAndLat)
                    }}
                  />
                  <View style={styles.settingStep1ItemValue}>
                    <Text style={styles.settingStep1ItemValueText}>
                      {t('page.mint.index.longitude-&-latitude')}
                    </Text>
                  </View>
                </View>
              </View>
            )}
            {step === 2 && (
              <View style={[styles.settingStep, styles.settingStep2]}>
                <View style={styles.settingStep2Head}>
                  <View style={styles.settingStep2Token}>
                    <Text style={styles.settingStep2TokenRosText}>USDT</Text>
                    <SvgIcon
                      iconName="usdt_symbol"
                      iconSize={8}
                      style={globalStyles.mR3}
                    />
                    <Text style={styles.settingStep2TokenAmountText}>
                      {baseInfo.token}
                    </Text>
                  </View>
                  <View style={styles.settingStep2Token}>
                    <Text style={styles.settingStep2TokenRosText}>
                      The quantity of NFT you can mint today
                    </Text>
                    <SvgIcon
                      iconName="blazer_manage"
                      iconSize={8}
                      style={[globalStyles.mR3, styles.mintIconBorder]}
                    />
                    <Text style={styles.settingStep2TokenAmountText}>
                      {plotInfo.mintLimitCur - plotInfo.mintCountOD > 0
                        ? plotInfo.mintLimitCur - plotInfo.mintCountOD
                        : 0}
                    </Text>
                  </View>
                </View>
                <View style={styles.settingStep2Body}>
                  <View style={styles.settingStep2Item}>
                    <View style={styles.settingStep2Value}>
                      <Text style={styles.settingStep2Num}>
                        {plotInfo.mintPrice}
                      </Text>
                      <View>
                        {plotInfo.mintPrice !== plotInfo.mintPrice && (
                          <Text style={styles.originalPriceText}>
                            {plotInfo.mintPrice}
                          </Text>
                        )}
                        <Text
                          style={
                            plotInfo.mintPrice === plotInfo.mintPrice
                              ? styles.settingStep2UnitAmount
                              : styles.settingStep2Unit
                          }
                        >
                          {t('page.mint.index.token/piece')}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.settingStep2Lable}>
                      {t('page.mint.index.mint-price')}
                    </Text>
                  </View>
                  <View style={styles.settingStep2Item}>
                    <View style={styles.settingStep2Value}>
                      <Text style={styles.settingStep2Num}>{nftAmount}</Text>
                      <Text style={styles.settingStep2UnitAmount}>USDT</Text>
                    </View>
                    <Text style={styles.settingStep2Lable}>
                      Total {t('page.mint.index.amount')}
                    </Text>
                  </View>
                  <View style={styles.settingStep2Item}>
                    <View style={styles.settingStep2Value}>
                      <TextInput
                        style={[styles.settingStep2Input]}
                        value={nftQuantity}
                        keyboardType="number-pad"
                        onChangeText={text => {
                          const newText = text.replace(/[^\d]+/, '')
                          // console.log(newText)
                          setNftQuantity(newText)
                          setNftAmount(plotInfo.mintPrice * newText)
                        }}
                      />
                    </View>
                    <Text style={styles.settingStep2Lable}>
                      {t('page.mint.index.quantity')}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </KeyboardAvoidingView>
        )}
        {step === 3 && (
          <View style={[styles.nftPreview, { height: nftPreviewWidth }]}>
            {nftImageUri && (
              <Image
                source={{ uri: nftImageUri }}
                style={{ width: nftPreviewWidth, height: nftPreviewWidth }}
              />
            )}
          </View>
        )}
        <View style={styles.btnContainer}>
          {step === 1 && (
            <View style={globalStyles.flexRowSpace}>
              <Button
                size="large"
                type="hollow"
                onPress={() => {
                  setShowFriends(true)
                }}
                style={styles.btn}
              >
                {t('page.mint.index.add-friend')}
              </Button>
              <Button
                size="large"
                onPress={() => {
                  stepNext(2)
                }}
                style={styles.btn}
              >
                {t('page.common.confirm')}
              </Button>
            </View>
          )}
          {step === 2 && (
            <View style={globalStyles.flexRowSpace}>
              <Button
                loading={trialLoading}
                size="large"
                type="hollow"
                onPress={handleTrial}
                style={styles.btn}
              >
                {t('page.mint.index.trial(free)')}
              </Button>

              <Button
                loading={isMintLoading}
                disabled={Number(nftQuantity) !== 0 ? false : true}
                size="large"
                onPress={handleMint}
                style={styles.btn}
              >
                {t('page.common.mint')} NFT
              </Button>
            </View>
          )}
          {step === 3 && (
            <View style={globalStyles.flexRowSpace}>
              <Button
                type="hollow"
                size="large"
                loading={shareLoading}
                onPress={handleShare}
                style={styles.btn}
              >
                {t('page.common.share')}
              </Button>
              <Button size="large" onPress={handleDone} style={styles.btn}>
                {t('page.common.done')}
              </Button>
            </View>
          )}
        </View>
      </ScrollView>

      <Friends
        show={showFriends}
        onHide={handleHideFriends}
        onSelected={handleSelectFriends}
      />
      <ShareCard
        isTrial={isTrial}
        nftImageUri={nftImageUri}
        innerRef={shareContainer}
        show={showShareCardFlag}
        onHide={() => setShowShareCardFlag(false)}
      />
      <Popup
        visible={showPopup}
        content={PopupContent}
        confirmButton={handlePopupClose}
      />
    </SafeAreaView>
  )
}
const styles = StyleSheet.create({
  nftPreview: {
    backgroundColor: '#000',
    position: 'relative',
    // borderRadius: 30,
    overflow: 'hidden',
    justifyContent: 'flex-start',
  },
  nftPrevieImg: {
    resizeMode: 'contain',
  },
  btnContainer: {
    // position: 'absolute',
    // left: 0,
    // right: 0,
    // bottom: 0,
    // backgroundColor: '#000',
    // paddingHorizontal: 24,
    paddingVertical: 24,
  },
  btn: {
    width: '48%',
  },
  location: {
    borderColor: 'rgba(255,225,255,0.6)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: 14,
    position: 'absolute',
    top: 14,
    left: 16,
    overflow: 'hidden',
  },
  originalPriceText: {
    fontSize: 10,
    textDecorationLine: 'line-through',
    color: 'white',
    alignSelf: 'flex-start',
    marginLeft: 2,
  },
  locationBlur: {
    height: 24,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  locationText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 5,
  },
  coordinates: {
    borderColor: 'rgba(255,225,255,0.6)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: 20,
    position: 'absolute',
    top: 50,
    left: 16,
    overflow: 'hidden',
  },
  coordinatesBlur: {
    height: 36,
    paddingLeft: 8,
    paddingRight: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  coordinatesText: {
    color: '#fff',
    fontSize: 10,
    marginLeft: 5,
  },
  avatarContainer: {
    width: 60,
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 5,
  },

  settingStep: {
    backgroundColor: '#232631',
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
  },
  settingStep1: {
    // marginBottom: 60,
  },
  settingStep1Item: {
    marginBottom: 14,
    flexDirection: 'row',
  },
  settingStep1ItemLast: {
    marginBottom: 0,
  },
  settingStep1ItemValue: {
    marginLeft: 12,
    flex: 1,
    height: 40,
    justifyContent: 'center',
    borderColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: 20,
    paddingHorizontal: 20,
  },
  settingStep1ItemValueText: {
    fontSize: 14,
    color: '#fff',
  },
  settingStep1ThoughtInput: {
    color: '#fff',
  },

  settingStep2: {},
  settingStep2Head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  settingStep2Token: {
    height: 20,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderStyle: 'solid',
    borderWidth: 1,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  settingStep2TokenRosText: {
    marginRight: 5,
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  settingStep2TokenAmountText: {
    fontSize: 8,
    color: '#fff',
  },
  settingStep2Body: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  settingStep2Item: {
    alignItems: 'center',
  },
  settingStep2Value: {
    flexDirection: 'row',
  },
  settingStep2Num: {
    color: '#fff',
    fontSize: 24,
  },
  settingStep2Unit: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 3,
  },
  settingStep2UnitAmount: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 3,
    marginTop: 11,
  },
  settingStep2Lable: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 5,
  },
  settingStep2Input: {
    borderColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: 6,
    height: 30,
    width: 30,
    color: '#fff',
    textAlign: 'center',
  },
  mintIconBorder: {
    borderWidth: 1,
    borderColor: '#fff',
    borderRadius: 3,
  },
})
export default MintManage
