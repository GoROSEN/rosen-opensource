import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Platform } from 'react-native'
import MaskedView from '@react-native-masked-view/masked-view'
import { LinearGradient } from 'expo-linear-gradient'

const LinearGradientText = props => {
  const { size = 12, children } = props
  const [key, setKey] = useState(0)

  useEffect(() => {
    if (Platform.OS === 'android') {
      setTimeout(() => setKey(prev => prev + 1), 50)
    }
  }, [children])

  return (
    <View style={styles.textContainer}>
      {/* 用来占位撑开元素 */}
      <Text style={[styles.text, { fontSize: size }]}>{children}</Text>
      <MaskedView
        key={`${key}`}
        style={styles.mask}
        maskElement={
          <Text style={[styles.text, { fontSize: size }]}>{children}</Text>
        }
      >
        <LinearGradient
          start={{ x: 0, y: 0.25 }}
          end={{ x: 0.8, y: 1 }}
          colors={['#B04CFF', '#0CC4FF']}
          style={styles.linearGradientBg}
        />
      </MaskedView>
    </View>
  )
}

const styles = StyleSheet.create({
  textContainer: {
    position: 'relative',
  },
  text: {
    fontWeight: 'bold',
  },
  mask: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  linearGradientBg: {
    flex: 1,
  },
})
export default React.memo(LinearGradientText)
