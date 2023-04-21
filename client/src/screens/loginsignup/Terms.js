import React, { useState } from 'react'
import { StyleSheet, View, StatusBar } from 'react-native'
import { WebView } from 'react-native-webview'
import Header from '@/components/Header'
import { SafeAreaView } from 'react-native-safe-area-context'
import { globalStyles } from '../../constants'

const Terms = props => {
  return (
    <SafeAreaView style={[globalStyles.container]}>
      <Header />
      <View style={{ paddingTop: 60, flex: 1 }}>
        <WebView
          source={{ uri: 'https://www.gorosen.xyz/terms' }}
          injectedJavaScript="window.ReactNativeWebView.postMessage(document.title)"
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignSelf: 'stretch',
  },
})

export default Terms
