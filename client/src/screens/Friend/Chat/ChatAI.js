import React, {
  useState,
  useReducer,
  useRef,
  useCallback,
  useEffect,
} from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  View,
  Text,
  FlatList,
  DeviceEventEmitter,
} from 'react-native'
import { useSelector, useDispatch } from 'react-redux'
import { SafeAreaView } from 'react-native-safe-area-context'

import WebsockerUtil from '@/components/WebsocketReconnect/util'
import { dateUtil, commonUtil } from '@/utils'
import { globalStyles } from '@/constants'
import Header from '@/components/Header'
import { useGetProducerBasicQuery } from '@/services/modules/member'
import {
  addChatP2PMsg,
  updateChatP2PMsgUnreadCount,
  updateChatUsers,
} from '@/store/chatSlice'

import MessageItem from './Components/MessageItem'
import KeyboardView from './Components/KeyboardView'

function messageGroupsReducer(state, action) {
  switch (action.type) {
    case 'INIT':
      state = [].concat(action.payload)
      return state
    case 'ADD':
      let newState
      if (state.length === 0) {
        newState = [
          ...state,
          {
            timestamp: action.payload.timestamp,
            messages: [action.payload],
          },
        ]
      } else {
        const timestampDifference = Math.abs(
          action.payload.timestamp - state[state.length - 1].timestamp,
        )
        // 时间间隔大于10分钟就新建一个group
        if (timestampDifference / (1000 * 60) <= 10) {
          newState = state.map((group, index) => {
            if (index === state.length - 1) {
              return {
                ...group,
                messages: [...group.messages, action.payload],
              }
            }
            return group
          })
        } else {
          newState = [
            ...state,
            {
              timestamp: action.payload.timestamp,
              messages: [action.payload],
            },
          ]
        }
      }
      return newState
    case 'ADDGROUP':
      state = [...action.payload, ...state]
      return state
    default:
      return state
  }
}

