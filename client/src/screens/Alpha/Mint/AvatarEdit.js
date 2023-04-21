import React from 'react'
import {
  Animated,
  PanResponder,
  StyleSheet,
  View,
  TextInput,
  Image,
  PixelRatio,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
} from 'react-native'
import { captureRef } from 'react-native-view-shot'
import { globalStyles } from '@/constants'
import TouchIcon from '@/components/TouchIcon'
import Button from '@/components/Button'
import { useTranslation } from 'react-i18next'

const windowWidth = Dimensions.get('window').width

const AvatarEdit = props => {
  const { t, i18n } = useTranslation()
  const hideCallback = props.onHide
  const [avatarEditContainerWidth, setAvatarEditContainerWidth] =
    React.useState()
  const [avatarName, setAvatarName] = React.useState()
  const [loading, setLoading] = React.useState(false)
  const avatarEditContainer = React.createRef()

  const getAvatarSnapshots = React.useCallback(() => {
    const targetPixelCount = 1080
    const pixelRatio = PixelRatio.get()
    const pixels = targetPixelCount / pixelRatio

    return captureRef(avatarEditContainer, {
      result: 'data-uri',
      height: pixels,
      width: pixels,
      quality: 1,
      format: 'png',
    })
  }, [avatarEditContainer])

  console.log(props)

  // 位置信息面板动画
  const searchPanelAnimFrom = {
    translateY: windowWidth,
  }
  const searchPanelAnimTo = {
    translateY: 0,
  }
  const searchPanelX = React.useRef(
    new Animated.Value(searchPanelAnimFrom.translateY),
  ).current
  const showSearchPanel = React.useCallback(() => {
    Animated.timing(searchPanelX, {
      toValue: searchPanelAnimTo.translateY,
      duration: 200,
      easing: Easing.bezier(0.27, 0.3, 0, 0.98),
      useNativeDriver: true,
    }).start()
  }, [searchPanelX, searchPanelAnimTo.translateY])

  const hideSearchPanel = React.useCallback(() => {
    Animated.timing(searchPanelX, {
      toValue: searchPanelAnimFrom.translateY,
      duration: 200,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start()

    hideCallback()
  }, [searchPanelX, searchPanelAnimFrom.translateY, hideCallback])

  const pan = React.useRef(
    new Animated.ValueXY({
      x: 0,
      y: 0,
    }),
  ).current

  const panResponder = React.useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: pan.x._value,
          y: pan.y._value,
        })
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: () => {
        pan.flattenOffset()
      },
    }),
  ).current

  React.useEffect(() => {
    if (props.show) {
      showSearchPanel()
    }
  }, [props.show, showSearchPanel])

  return (
    <Animated.View
      style={[
        {
          transform: [{ translateX: searchPanelX }],
        },
        globalStyles.container,
        globalStyles.containerPadding,
        styles.container,
      ]}
    >
      <View style={styles.header}>
        <TouchIcon
          iconName="arrow_left"
          iconSize={20}
          onPress={() => hideSearchPanel()}
          style={[styles.arrowIcon]}
        />
      </View>
      <KeyboardAvoidingView behavior="position" keyboardVerticalOffset={100}>
        <View
          style={[{ height: avatarEditContainerWidth }, styles.avatarEdit]}
          onLayout={event =>
            setAvatarEditContainerWidth(event.nativeEvent.layout.width)
          }
        >
          <View style={styles.avatarEditMask} ref={avatarEditContainer}>
            {props.imageUri && (
              <Animated.View
                style={{
                  transform: [{ translateX: pan.x }, { translateY: pan.y }],
                }}
                {...panResponder.panHandlers}
              >
                <Image
                  source={{ uri: `${props.imageUri}?x-oss-process=style/p_60` }}
                  style={styles.avatarEditImage}
                />
              </Animated.View>
            )}
          </View>
        </View>

        <View style={styles.avatarName}>
          <TextInput
            value={avatarName}
            style={styles.avatarNameInput}
            onChangeText={text => {
              setAvatarName(text)
            }}
            placeholder={t('page.mint.avataredit.input-name')}
            placeholderTextColor="rgba(255,255,255,0.2)"
          />
        </View>
      </KeyboardAvoidingView>
      <View style={styles.btnContainer}>
        <Button
          loading={loading}
          size="xlarge"
          onPress={() => {
            setLoading(true)
            getAvatarSnapshots().then(uri => {
              setLoading(false)
              props.onPick({
                id: new Date().getTime(),
                avatar: uri,
                displayName: avatarName,
                local: true,
              })
              setAvatarName('')
              hideSearchPanel()
            })
          }}
          style={styles.btn}
        >
          {t('page.common.confirm')}
        </Button>
      </View>
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
  avatarEdit: {
    borderRadius: 30,
    borderColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderStyle: 'solid',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditMask: {
    width: 200,
    height: 200,
    borderRadius: 100,
    overflow: 'hidden',
  },
  avatarEditImage: {
    width: 200,
    height: 200,
  },
  avatarName: {
    marginTop: 20,
    height: 60,
    borderRadius: 30,
    borderColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderStyle: 'solid',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  avatarNameInput: {
    color: '#fff',
    flex: 1,
  },
  btnContainer: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 0,
    paddingVertical: 24,
  },
})

export default React.memo(AvatarEdit)
