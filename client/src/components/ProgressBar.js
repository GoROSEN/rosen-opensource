/* eslint-disable react-native/no-inline-styles */
import { LinearGradient } from 'expo-linear-gradient'
import { View, StyleSheet } from 'react-native'

function ProgressBar({ progression, width }) {
  const k = width * progression
  return (
    <View
      style={{
        height: 13,
        borderRadius: 100,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        width: width,
      }}
    >
      <LinearGradient
        colors={['#B04CFF', '#0CC4FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ borderRadius: 100, width: k || 0, height: 13 }}
      />
    </View>
  )
}

export default ProgressBar

const styles = StyleSheet.create({
  rNPProgressBar: {},
})
