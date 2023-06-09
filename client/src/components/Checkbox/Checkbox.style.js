import { StyleSheet } from 'react-native'
export const _iconContainer = (size, checked, fillColor, unfillColor) => {
  return {
    width: size,
    height: size,
    borderRadius: size / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: checked ? fillColor : unfillColor,
  }
}
export const _textStyle = checked => {
  return {
    fontSize: 16,
    color: '#757575',
    textDecorationLine: checked ? 'line-through' : 'none',
  }
}
export default StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  iconImageStyle: {
    width: 10,
    height: 10,
  },
  textContainer: {
    marginLeft: 16,
  },
  iconContainer: (size, checked, fillColor, unfillColor) => ({
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: checked ? fillColor : unfillColor,
    alignItems: 'center',
    justifyContent: 'center',
  }),
  innerIconContainer: (size, fillColor) => ({
    width: size,
    height: size,
    borderWidth: 1,
    borderColor: fillColor,
    borderRadius: size / 2,
    alignItems: 'center',
    justifyContent: 'center',
  }),
})
