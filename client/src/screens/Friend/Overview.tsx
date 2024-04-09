import React, { useRef, useState, useCallback, useEffect } from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  View,
  Text,
  TextInput,
  ImageBackground,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Crypto from 'expo-crypto'
import { useNavigation } from '@react-navigation/native'
import * as Notifications from 'expo-notifications'

import TouchIcon from '@/components/TouchIcon'
import SvgIcon from '@/components/SvgIcon'
import { globalStyles } from '@/constants'
import { useTranslation } from 'react-i18next'
import Header from '@/components/Header'
import { useGetNotificationListQuery } from '@/services/modules/notification'
import { useGetCustomerServiceInfoQuery } from '@/services/modules/chat'

import { commonUtil } from '@/utils'

import { addChatP2PMsg, addChatCustomerServiceId } from '@/store/chatSlice'

import MessageItemOverview from './Chat/Components/MessageItemOverview'
// import HallMessageItemSummary from './Chat/Components/HallMessageItemSummary'

const screenWidth = Dimensions.get('screen').width

const Overview = () => {
  const navigation = useNavigation()
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const userInfo = useSelector(
    (state: Store.RootState) => state.authUser.userInfo,
  )
  const notificationUnreadCount = useSelector(
    (state: Store.RootState) => state.notification.unreadCount,
  )
  const tabBarHeight = useSelector(
    (state: Store.RootState) => state.navigator.tabBarHeight,
  )
  const { chatP2P, chatUsers } = useSelector(
    (state: Store.RootState) => state.chat,
  )
  const { byId: chatDataById, allIds: chatDataAllIds } = chatP2P[userInfo.id]
  const { byId: chatUserById } = chatUsers
  // const hallMessageData = chatHall[userInfo.id].messages
  const [keyword, setKeyword] = useState('')

  const {
    data: notificationList = { items: [] },
    isLoading: isNotificationListLoading,
    refetch: notificationListRefetch,
  } = useGetNotificationListQuery(
    { page: 1 },
    { refetchOnMountOrArgChange: true },
  )

  const {
    data: customerServiceInfo = {},
    isLoading: iscustomerServiceInfoLoading,
  } = useGetCustomerServiceInfoQuery(null, { refetchOnMountOrArgChange: true })

  /**
   * 初始化客服号的第一句对话
   */
  useEffect(() => {
    if (!commonUtil.isEmptyObject(customerServiceInfo)) {
      // 自己如果是客服号的话是不会出现在系统聊天列表里面的
      if (
        customerServiceInfo.id !== userInfo.id &&
        !chatDataById[customerServiceInfo.id]
      ) {
        // 将客服号加入到客服号列表里面
        // 用于将客服号排除出聊天列表
        dispatch(
          addChatCustomerServiceId({
            chatId: customerServiceInfo.id,
          }),
        )
        dispatch(
          addChatP2PMsg({
            userId: userInfo.id,
            chatId: customerServiceInfo.id,
            sender: {
              id: customerServiceInfo.id,
              name: customerServiceInfo.displayName,
              avatar: customerServiceInfo.avatar,
              equip: customerServiceInfo.equip as API.Equip,
            },
            msgId: Crypto.randomUUID(),
            msgType: 'text',
            msgContent: t('page.friends.chat.custom-service-init-chat', {
              name: customerServiceInfo.displayName,
            }) as string,
            msgTranslatedContent: '',
            msgStatus: 'ok',
            timestamp: new Date().getTime(),
          }),
        )
      }
    }
  }, [chatDataById, customerServiceInfo, dispatch, t, userInfo.id])

  // 搜索
  const handleSearch = useCallback(() => {
    navigation.navigate('UserSearch', { keyword: keyword })
    setKeyword('')
  }, [keyword, navigation])

  const handleKeywordChange = useCallback((value: string) => {
    setKeyword(value)
  }, [])

  const notificationReceivedListener = useRef<Notifications.Subscription>()
  useEffect(() => {
    notificationReceivedListener.current =
      Notifications.addNotificationReceivedListener(() => {
        notificationListRefetch()
      })

    return () => {
      Notifications.removeNotificationSubscription(
        notificationReceivedListener.current as Notifications.Subscription,
      )
    }
  }, [notificationListRefetch])

  const headerRightPart = useCallback(() => {
    return (
      <View style={styles.search}>
        <TextInput
          value={keyword}
          style={styles.searchInput}
          onChangeText={handleKeywordChange}
          onSubmitEditing={handleSearch}
          placeholder={t('page.friends.search.placeholder') as string}
          placeholderTextColor="rgba(255,255,255,0.2)"
        />
        <TouchIcon
          iconName="search"
          iconSize={18}
          onPress={handleSearch}
          style={styles.searchIcon}
        />
      </View>
    )
  }, [handleKeywordChange, handleSearch, keyword, t])

  const handleMessageItemPress = useCallback(
    (chatId: number) => {
      return () => navigation.navigate('ChatP2P', { id: chatId })
    },
    [navigation],
  )

  // const handleChatAIPress = useCallback(() => {
  //   return () => navigation.navigate('ChatAI', { id: 7 })
  // }, [navigation])

  // console.log(hallMessageData, 'hallMessageData')

  return (
    <SafeAreaView
      style={[globalStyles.container, globalStyles.containerPadding]}
    >
      <Header leftPart={false} rightPart={headerRightPart()} />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.followContainer}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              navigation.navigate('Follow', { friendType: 2 })
            }}
          >
            <ImageBackground
              source={require('@/assets/images/friends_followings_bg.png')}
              style={styles.followItem}
            >
              <View style={styles.followContent}>
                <Text style={styles.followNumber}>
                  {userInfo.followings || 0}
                </Text>
                <Text style={styles.followLable}>
                  {t('page.common.followings')}
                </Text>
              </View>
            </ImageBackground>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              navigation.navigate('Follow', { friendType: 1 })
            }}
          >
            <ImageBackground
              source={require('@/assets/images/friends_followers_bg.png')}
              style={styles.followItem}
            >
              <View style={styles.followContent}>
                <Text style={styles.followNumber}>
                  {userInfo.followers || 0}
                </Text>
                <Text style={styles.followLable}>
                  {t('page.common.followers')}
                </Text>
              </View>
            </ImageBackground>
          </TouchableOpacity>
        </View>

        <View style={styles.hall}>
          <View style={styles.moduleHead}>
            <Text style={styles.moduleHeadText}>{t('page.friends.hall')}</Text>
            {/* <Pressable
              hitSlop={40}
              onPress={() => navigation.navigate('ChatHall')}
            >
              <SvgIcon iconName="arrow_right" iconSize={14} />
            </Pressable> */}
          </View>
          {/* <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              navigation.navigate('ChatHall')
            }}
          >
            <ImageBackground
              source={require('@/assets/images/hall_message_item_bg.png')}
              style={styles.hallMessage}
              resizeMode="cover"
            >
              {hallMessageData.length >= 0 &&
                hallMessageData.slice(-1).map((item, index) => {
                  return (
                    <HallMessageItemSummary
                      key={index}
                      item={item}
                      style={styles.assetsItem}
                      onPress={() => {
                        navigation.navigate('ChatHall')
                      }}
                    />
                  )
                })}
              {hallMessageData.length === 0 && (
                <View style={styles.hallWelcome}>
                  <Text style={styles.hallWelcomeText}>
                    {t('page.common.welcome-to-rosen-bridge')}
                  </Text>
                </View>
              )}
            </ImageBackground>
          </TouchableOpacity> */}

          <ImageBackground
            source={require('@/assets/images/hall_message_item_bg.png')}
            style={styles.hallMessage}
            resizeMode="cover"
          >
            <View style={styles.hallWelcome}>
              <Text style={styles.hallWelcomeText}>
                {t('page.common.coming-soon')}
              </Text>
            </View>
          </ImageBackground>
        </View>

        <View style={styles.system}>
          <View style={styles.moduleHead}>
            <Text style={styles.moduleHeadText}>
              {t('page.friends.system')}
            </Text>
          </View>
          {isNotificationListLoading && (
            <View style={styles.loading}>
              <ActivityIndicator color="#0CC4FF" />
            </View>
          )}
          {!isNotificationListLoading && notificationList.items.length > 0 && (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                navigation.navigate('Notification')
              }}
              style={styles.notifications}
            >
              <View style={styles.officialLogo}>
                <SvgIcon iconName="rosen_logo" iconSize={16} />

                {notificationUnreadCount > 0 && (
                  <View style={styles.unreadIcon} />
                )}
              </View>
              <View style={styles.notification}>
                <Text style={styles.notificationTitle}>{'Rosen'}</Text>
                <Text style={styles.notificationContent}>
                  <Text style={styles.notificationContentType}>
                    {notificationList.items[0].title}{' '}
                  </Text>
                  {notificationList.items[0].content}
                </Text>
              </View>
              {/* <View style={styles.notificationCount}>
                <Text style={styles.notificationCountText}>
                  {notificationUnreadCount >= 100
                    ? '99+'
                    : notificationUnreadCount}
                </Text>
              </View> */}
            </TouchableOpacity>
          )}
          {!isNotificationListLoading &&
            notificationList.items.length === 0 && (
              <View style={styles.nodata}>
                <SvgIcon iconName="nodata" iconSize={160} />
              </View>
            )}

          {!iscustomerServiceInfoLoading &&
            customerServiceInfo.id &&
            chatDataById[customerServiceInfo.id] && (
              <MessageItemOverview
                style={styles.messageItem}
                data={{
                  lastMessage:
                    chatDataById[customerServiceInfo.id].messages.slice(-1)[0],
                  unreadCount: chatDataById[customerServiceInfo.id].unreadCount,
                  receiverBaseInfo:
                    chatUserById[customerServiceInfo.id] ||
                    chatDataById[customerServiceInfo.id].messages.slice(-1)[0]
                      .sender,
                }}
                onPress={handleMessageItemPress(customerServiceInfo.id)}
              />
            )}
          {/* <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              navigation.navigate('ChatAI', { chatId: 7 })
            }}
            style={styles.notifications}
          >
            <View style={styles.officialLogo}>
              <SvgIcon iconName="rosen_logo" iconSize={16} />
            </View>
            <View style={styles.notification}>
              <Text style={styles.notificationTitle}>{'Assistant R'}</Text>
              <Text style={styles.notificationContent}>
                {chatDataById[7]?.messages.slice(-1)[0]?.content}
              </Text>
            </View>
            <View style={styles.notificationCount}>
              <Text style={styles.notificationCountText}>
                {chatDataById[7]?.unreadCount >= 100
                  ? '99+'
                  : chatDataById[7]?.unreadCount ?? 0}
              </Text>
            </View>
          </TouchableOpacity> */}
        </View>

        <View>
          <View style={styles.moduleHead}>
            <Text style={styles.moduleHeadText}>
              {t('page.friends.chat-list')}
            </Text>
          </View>
          {chatDataAllIds.map(chatId => (
            <MessageItemOverview
              key={chatId}
              style={styles.messageItem}
              data={{
                lastMessage: chatDataById[chatId].messages.slice(-1)[0],
                unreadCount: chatDataById[chatId].unreadCount,
                receiverBaseInfo:
                  chatUserById[chatId] ||
                  chatDataById[chatId].messages.slice(-1)[0].sender,
              }}
              onPress={handleMessageItemPress(chatId)}
            />
          ))}
          {chatDataAllIds.length === 0 && (
            <View style={styles.nodata}>
              <SvgIcon iconName="nodata" iconSize={160} />
            </View>
          )}
        </View>

        {/* 用来占位使底部区域透明，高度为tabBar的高度 */}
        <View style={{ height: tabBarHeight }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 30,
    left: 0,
    right: 0,
    backgroundColor: '#000',
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  hall: {
    marginBottom: 20,
  },
  hallMessage: {
    justifyContent: 'center',
    // height: 92,
    paddingLeft: 40,
    paddingRight: 60,
    aspectRatio: 4.3,
  },
  hallWelcome: {
    marginTop: -8,
    marginLeft: 20,
  },
  hallWelcomeText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  search: {
    position: 'relative',
  },
  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    paddingVertical: 5,
    paddingHorizontal: 15,
    height: 30,
    width: screenWidth - 24 * 2,
    fontSize: 12,
    color: '#fff',
  },
  searchIcon: {
    position: 'absolute',
    right: 15,
    top: 6,
  },
  scrollContainer: {
    flex: 1,
  },
  moduleHead: {
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moduleHeadText: {
    fontSize: 20,
    color: '#ffffff',
  },
  loading: {
    height: 160,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  nodata: {
    height: 160,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  comingSoon: {
    alignItems: 'center',
  },
  comingSoonText: {
    fontSize: 12,
    color: '#fff',
    alignItems: 'center',
  },
  followContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  followItem: {
    width: screenWidth * 0.42,
    height: (screenWidth * 0.42 * 53) / 153,
    borderRadius: 10,
    overflow: 'hidden',
  },
  followContent: {
    paddingLeft: 20,
    paddingTop: 7,
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  followNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  followLable: {
    fontSize: 7,
    color: '#fff',
  },

  system: {
    marginBottom: 20,
  },
  notifications: {
    backgroundColor: 'rgba(35, 38, 49, 0.5)',
    borderRadius: 20,
    marginBottom: 10,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  officialLogo: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    position: 'relative',
  },
  unreadIcon: {
    backgroundColor: '#FF3A33',
    height: 8,
    width: 8,
    borderRadius: 4,
    position: 'absolute',
    top: 0,
    right: 0,
  },
  notification: {
    marginHorizontal: 20,
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#fff',
  },
  notificationContent: {
    fontSize: 12,
    color: '#fff',
  },
  notificationContentType: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  notificationCount: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#5A8CFF',
  },
  notificationCountText: {
    fontSize: 8,
    color: '#fff',
  },

  messageItem: {
    marginBottom: 20,
  },
})

export default React.memo(Overview)
