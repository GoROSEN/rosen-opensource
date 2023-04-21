import React, { useRef, useState, useCallback } from 'react'
import { View, Text, Image, StyleSheet, PixelRatio } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { captureRef } from 'react-native-view-shot'
import * as Sharing from 'expo-sharing'
import * as FileSystem from 'expo-file-system'
import ShareCard from './Component/ShareCard'
import Header from '@/components/Header'
import Button from '@/components/Button'
import SvgIcon from '@/components/SvgIcon'
import Popup from '@/components/Popup'
import { globalStyles } from '@/constants'
import Friends from './Friends'
import {
  useGetGalleryByIdQuery,
  useAssetsTransferMutation,
} from '@/services/modules/member'
import { useTranslation } from 'react-i18next'

const tmpFile = FileSystem.cacheDirectory + 'share.png'

function Share({ route }) {
  const { t, i18n } = useTranslation()
  const navigation = useNavigation()
  const { data: plotData = {} } = useGetGalleryByIdQuery(route.params.id, {
    refetchOnMountOrArgChange: true,
  })
  const [assetsTransferTrigger] = useAssetsTransferMutation()
  const [shareImagePath, setShareImagePath] = useState(0)
  const [nftPreviewWidth, setNftPreviewWidth] = useState(0)
  const [step, setStep] = useState(1)
  const [showFriends, setShowFriends] = useState(false)
  const [friend, setFriend] = useState({})
  const [showShareCardFlag, setShowShareCardFlag] = useState(false)
  const [shareLoading, setShareLoading] = useState(false)
  const [transferLoading, setTransferLoading] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const [PopupContent, setPopupContent] = useState('')
  const shareContainer = useRef()

  const genShareImage = useCallback(() => {
    const pixelRatio = PixelRatio.get()

    return captureRef(shareContainer, {
      result: 'data-uri',
      height: (750 * 1.8533) / pixelRatio,
      width: 750 / pixelRatio,
      quality: 0.7,
      format: 'png',
    })
  }, [])

  const saveShareImageToLocal = useCallback(imageUri => {
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

  const handleShare = useCallback(() => {
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

  // const handleShare = () => {
  //   if (shareImagePath) {
  //     Sharing.shareAsync(tmpFile, { mimeType: 'image/png' })
  //   } else {
  //     setShareLoading(true)
  //     FileSystem.downloadAsync(plotData.logo, tmpFile).then(() => {
  //       setShareLoading(false)
  //       setShareImagePath(1)
  //       Sharing.shareAsync(tmpFile, { mimeType: 'image/png' })
  //     })
  //   }
  // }

  const onNftPreviewLayout = useCallback(event => {
    setNftPreviewWidth(event.nativeEvent.layout.width)
  }, [])

  const stepNext = useCallback(curStep => {
    setStep(curStep)
  }, [])

  const handleFriendSelect = React.useCallback(
    item => {
      setShowFriends(false)
      setFriend(item)
      stepNext(2)
    },
    [stepNext],
  )

  const handleFriendsPanelHide = React.useCallback(() => {
    setShowFriends(false)
  }, [])

  const handleAssetsTransfer = React.useCallback(() => {
    setTransferLoading(true)
    assetsTransferTrigger({
      id: route.params.id,
      receiverId: friend.id,
    }).then(res => {
      setTransferLoading(false)
      if (res.data.code === 501) {
        setShowPopup(true)
        setPopupContent(res.data.msg)
      } else {
        stepNext(3)
      }
    })
  }, [assetsTransferTrigger, friend.id, route.params.id, stepNext])

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
      if (showShareCardFlag) {
        setShowShareCardFlag(false)
        e.preventDefault()
      }
    })
    return unsubscribe
  }, [navigation, showFriends, showShareCardFlag])

  return (
    <SafeAreaView
      style={[globalStyles.container, globalStyles.containerPadding]}
    >
      <Header title={t('page.common.share')} />
      <View
        style={[styles.nftPreview]}
        onLayout={event => onNftPreviewLayout(event)}
      >
        {plotData.logo && (
          <Image
            defaultSource={globalStyles.defaultImage}
            source={{ uri: `${plotData.logo}?x-oss-process=style/webp` }}
            style={{ width: nftPreviewWidth, height: nftPreviewWidth }}
          />
        )}
      </View>
      {step === 2 && (
        <View style={styles.status}>
          <View style={styles.statusInner}>
            <SvgIcon iconName="sendto" iconSize={16} />
            <Text style={styles.statusText}>
              {t('page.personalcell.share.to')} {friend.displayName}
            </Text>
          </View>
        </View>
      )}
      {step === 3 && (
        <View style={styles.status}>
          <View style={styles.statusInner}>
            <SvgIcon iconName="success" iconSize={16} />
            <Text style={styles.statusText}>
              {t('page.personalcell.share.succesfully-sent!')}
            </Text>
          </View>
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
              {t('page.personalcell.share.gift')}
            </Button>

            <Button
              loading={shareLoading}
              size="large"
              onPress={() => {
                handleShare()
              }}
              style={styles.btn}
            >
              {t('page.common.share')}
            </Button>
          </View>
        )}
        {step === 2 && (
          <View style={globalStyles.flexRowSpace}>
            <Button
              size="large"
              type="hollow"
              onPress={() => {
                stepNext(1)
              }}
              style={styles.btn}
            >
              {t('page.common.cancel')}
            </Button>

            <Button
              loading={transferLoading}
              size="large"
              onPress={handleAssetsTransfer}
              style={styles.btn}
            >
              {t('page.common.confirm')}
            </Button>
          </View>
        )}
        {step === 3 && (
          <View>
            <Button block size="large" onPress={handleDone}>
              {t('page.common.done')}
            </Button>
          </View>
        )}
      </View>

      <Popup
        visible={showPopup}
        content={PopupContent}
        confirmButton={handlePopupClose}
      />
      <Friends
        show={showFriends}
        onHide={handleFriendsPanelHide}
        onSelected={handleFriendSelect}
      />
      <ShareCard
        nftImageUri={plotData.logo}
        innerRef={shareContainer}
        show={showShareCardFlag}
        onHide={() => setShowShareCardFlag(false)}
      />
    </SafeAreaView>
  )
}
const styles = StyleSheet.create({
  nftPreview: {
    position: 'relative',
    borderRadius: 30,
    overflow: 'hidden',
    justifyContent: 'flex-start',
    marginBottom: 20,
  },
  btnContainer: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 24,
  },
  btn: {
    width: '45%',
  },

  status: {
    borderRadius: 20,
    backgroundColor: '#232631',
    alignItems: 'center',
    justifyContent: 'center',
    height: 80,
  },
  statusInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
})
export default Share
