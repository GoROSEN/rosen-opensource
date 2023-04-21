import React from 'react'
import { View, StyleSheet } from 'react-native'

import Animated, {
  Extrapolate,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated'

const Pagination = props => {
  const {
    data,
    animValue,
    paginationStyle,
    paginationItemStyle,
    paginationItemActive = { width: 14, opacity: 1 },
    paginationItemInactive = { width: 7, opacity: 0.3 },
  } = props

  return (
    <View style={[styles.pagination, paginationStyle]}>
      {data.map((item, index) => (
        <PaginationItem
          animValue={animValue}
          index={index}
          key={index}
          paginationItemStyle={paginationItemStyle}
          paginationItemActive={paginationItemActive}
          paginationItemInactive={paginationItemInactive}
        />
      ))}
    </View>
  )
}

const PaginationItem = props => {
  const {
    animValue,
    index,
    paginationItemStyle,
    paginationItemActive,
    paginationItemInactive,
  } = props
  // console.log(paginationItemActive)
  const animStyle = useAnimatedStyle(() => {
    let inputRange = [index - 1, index, index + 1]
    let widthOutputRange = [
      paginationItemInactive.width,
      paginationItemActive.width,
      paginationItemInactive.width,
    ]
    let opacityOutputRange = [
      paginationItemInactive.opacity,
      paginationItemActive.opacity,
      paginationItemInactive.opacity,
    ]

    return {
      width: interpolate(
        animValue?.value,
        inputRange,
        widthOutputRange,
        Extrapolate.CLAMP,
      ),
      opacity: interpolate(
        animValue?.value,
        inputRange,
        opacityOutputRange,
        Extrapolate.CLAMP,
      ),
    }
  }, [animValue, index, paginationItemActive, paginationItemInactive])
  return (
    <Animated.View
      style={[styles.paginationItem, paginationItemStyle, animStyle]}
    />
  )
}

const styles = StyleSheet.create({
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  paginationItem: {
    backgroundColor: '#fff',
    width: 7,
    height: 7,
    borderRadius: 4,
    marginLeft: 3,
    marginRight: 3,
  },
})
export default React.memo(Pagination)
