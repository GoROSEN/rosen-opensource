import * as React from 'react'
import { Text, View, Image, Animated, Pressable } from 'react-native'
import styles, { _textStyle } from './Checkbox.style'
const defaultCheckImage = require('./check.png')
class Checkbox extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      checked: false,
      springValue: new Animated.Value(1),
      bounceValue: new Animated.Value(1),
    }
  }
  componentDidMount() {
    this.setState({ checked: this.props.isChecked || false })
  }
  bounceEffect = (value, velocity, bounciness) => {
    const { useNativeDriver = true } = this.props
    Animated.spring(this.state.bounceValue, {
      toValue: value,
      velocity,
      bounciness,
      useNativeDriver,
    }).start()
  }
  renderCheckIcon = () => {
    const { checked } = this.state
    const {
      size = 25,
      iconStyle,
      iconComponent,
      iconImageStyle,
      fillColor = '#ffc484',
      ImageComponent = Image,
      unfillColor = 'transparent',
      disableBuiltInState,
      isChecked,
      innerIconStyle,
      checkIconImageSource = defaultCheckImage,
    } = this.props
    const checkStatus = disableBuiltInState ? isChecked : checked
    return (
      <Animated.View
        style={[
          { transform: [{ scale: this.state.bounceValue }] },
          styles.iconContainer(size, checkStatus, fillColor, unfillColor),
          iconStyle,
        ]}
      >
        <View
          style={[styles.innerIconContainer(size, fillColor), innerIconStyle]}
        >
          {iconComponent ||
            (checkStatus && (
              <ImageComponent
                source={checkIconImageSource}
                style={[styles.iconImageStyle, iconImageStyle]}
              />
            ))}
        </View>
      </Animated.View>
    )
  }
  renderCheckboxText = () => {
    const {
      text,
      textComponent,
      isChecked,
      textStyle,
      textContainerStyle,
      disableBuiltInState,
      disableText = false,
    } = this.props
    const { checked } = this.state
    const checkDisableTextType = typeof disableText === 'undefined'
    return (
      (!disableText || checkDisableTextType) &&
      (textComponent || (
        <View style={[styles.textContainer, textContainerStyle]}>
          <Text
            style={[
              _textStyle(disableBuiltInState ? isChecked : checked),
              textStyle,
            ]}
          >
            {text}
          </Text>
        </View>
      ))
    )
  }
  handleCheck = e => {
    // console.log(e)
    e.stopPropagation()
    const { disableBuiltInState = false } = this.props
    const { checked } = this.state
    if (!disableBuiltInState) {
      this.setState({ checked: !checked }, () => {
        this.props.onPress && this.props.onPress(this.state.checked)
      })
    } else {
      this.props.onPress && this.props.onPress(this.state.checked)
    }
  }
  render() {
    const {
      style,
      bounceEffectIn = 0.9,
      bounceEffectOut = 1,
      bounceVelocityIn = 0.1,
      bounceVelocityOut = 0.4,
      bouncinessIn = 20,
      bouncinessOut = 20,
      TouchableComponent = Pressable,
    } = this.props
    return (
      <TouchableComponent
        {...this.props}
        style={[styles.container, style]}
        onPressIn={() => {
          this.bounceEffect(bounceEffectIn, bounceVelocityIn, bouncinessIn)
        }}
        onPressOut={() => {
          this.bounceEffect(bounceEffectOut, bounceVelocityOut, bouncinessOut)
        }}
        onPress={this.handleCheck}
      >
        {this.renderCheckIcon()}
        {this.renderCheckboxText()}
      </TouchableComponent>
    )
  }
}
export default Checkbox
//# sourceMappingURL=BouncyCheckbox.js.map
