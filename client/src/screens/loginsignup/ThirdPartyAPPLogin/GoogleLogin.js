import * as React from 'react'
import * as WebBrowser from 'expo-web-browser'
import * as Google from 'expo-auth-session/providers/google'
import { StyleSheet } from 'react-native'
import TouchIcon from '@/components/TouchIcon'

WebBrowser.maybeCompleteAuthSession()

export default function GoogleLoginIcon() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId:
      '820617594226-2v484fqcd1f4762veqed05hbdmq1ia5u.apps.googleusercontent.com',
    iosClientId:
      '820617594226-2v484fqcd1f4762veqed05hbdmq1ia5u.apps.googleusercontent.com',
    androidClientId:
      '820617594226-2v484fqcd1f4762veqed05hbdmq1ia5u.apps.googleusercontent.com',
    webClientId:
      '820617594226-2v484fqcd1f4762veqed05hbdmq1ia5u.apps.googleusercontent.com',
  })

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response
      console.log(authentication)
    }
  }, [response])

  return (
    <TouchIcon
      disabled={!request}
      iconName="sns_logo_google"
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
