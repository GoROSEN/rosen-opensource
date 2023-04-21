import React, { useCallback } from 'react'
import { Animated, StyleSheet, View, Dimensions, Easing } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import { globalStyles } from '@/constants'
import Header from '@/components/Header'
import Button from '@/components/Button'
import FriendList from '@/screens/Friend/index'
import AvatarEdit from './AvatarEdit'
import { useTranslation } from 'react-i18next'

const windowWidth = Dimensions.get('window').width

const Friends = props => {
  const { t, i18n } = useTranslation()
  console.log('Friends wrapper rander')
  const hideCallback = props.onHide
  const [friend, setFriend] = React.useState()
  const [showAvatarEdit, setShowAvatarEdit] = React.useState(false)
  const [pickedImagePath, setPickedImagePath] = React.useState()

  // 位置信息面板动画
  const friendListPanelAnimFrom = {
    translateY: windowWidth,
  }
  const friendListPanelAnimTo = {
    translateY: 0,
  }
  const friendListPanelX = React.useRef(
    new Animated.Value(friendListPanelAnimFrom.translateY),
  ).current
  const showFriendListPanel = React.useCallback(() => {
    Animated.timing(friendListPanelX, {
      toValue: friendListPanelAnimTo.translateY,
      duration: 200,
      easing: Easing.bezier(0.27, 0.3, 0, 0.98),
      useNativeDriver: true,
    }).start()
  }, [friendListPanelX, friendListPanelAnimTo.translateY])

  const hideFriendListPanel = React.useCallback(() => {
    Animated.timing(friendListPanelX, {
      toValue: friendListPanelAnimFrom.translateY,
      duration: 200,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start()

    hideCallback()
  }, [friendListPanelX, friendListPanelAnimFrom.translateY, hideCallback])

  const upload = useCallback(async () => {
    // let { status } = await MediaLibrary.requestPermissionsAsync()
    // if (status === 'granted') {
    // }

    // console.log(status)
    // let media = await MediaLibrary.getAssetsAsync({
    //   mediaType: ['photo'],
    // })
    // let video = await MediaLibrary.getAssetInfoAsync(media.assets[0])
    // console.log(video)
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 1,
    })
    if (result.uri) {
      setPickedImagePath(result.uri)
      setShowAvatarEdit(true)
    }
  }, [])

  React.useEffect(() => {
    if (props.show) {
      showFriendListPanel()
    } else {
      hideFriendListPanel()
    }
  }, [props.show, showFriendListPanel, hideFriendListPanel])

  const handleSelectFriends = React.useCallback(item => {
    setFriend(item)
  }, [])

  const handleAvatarEditHide = React.useCallback(() => {
    setShowAvatarEdit(false)
  }, [])

  const handleAvatarEditPick = React.useCallback(
    item => {
      // 每次关闭需要将showAvatarEdit置为false
      // 不然下次打不开
      setShowAvatarEdit(false)
      hideFriendListPanel()
      props.onSelected(item)
    },
    [hideFriendListPanel, props],
  )

  return (
    <Animated.View
      style={[
        {
          transform: [{ translateX: friendListPanelX }],
        },
        styles.container,
      ]}
    >
      <SafeAreaView
        style={[globalStyles.container, globalStyles.containerPadding]}
      >
        <Header goBackCb={hideFriendListPanel} />

        <FriendList onChange={handleSelectFriends} />

        <View style={styles.btnContainer}>
          <View style={globalStyles.flexRowSpace}>
            <Button
              size="large"
              type="hollow"
              onPress={() => {
                upload()
              }}
              style={styles.btn}
            >
              {t('page.mint.friend.upload-pic')}
            </Button>
            <Button
              size="large"
              disabled={!friend}
              onPress={() => {
                hideFriendListPanel()
                props.onSelected(friend)
              }}
              style={styles.btn}
            >
              {t('page.common.confirm')}
            </Button>
          </View>
        </View>

        <AvatarEdit
          imageUri={pickedImagePath}
          show={showAvatarEdit}
          onHide={handleAvatarEditHide}
          onPick={handleAvatarEditPick}
        />
      </SafeAreaView>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 10,
  },
  header: {
    position: 'absolute',
    top: 30,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: '#000',
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  btnContainer: {
    paddingVertical: 24,
  },
})

export default React.memo(Friends)
