import React, { useRef, useState, useCallback } from 'react'
import {
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
  StyleSheet,
  PixelRatio,
  View,
  Image,
  ImageBackground,
  TouchableOpacity,
  Text,
  Dimensions,
} from 'react-native'
import { useSelector } from 'react-redux'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { datetime } from '@/utils'

const screenHeight = Dimensions.get('screen').height
const screenWidth = Dimensions.get('screen').width
const containerWidth = 375
const pixelRatio = PixelRatio.get()

const ShareCard = props => {
  const insets = useSafeAreaInsets()
  const userInfo = useSelector(state => state.authUser.userInfo)
  const hideCallback = props.onHide

  // 位置信息面板动画
  const shareCardAnimFrom = {
    translateY: screenHeight,
  }
  const shareCardAnimTo = {
    translateY: 0,
  }
  const shareCardY = useRef(
    new Animated.Value(shareCardAnimFrom.translateY),
  ).current

  const showShareCard = useCallback(() => {
    Animated.timing(shareCardY, {
      toValue: shareCardAnimTo.translateY,
      duration: 150,
      easing: Easing.bezier(0.27, 0.3, 0, 0.98),
      useNativeDriver: true,
    }).start()
  }, [shareCardY, shareCardAnimTo.translateY])

  const hideShareCard = useCallback(() => {
    Animated.timing(shareCardY, {
      toValue: shareCardAnimFrom.translateY,
      duration: 150,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start()
    hideCallback()
  }, [shareCardY, shareCardAnimFrom.translateY, hideCallback])

  React.useEffect(() => {
    if (props.show) {
      showShareCard()
    } else {
      hideShareCard()
    }
  }, [props.show, showShareCard, hideShareCard])

  return (
    <Animated.View
      ref={props.innerRef}
      style={[
        {
          transform: [{ translateY: shareCardY }],
          marginTop: insets.top,
        },
        styles.container,
      ]}
    >
      <ImageBackground
        source={require('@/assets/images/share_bg.jpg')}
        style={styles.containerBackground}
        imageStyle={styles.containerBackgroundImageStyle}
      >
        {/* <TouchIcon
              iconName="close"
              iconSize={20}
              onPress={hideShareCard}
              style={styles.closeBtn}
            /> */}
        {props.isTrial && (
          <Image
            source={require('@/assets/images/trial.png')}
            style={styles.trial}
          />
        )}
        <Image
          source={{
            uri: props.nftImageUri,
          }}
          style={styles.nftImage}
        />
        <Text style={styles.userEmail}>{userInfo.member?.email}</Text>
        <Text style={styles.currentTime}>{datetime.currentTime()}</Text>
      </ImageBackground>
    </Animated.View>
  )
}

export default ShareCard

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: (screenWidth - containerWidth) / 2,
    top: 0,
    zIndex: 10,
    width: containerWidth,
    height: containerWidth * 1.8533,
  },
  containerBackground: {
    width: containerWidth,
    height: containerWidth * 1.8533,
    alignItems: 'center',
  },
  containerBackgroundImageStyle: {
    resizeMode: 'cover',
  },
  closeBtn: {
    position: 'absolute',
    right: 10,
    top: 10,
  },
  trial: {
    position: 'absolute',
    right: 35,
    top: 65,
    width: 60,
    height: 60,
    zIndex: 2,
  },
  nftImage: {
    width: 290,
    height: 290,
    top: 70,
    borderRadius: 24,
  },
  userEmail: {
    position: 'absolute',
    top: 428,
    fontSize: 14,
    color: '#fff',
  },
  currentTime: {
    position: 'absolute',
    top: 448,
    fontSize: 14,
    color: '#fff',
  },
})
