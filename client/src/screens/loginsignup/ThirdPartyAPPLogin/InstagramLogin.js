import React, { Component } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import InstagramLogin from 'react-native-instagram-login'
import TouchIcon from '@/components/TouchIcon'

export default function InstagramLoginIcon() {
  const [token, setIgToken] = React.useState('')
  const [instagramLogin, setInstagramLogin] = React.useState()

  return (
    <View>
      <TouchIcon
        iconName="sns_logo_instagram"
        iconSize={20}
        onPress={() => {
          instagramLogin.show()
        }}
        style={[styles.thirdPartySigninItem]}
      />
      <InstagramLogin
        ref={ref => setInstagramLogin(ref)}
        appId="807599413811004"
        appSecret="1cdf1ff197eef9ececda5d04d1ca5c12"
        redirectUrl="https://auth.expo.io/@rosen-bridge/rosen"
        scopes={['user_profile']}
        onLoginSuccess={data => {
          setIgToken(data)
          console.log(data)
        }}
        onLoginFailure={data => console.log(data)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  thirdPartySigninItem: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    borderStyle: 'solid',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
