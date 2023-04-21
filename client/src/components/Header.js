import React from 'react'
import { StyleSheet, View, Text } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import TouchIcon from '@/components/TouchIcon'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const Header = ({ title, rightPart, goBackCb }) => {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()

  const goBack = goBackCb
    ? goBackCb
    : () => {
        console.log('back')
        navigation.goBack()
      }

  return (
    <View style={[styles.header, { top: insets.top + 10 }]}>
      <View style={styles.leftPart}>
        <TouchIcon
          iconName="arrow_left"
          iconSize={20}
          onPress={() => goBack()}
          style={[styles.arrowIcon]}
        />
      </View>
      {title && (
        <View style={styles.centerPart}>
          <Text style={styles.headerTitle}>{title}</Text>
        </View>
      )}
      {rightPart && <View style={styles.rightPart}>{rightPart}</View>}
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'absolute',
    // top: 35,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    height: 40,
    zIndex: 10,
  },
  leftPart: {
    position: 'relative',
    zIndex: 10,
    flexDirection: 'row',
  },
  centerPart: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
})
export default React.memo(Header)
