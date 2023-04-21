import * as React from 'react'
import { StyleSheet } from 'react-native'
import TouchIcon from '@/components/TouchIcon'

export default function TiktokLoginIcon() {
  // React.useEffect(() => {
  //   const authListener = events.addListener('onAuthCompleted', resp => {
  //     // response contains returned status(errorCode) and code (if status is 0)
  //     console.log(resp)
  //     // you can check it here https://developers.tiktok.com/doc/getting-started-android-handling-errors
  //   })
  //   const shareListener = events.addListener('onShareCompleted', resp => {
  //     // response contains returned errorCode
  //     console.log(resp)
  //   })
  //   return () => {
  //     authListener.remove()
  //     shareListener.remove()
  //   }
  // }, [])

  return (
    <TouchIcon
      iconName="sns_logo_tiktok"
      iconSize={20}
      onPress={() => {
        // init('aw3u3srs088p320i')
        // auth((code, error, errorMsg) => {
        //   console.log(code, error, errorMsg)
        // })
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
