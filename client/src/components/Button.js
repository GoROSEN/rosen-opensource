import React from 'react'
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import LinearGradientText from '@/components/LinearGradientText'

const Button = props => {
  const {
    loading = false,
    type = 'default',
    size = 'middle',
    disabled = false,
    children,
    block = false,
    style,
    onPress,
  } = props

  const handleClick = e => {
    if (loading || disabled) {
      e.preventDefault()
      return
    }
    onPress && onPress(e)
  }

  const sizeStyleNameMap = {
    xsamll: 'XSmall',
    small: 'Small',
    middle: 'Middle',
    large: 'Large',
    xlarge: 'XLarge',
  }
  const sizeStyle = styles[`button${sizeStyleNameMap[size]}`] || ''
  const innerSizeStyle = styles[`button${sizeStyleNameMap[size]}Inner`] || ''
  const textStyle = styles[`button${sizeStyleNameMap[size]}Text`] || ''

  const textSizeMap = {
    xsamll: 12,
    small: 14,
    middle: 18,
    large: 20,
    xlarge: 24,
  }
  const textSize = textSizeMap[size]

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[styles.button, sizeStyle, block ? styles.buttonBlock : '', style]}
      onPress={handleClick}
    >
      <LinearGradient
        start={{ x: 0, y: 0.25 }}
        end={{ x: 0.8, y: 1 }}
        colors={disabled ? ['#666', '#999'] : ['#B04CFF', '#0CC4FF']}
        style={styles.buttonLinearGradientBg}
      >
        {type === 'default' &&
          (loading ? (
            <ActivityIndicator color="#0CC4FF" />
          ) : (
            <Text
              style={[
                styles.buttonText,
                textStyle,
                !style?.width ? styles.buttonLargePadding : '',
              ]}
            >
              {children}
            </Text>
          ))}
        {type === 'hollow' && (
          <View
            style={[
              styles.buttonInner,
              innerSizeStyle,
              !style?.width ? styles.buttonLargePadding : '',
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#0CC4FF" />
            ) : disabled ? (
              <Text style={[styles.buttonText, textStyle, { opacity: 0.7 }]}>
                {children}
              </Text>
            ) : (
              <LinearGradientText size={textSize}>
                {children}
              </LinearGradientText>
            )}
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  buttonSmall: {
    height: 26,
    borderRadius: 13,
  },
  buttonMiddle: {
    height: 40,
    borderRadius: 20,
  },
  buttonLarge: {
    height: 50,
    borderRadius: 25,
  },
  buttonXLarge: {
    height: 60,
    borderRadius: 30,
  },
  buttonInner: {
    margin: 2,
    backgroundColor: '#191919',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonSmallInner: {
    height: 22,
    borderRadius: 11,
  },
  buttonMiddleInner: {
    height: 36,
    borderRadius: 18,
  },
  buttonLargeInner: {
    height: 46,
    borderRadius: 23,
  },
  buttonXLargeInner: {
    height: 56,
    borderRadius: 28,
  },
  buttonBlock: {
    flex: 1,
  },
  buttonLinearGradientBg: {
    flex: 1,
    justifyContent: 'center',
  },

  buttonText: {
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  buttonSmallText: {
    fontSize: 14,
  },
  buttonMiddleText: {
    fontSize: 18,
  },
  buttonLargeText: {
    fontSize: 20,
  },
  buttonXLargeText: {
    fontSize: 24,
  },

  buttonXSmallPadding: {
    paddingHorizontal: 8,
  },
  buttonSmallPadding: {
    paddingHorizontal: 12,
  },
  buttonMiddlePadding: {
    paddingHorizontal: 24,
  },
  buttonLargePadding: {
    paddingHorizontal: 32,
  },
  buttonXLargePadding: {
    paddingHorizontal: 48,
  },
})
export default React.memo(Button)
