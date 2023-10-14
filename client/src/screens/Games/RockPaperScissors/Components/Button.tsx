import React, { ReactNode } from 'react'
import {
  ActivityIndicator,
  // View,
  Text,
  ImageBackground,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  ImageStyle,
  TextStyle,
  GestureResponderEvent,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { globalStyles } from '@/constants'

type Props = {
  /** 是否显示loading图标，默认为 false */
  loading?: boolean
  /** 是否禁用，默认为 false */
  disabled?: boolean
  /** button 大小，默认为 'medium'（height: 40） */
  size?: 'small' | 'medium' | 'large'
  btnStyle?: ViewStyle
  btnTextStyle?: TextStyle
  onPress?: (event: GestureResponderEvent) => void
  children: ReactNode
}

const Button: React.FC<Props> = props => {
  const { i18n } = useTranslation()
  const {
    disabled = false,
    loading = false,
    size = 'medium',
    children,
    btnStyle,
    btnTextStyle,
    onPress,
  } = props

  const handleClick = (event: GestureResponderEvent) => {
    if (loading || disabled) {
      event.preventDefault()
      return
    }
    onPress && onPress(event)
  }

  const sizeStyleNameMap = {
    small: 'Small',
    medium: 'Medium',
    large: 'Large',
  }
  const btnSizeStyle = styles[`button${sizeStyleNameMap[size]}`] || null
  const btnTextSizeStyle =
    functionStyles[`button${sizeStyleNameMap[size]}Text`](
      i18n.language.substring(0, 2) === 'es',
    ) || null

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[styles.button, btnSizeStyle, btnStyle]}
      onPress={handleClick}
    >
      <ImageBackground
        source={require('@/assets/images/games/rps/go_btn.png')}
        style={styles.buttonBgImage}
      >
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text
            style={[
              i18n.language.substring(0, 2) !== 'zh'
                ? globalStyles.poetsenOneFamily
                : null,
              styles.buttonText,
              btnTextSizeStyle,
              btnTextStyle,
            ]}
          >
            {children}
          </Text>
        )}
      </ImageBackground>
    </TouchableOpacity>
  )
}

type FunctionStyles = Record<string, (params: boolean) => TextStyle>
const functionStyles: FunctionStyles = {
  buttonSmallText: isEs => {
    return isEs ? { fontSize: 12 } : { fontSize: 14 }
  },
  buttonMediumText: isEs => {
    return isEs ? { fontSize: 16 } : { fontSize: 20 }
  },
  buttonLargeText: isEs => {
    return isEs ? { fontSize: 24 } : { fontSize: 30 }
  },
}

type Styles = Record<string, ViewStyle | ImageStyle | TextStyle>
const styles: Styles = StyleSheet.create({
  button: {
    height: 49.3,
    aspectRatio: 3.54,
    overflow: 'hidden',
  },
  buttonSmall: {
    height: 26,
    borderRadius: 13,
  },
  buttonMedium: {
    height: 49.3,
  },
  buttonLarge: {
    height: 75,
  },
  buttonBgImage: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  buttonText: {
    fontSize: 30,
    // lineHeight: 34,
    color: '#000',
    textAlign: 'center',
  },
})
export default React.memo(Button)