const ChatAI = ({ navigation, route }) => {
  const receiverId = route.params.id
  const ws = useRef(WebsockerUtil.getInstance('chat')).current
  const dispatch = useDispatch()
  const senderBaseInfo = useSelector(state => state.authUser.userInfo)
  const senderEquipInfo = useSelector(state => state.equipment.equipmentInfo)
  const { chatP2P, chatUsers } = useSelector(state => state.chat)
  const messageData = chatP2P.byId[receiverId]
  const usersData = chatUsers.byId[receiverId]
  const [messageGroups, messageGroupsDispatch] = useReducer(
    messageGroupsReducer,
    [],
  )

  const { data: receiverBaseInfo = {} } = useGetProducerBasicQuery(receiverId, {
    refetchOnMountOrArgChange: true,
  })

  console.log(receiverBaseInfo)

  // 每次打开对话都要更新一下聊天对象的用户信息
  // 因为用户的信息（头像、装备、名字）可能会被用户更新过
  useEffect(() => {
    if (!commonUtil.isEmptyObject(receiverBaseInfo)) {
      dispatch(updateChatUsers(receiverBaseInfo))
    }
  }, [dispatch, receiverBaseInfo])

  // 每次打开对话都要置零一下未读信息
  useEffect(() => {
    dispatch(
      updateChatP2PMsgUnreadCount({
        chatId: receiverId,
        unreadCount: 0,
      }),
    )
  }, [dispatch, receiverId])

  // 每次都从缓存里面取最新的pageSize条数据作为当前消息列表数据
  const messageGroupsInited = useRef(false)
  const startIndex = useRef(0)
  const pageSize = useRef(10).current
  const flatListRef = useRef(null)
  useEffect(() => {
    if (
      !messageGroupsInited.current &&
      messageData &&
      messageData.messageGroups.length > 0
    ) {
      messageGroupsDispatch({
        type: 'INIT',
        payload: messageData.messageGroups.slice(-pageSize),
      })

      messageGroupsInited.current = true
      startIndex.current = messageData.messageGroups.length - 1 - pageSize

      // 需要等数据设置完成后再滚动
      // 不然只能滚动到上一条数据
      setTimeout(() => {
        flatListRef.current.scrollToEnd()
      }, 500)
    }
  }, [messageData, pageSize])

  // 加载更多数据
  const [isLoadingEarlier, setIsLoadingEarlier] = useState(false)
  const handleLoadEarlierMessages = useCallback(
    ({ nativeEvent }) => {
      if (
        nativeEvent.contentOffset.y > 0 ||
        !messageData ||
        isLoadingEarlier ||
        startIndex.current < 0
      ) {
        return
      }

      setIsLoadingEarlier(true)
      const endIndex = Math.max(startIndex.current - (pageSize - 1), 0)
      const elements = messageData.messageGroups.slice(
        endIndex,
        startIndex.current + 1,
      )
      startIndex.current = endIndex - 1

      setTimeout(() => {
        messageGroupsDispatch({
          type: 'ADDGROUP',
          payload: elements,
        })
        setIsLoadingEarlier(false)
      }, 500)
    },
    [isLoadingEarlier, messageData, pageSize],
  )

  const handleSendMessage = useCallback(
    data => {
      let msgContent = ''
      // console.log(data)
      switch (data.msgType) {
        case 'text':
          msgContent = data.msgContent
          break
        case 'image':
          msgContent = data.msgContent.localImageUri
          break
      }

      console.log(msgContent)

      const msgItem = {
        sender: {
          id: senderBaseInfo.member.id,
          name: senderBaseInfo.member.displayName,
          avatar: senderBaseInfo.member.avatar,
          equip: {
            imgindex: senderEquipInfo.imgindex,
            logo: senderEquipInfo.logo,
          },
        },
        msgId: data.msgId,
        msgType: data.msgType,
        msgContent: msgContent,
        msgStatus: 'ok',
        timestamp: new Date().getTime(),
      }

      console.log(msgItem)

      ws.sendMessage({
        action: 'p2pchat',
        params: {
          destination: receiverId,
          msg: msgContent,
          data: {
            msgId: data.msgId,
            msgType: data.msgType,
          },
        },
      })

      // 向本地缓存添加一条发送信息
      dispatch(
        addChatP2PMsg({
          chatId: receiverId,
          ...msgItem,
        }),
      )

      // 向当前页面消息列表添加一条发送信息
      messageGroupsDispatch({
        type: 'ADD',
        payload: {
          ...msgItem,
        },
      })

      // 对话打开状态都要置零未读信息
      dispatch(
        updateChatP2PMsgUnreadCount({
          chatId: receiverId,
          unreadCount: 0,
        }),
      )

      // 需要等数据设置完成后再滚动
      // 不然只能滚动到上一条数据
      setTimeout(() => {
        flatListRef.current.scrollToEnd()
      }, 300)
    },
    [
      dispatch,
      receiverId,
      senderBaseInfo.member.avatar,
      senderBaseInfo.member.displayName,
      senderBaseInfo.member.id,
      senderEquipInfo.imgindex,
      senderEquipInfo.logo,
      ws,
    ],
  )

  const renderHeader = useCallback(() => {
    // 根据isLoadingEarlier状态显示加载中的指示器
    if (isLoadingEarlier) {
      return (
        <View style={styles.loadingIndicator}>
          <ActivityIndicator />
        </View>
      )
    }
    return null
  }, [isLoadingEarlier])

  const renderItem = useCallback(
    ({ item: group }) => (
      <View style={styles.messageGroupItem} key={group.timestamp}>
        <Text style={styles.messageSendTime}>
          {dateUtil.formatTimestamp(group.timestamp)}
        </Text>
        {group.messages.map(item => (
          <MessageItem
            key={item.msgId}
            style={styles.messageItem}
            data={item}
            senderBaseInfo={senderBaseInfo}
          />
        ))}
      </View>
    ),
    [senderBaseInfo],
  )

  return (
    <SafeAreaView style={[globalStyles.container]}>
      <Header title={usersData?.displayName} />

      <KeyboardView onMessage={handleSendMessage}>
        <FlatList
          ref={flatListRef}
          data={messageGroups}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderHeader}
          renderItem={renderItem}
          onScroll={handleLoadEarlierMessages}
        />
      </KeyboardView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  inverted: {
    backgroundColor: '#333',
    transform: [
      {
        scaleY: -1,
      },
    ],
  },
  loadingIndicator: {
    paddingVertical: 10,
  },
  messageGroupItem: {
    paddingHorizontal: 24,
  },
  messageSendTime: {
    textAlign: 'center',
    color: '#fff',
    marginBottom: 10,
  },
  messageItem: {
    marginBottom: 20,
  },
})

export default ChatAI
