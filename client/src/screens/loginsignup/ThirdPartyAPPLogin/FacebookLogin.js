import * as React from 'react'
import * as WebBrowser from 'expo-web-browser'
import * as Facebook from 'expo-auth-session/providers/facebook'
import { StyleSheet } from 'react-native'
import TouchIcon from '@/components/TouchIcon'
import { useSignupFacebookMutation } from '@/services/modules/member'
import { userInfo, clearUserInfo } from '@/store/authSlice'
import { useDispatch } from 'react-redux'
import { makeRedirectUri, useAuthRequest } from 'expo-auth-session'
import { useNavigation } from '@react-navigation/native'
import { combineReducers } from '@reduxjs/toolkit'

WebBrowser.maybeCompleteAuthSession()

export default function FacebookLoginIcon() {
  const [signupFacebookTrigger] = useSignupFacebookMutation()
  const dispatch = useDispatch()
  const redirectUri = 'https://auth.expo.io/@rosen-bridge/rosen'
  // makeRedirectUri({
  //   // scheme: 'com.gorosen.rosen',
  //   // path: 'redirect',
  // })
  console.log(redirectUri)
  const navigation = useNavigation()
  const [request, response, promptAsync] = Facebook.useAuthRequest({
    clientId: '1240115723499215',
    androidClientId: '1240115723499215',
    redirectUri: redirectUri,
  })

  async function login(token) {
    console.log('token', token)
    const response = await fetch(
      `https://graph.facebook.com/me?access_token=${token}`,
    )
    const id = await response.json()
    console.log('response', id)
    signupFacebookTrigger({
      platform: 'facebook',
      uid: id.id,
      accessToken: token,
    }).then(result => {
      console.log(result.data)
      dispatch(userInfo(result.data))
      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'Dashboard',
          },
        ],
      })
    })
  }

  React.useEffect(() => {
    console.log('facebook', response)
    if (response?.type === 'success') {
      const { authentication } = response
      const token = authentication.accessToken
      login(token)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response])

  return (
    <TouchIcon
      disabled={!request}
      iconName="sns_logo_facebook"
      iconSize={20}
      onPress={() => {
        promptAsync()
      }}
      style={[styles.thirdPartySigninItem]}
    />
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
