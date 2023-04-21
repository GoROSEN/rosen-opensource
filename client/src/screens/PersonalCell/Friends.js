import React from 'react'
import { Animated, StyleSheet, View, Dimensions, Easing } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { globalStyles } from '@/constants'
import Button from '@/components/Button'
import FriendList from '@/screens/Friend/index'
import Header from '@/components/Header'
import { useTranslation } from 'react-i18next'

const windowWidth = Dimensions.get('window').width

const Friends = props => {
  const { t, i18n } = useTranslation()
  const hideCallback = props.onHide
  const [friend, setFriend] = React.useState()

  // 位置信息面板动画
  const friendPanelAnimFrom = {
    translateY: windowWidth,
  }
  const friendPanelAnimTo = {
    translateY: 0,
  }
  const friendPanelX = React.useRef(
    new Animated.Value(friendPanelAnimFrom.translateY),
  ).current
  const showFriendPanel = React.useCallback(() => {
    Animated.timing(friendPanelX, {
      toValue: friendPanelAnimTo.translateY,
      duration: 200,
      easing: Easing.bezier(0.27, 0.3, 0, 0.98),
      useNativeDriver: true,
    }).start()
  }, [friendPanelX, friendPanelAnimTo.translateY])

  const hideFriendPanel = React.useCallback(() => {
    Animated.timing(friendPanelX, {
      toValue: friendPanelAnimFrom.translateY,
      duration: 200,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start()

    hideCallback()
  }, [friendPanelX, friendPanelAnimFrom.translateY, hideCallback])

  const handleFriendChange = React.useCallback(item => {
    setFriend(item)
  }, [])

  React.useEffect(() => {
    if (props.show) {
      showFriendPanel()
    } else {
      hideFriendPanel()
    }
  }, [props.show, showFriendPanel, hideFriendPanel])

  return (
    <Animated.View
      style={[
        {
          transform: [{ translateX: friendPanelX }],
        },
        styles.container,
      ]}
    >
      <SafeAreaView
        style={[globalStyles.container, globalStyles.containerPadding]}
      >
        <Header goBackCb={hideFriendPanel} />

        <FriendList onChange={handleFriendChange} />

        <View style={styles.btnContainer}>
          <Button
            size="large"
            disabled={!friend}
            onPress={() => {
              hideFriendPanel()
              props.onSelected(friend)
            }}
            style={styles.btn}
          >
            {t('page.common.confirm')}
          </Button>
        </View>
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
    paddingBottom: 24,
  },
})

export default Friends
