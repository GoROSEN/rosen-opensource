import * as React from 'react'
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  Text,
  TouchableHighlight,
} from 'react-native'

function WalletAppCard({ navigation, AppIcon, AppName, OnPress }) {
  return (
    <TouchableHighlight
      style={styles.groupPressable}
      onPress={OnPress}
      underlayColor={'#232631'}
    >
      <View style={styles.groupPressable}>
        <Image style={styles.icon} resizeMode="contain" source={AppIcon} />
        <View>
          <Text style={styles.textName}>{AppName}</Text>
        </View>
      </View>
    </TouchableHighlight>
  )
}

const styles = StyleSheet.create({
  groupPressable: {
    borderRadius: 30,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    width: 327,
    height: 159,
    marginVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  icon: {
    margin: 5,
  },
})

export default WalletAppCard
