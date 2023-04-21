import * as React from 'react'
import * as WebBrowser from 'expo-web-browser'
import { StyleSheet } from 'react-native'
import TouchIcon from '@/components/TouchIcon'
import { makeRedirectUri, useAuthRequest } from 'expo-auth-session'
import { Button, Platform } from 'react-native'

const useProxy = Platform.select({ web: false, default: true })
WebBrowser.maybeCompleteAuthSession()

const discovery = {
  authorizationEndpoint: 'https://twitter.com/i/oauth2/authorize',
  tokenEndpoint: 'https://twitter.com/i/oauth2/token',
  revocationEndpoint: 'https://twitter.com/i/oauth2/revoke',
}

export default function TwitterLoginIcon() {
  //twitter config
  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: 'cC1RUWlWWDA4a0M5NFYzRnlsX2s6MTpjaQ',
      redirectUri: makeRedirectUri({
        useProxy,
      }),
      usePKCE: true,
      scopes: ['users.read'],
    },
    discovery,
  )

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { code } = response.params
    }
  }, [response])
  //twitter config --

  return (
    <TouchIcon
      iconName="sns_logo_twitter"
      iconSize={20}
      disabled={!request}
      onPress={() => {
        promptAsync({ useProxy })
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
