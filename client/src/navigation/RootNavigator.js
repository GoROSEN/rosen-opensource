import React from 'react'
import { useSelector } from 'react-redux'
import * as Linking from 'expo-linking'
import * as Notifications from 'expo-notifications'
import {
  createStackNavigator,
  TransitionPresets,
} from '@react-navigation/stack'
import { NavigationContainer } from '@react-navigation/native'
import NavigationService from '@/navigation/NavigationService'
import {
  DashboardScreen,
  AlphaScreen,
  SearchScreen,
  EquipmentScreen,
  PersonalCellScreen,
  FollowScreen,
  GalleryScreen,
  AssetsScreen,
  ShareScreen,
  NotificationScreen,
  LoginScreen,
  Signup,
  BlazerManage,
  MintManage,
  PlotMaintainPage,
  SettingsPage,
  PhoneVerify,
  WalletVerify,
  WalletExchange,
  MarketScreen,
  Rankingboard,
  Listing,
  PlotDetails,
  NFTDetails,
  ForgetPassword,
  Terms,
} from '@/screens'

const Stack = createStackNavigator()

const RootNavigator = () => {
  const userInfo = useSelector(state => state.authUser.userInfo)
  const initialRouteName = userInfo ? 'Dashboard' : 'Login'
  const prefix = Linking.createURL('/')

  return (
    <NavigationContainer
      ref={navigatorRef => {
        NavigationService.setTopLevelNavigator(navigatorRef)
      }}
      linking={{
        prefixes: [prefix],
        config: {
          screens: {
            Notification: 'notification',
          },
        },
        async getInitialURL() {
          // Handle URL from expo push notifications
          const response =
            await Notifications.getLastNotificationResponseAsync()
          // console.log('\x1b[31m', response)
          if (response?.notification.request.content) {
            url = prefix + 'notification'
          }

          // First, you may want to do the default deep link handling
          // Check if app was opened from a deep link
          let url = await Linking.getInitialURL()
          if (url != null) {
            return url
          }

          if (url) {
            return url
          }
        },
        subscribe(listener) {
          // Listen to expo push notifications
          const notificationsSubscription =
            Notifications.addNotificationResponseReceivedListener(response => {
              // console.log(response)
              // const url = response.notification.request.content.data.url
              const url = prefix + 'notification'
              // Let React Navigation handle the URL
              listener(url)
            })

          // Listen to incoming links from deep linking
          const linkingSubscription = Linking.addEventListener(
            'url',
            ({ url }) => {
              listener(url)
            },
          )

          return () => {
            linkingSubscription.remove()
            notificationsSubscription.remove()
          }
        },
      }}
    >
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{
          headerShown: false,
          title: '',
          ...TransitionPresets.SlideFromRightIOS,
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={Signup} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="Alpha" component={AlphaScreen} />
        <Stack.Screen name="Search" component={SearchScreen} />
        <Stack.Screen name="Equipment" component={EquipmentScreen} />
        <Stack.Screen name="BlazerManage" component={BlazerManage} />
        <Stack.Screen name="PersonalCell" component={PersonalCellScreen} />
        <Stack.Screen name="Follow" component={FollowScreen} />
        <Stack.Screen name="Gallery" component={GalleryScreen} />
        <Stack.Screen name="Assets" component={AssetsScreen} />
        <Stack.Screen name="Share" component={ShareScreen} />
        <Stack.Screen name="Notification" component={NotificationScreen} />
        <Stack.Screen name="MintManage" component={MintManage} />
        <Stack.Screen name="PlotMaintain" component={PlotMaintainPage} />
        <Stack.Screen name="Settings" component={SettingsPage} />
        <Stack.Screen name="PhoneVerify" component={PhoneVerify} />
        <Stack.Screen name="WalletVerify" component={WalletVerify} />
        <Stack.Screen name="WalletExchange" component={WalletExchange} />
        <Stack.Screen name="Market" component={MarketScreen} />
        <Stack.Screen name="NFTDetails" component={NFTDetails} />
        <Stack.Screen name="PlotDetails" component={PlotDetails} />
        <Stack.Screen name="Rankingboard" component={Rankingboard} />
        <Stack.Screen name="Listing" component={Listing} />
        <Stack.Screen name="ForgetPassword" component={ForgetPassword} />
        <Stack.Screen name="Terms" component={Terms} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}

export default RootNavigator
