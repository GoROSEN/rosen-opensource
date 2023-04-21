import * as React from 'react'
import { Animated, StyleSheet, View, Image } from 'react-native'

const ProgressiveImage = ({ thumbnailSource, source, style, ...props }) => {
  const thumbnailAnimated = React.useRef(new Animated.Value(0)).current
  const imageAnimated = React.useRef(new Animated.Value(0)).current

  const handleThumbnailLoad = () => {
    Animated.timing(thumbnailAnimated, {
      toValue: 1,
    }).start()
  }

  const handleImageLoad = () => {
    Animated.timing(imageAnimated, {
      toValue: 1,
    }).start()
  }

  return (
    <View style={styles.container}>
      <Animated.Image
        {...props}
        source={thumbnailSource}
        style={[style, { opacity: thumbnailAnimated }]}
        onLoad={handleThumbnailLoad}
        blurRadius={1}
      />
      <Animated.Image
        {...props}
        source={source}
        style={[styles.imageOverlay, { opacity: imageAnimated }, style]}
        onLoad={handleImageLoad}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  imageOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
  },
  container: {
    backgroundColor: '#e1e4e8',
  },
})
export default ProgressiveImage
