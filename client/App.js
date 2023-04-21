import React, { useEffect, useRef } from 'react'
import { Alert, Platform, StatusBar } from 'react-native'
import * as Notifications from 'expo-notifications'
import { isDevice } from 'expo-device'
import * as Linking from 'expo-linking'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/lib/integration/react'
import { store, persistor } from '@/store/index'
import {
  updataNotificationPermissionAsk,
  updataNotificationPushToken,
} from '@/store/permissionSlice'
import RootNavigator from '@/navigation/RootNavigator'
import '@/locales/i18n'

// 当app打开时，设置推送消息是否弹出来
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})

export default function App() {
  useEffect(() => {
    registerForPushNotificationsAsync()
  }, [])

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <StatusBar
          barStyle={'light-content'}
          animated={true}
          translucent={true}
          backgroundColor={'transparent'}
          showHideTransition={'fade'}
          networkActivityIndicatorVisible={true}
        />
        <RootNavigator />
      </PersistGate>
    </Provider>
  )
}

async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    })
  }

  if (isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }
    if (
      finalStatus !== 'granted' &&
      !store.getState().permission.notificationPermissionAsk
    ) {
      // Alert.alert('Failed to get push token for push notification!')
      Alert.alert(
        'Tips',
        'We need your permission to enable Push Notifications. Please enable it in your privacy settings.',
        [
          {
            text: 'Later',
          },
          {
            text: 'Open Settings',
            onPress: async () => Linking.openSettings(),
          },
        ],
      )
      store.dispatch(
        updataNotificationPermissionAsk({ notificationPermissionAsk: true }),
      )

      return
    }

    if (!store.getState().permission.notificationPushToken) {
      Notifications.getExpoPushTokenAsync().then(token => {
        store.dispatch(
          updataNotificationPushToken({ notificationPushToken: token }),
        )
      })
    }
  } else {
    Alert.alert('Must use physical device for Push Notifications')
  }
}
