import React, { useCallback } from 'react'
import {
  Animated,
  StyleSheet,
  View,
  Text,
  ViewStyle,
  LayoutChangeEvent,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'

import * as ImagePicker from 'expo-image-picker'

import TouchIcon from '@/components/TouchIcon'

type PageProps = {
  chatId?: number
  /** 选择相册图片或者拍照图片后的回调函数 */
  onImagePick: (assets: ImagePicker.ImagePickerAsset[]) => void
  /** Toolbox 移动动画样式 */
  style: ViewStyle
  /** Toolbox 布局回调函数 */
  onLayout: (event: LayoutChangeEvent) => void
}

const Toolbox: React.FC<PageProps> = props => {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const [cameraPermissionStatus, requestPermission] =
    ImagePicker.useCameraPermissions()
  const handleAlbumPick = useCallback(async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      // allowsMultipleSelection: true,
      // selectionLimit: 3,
      // allowsEditing: true,
      // base64: true,
      quality: 1,
    })
    if (!result.canceled && result.assets.length > 0) {
      props.onImagePick(result.assets)
    }
  }, [props])

  const handleCameraPick = useCallback(async () => {
    if (!cameraPermissionStatus?.granted) {
      if (
        cameraPermissionStatus?.canAskAgain &&
        cameraPermissionStatus?.status !== 'denied'
      ) {
        await requestPermission()
      } else {
        return console.log('no permission')
      }
    }
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      // base64: true,
      quality: 0.5,
    })
    if (!result.canceled && result.assets.length > 0) {
      props.onImagePick(result.assets)
    }
  }, [props, requestPermission, cameraPermissionStatus])

  const handleTransfer = useCallback(() => {
    navigation.navigate('InitiateTransfer', { id: props.chatId! })
  }, [navigation, props.chatId])

  return (
    <Animated.View
      style={[styles.absolute, styles.toolbox, props.style]}
      onLayout={props.onLayout}
    >
      <View style={styles.toolItem}>
        <TouchIcon
          iconName="album"
          iconSize={34}
          style={styles.toolItemIcon}
          hitSlop={0}
          onPress={handleAlbumPick}
        />
        <Text style={styles.toolItemLabel}>{t('page.common.album')}</Text>
      </View>
      <View style={styles.toolItem}>
        <TouchIcon
          iconName="camera"
          iconSize={34}
          style={styles.toolItemIcon}
          hitSlop={0}
          onPress={handleCameraPick}
        />
        <Text style={styles.toolItemLabel}>{t('page.common.camera')}</Text>
      </View>

      <View style={styles.toolItem}>
        <TouchIcon
          iconName="transfer"
          iconSize={34}
          style={styles.toolItemIcon}
          hitSlop={0}
          onPress={handleTransfer}
        />
        <Text style={styles.toolItemLabel}>{t('page.common.transfer')}</Text>
      </View>
    </Animated.View>
  )
}

export default React.memo(Toolbox)

const styles = StyleSheet.create({
  absolute: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  toolbox: {
    backgroundColor: '#232631',
    height: 100,
    flexDirection: 'row',
    paddingHorizontal: 20,
    transform: [{ translateY: 100 }],
  },
  toolItem: {
    marginRight: 30,
  },
  toolItemIcon: {
    height: 60,
    width: 60,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginBottom: 5,
  },
  toolItemLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#575B66',
    textAlign: 'center',
  },
})
