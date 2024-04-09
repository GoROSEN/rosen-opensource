import React, {
  useState,
  useReducer,
  useRef,
  useCallback,
  useEffect,
} from 'react'
import {
  ActivityIndicator,
  DeviceEventEmitter,
  StyleSheet,
  StatusBar,
  View,
  Text,
  FlatList,
  Platform,
  Pressable,
} from 'react-native'
import { useSelector, useDispatch } from 'react-redux'
import { SafeAreaView } from 'react-native-safe-area-context'
import ImageView from 'react-native-image-viewing'
import { useTranslation } from 'react-i18next'
import Popover, {
  PopoverMode,
  PopoverPlacement,
} from 'react-native-popover-view'
import * as Clipboard from 'expo-clipboard'

import WebsockerUtil from '@/components/WebsocketReconnect/util'
import { dateUtil, commonUtil } from '@/utils'
import { globalStyles } from '@/constants'
import Header from '@/components/Header'
import SvgIcon from '@/components/SvgIcon'
import Message from '@/components/GlobalAlert'
import {
  addChatHallMsg,
  delChatHallMsg,
  updateChatHallMsgUnreadCount,
  updateChatHallMsgStatus,
} from '@/store/chatSlice'

import { useUploadBase64ImageMutation } from '@/services/modules/member'
import { useGetChatFeeQuery } from '@/services/modules/friend'

import MessageItem from './Components/MessageItem'
import KeyboardView from './Components/KeyboardView'

function messageGroupsReducer(state, action) {
  switch (action.type) {
    case 'UPDATE_GROUP':
      state = [].concat(action.payload)
      return state
    case 'ADD_GROUP':
      state = [...action.payload, ...state]
      return state
    default:
      return state
  }
}

function imagesReducer(state, action) {
  switch (action.type) {
    case 'UPDATE_IMAGES':
      const imagesArr1 = []
      action.payload.map(group => {
        group.messages.map(message => {
          if (message.msgType === 'image') {
            imagesArr1.push({
              uri: message.msgContent.imgUri,
            })
          }
        })
      })
      state = imagesArr1
      return state
    case 'ADD_IMAGES':
      const imagesArr2 = []
      action.payload.messages.map(message => {
        if (message.msgType === 'image') {
          imagesArr2.push({
            uri: message.msgContent.imgUri,
          })
        }
      })
      state = [...imagesArr2, ...state]
      return state
    default:
      return state
  }
}

const ChatHall = ({ navigation, route }) => {
  const { t } = useTranslation()
  const ws = useRef(WebsockerUtil.getInstance('chat')).current
  const dispatch = useDispatch()
  const senderBaseInfo = useSelector(state => state.authUser.userInfo)
  const { chatHall } = useSelector(state => state.chat)
  const messageData = chatHall[senderBaseInfo.id]
  const [messageGroups, messageGroupsDispatch] = useReducer(
    messageGroupsReducer,
    [],
  )

  const { data: chatFee = {} } = useGetChatFeeQuery(
    {
      toUserId: 0,
    },
    {
      refetchOnMountOrArgChange: true,
    },
  )

  const [images, imagesDispatch] = useReducer(imagesReducer, [])
  const [uploadBase64ImageTrigger] = useUploadBase64ImageMutation()
  // 每次打开对话都要置零一下未读信息
  useEffect(() => {
    dispatch(
      updateChatHallMsgUnreadCount({
        userId: senderBaseInfo.id,
        unreadCount: 0,
      }),
    )
  }, [dispatch, senderBaseInfo.id])

  useEffect(() => {
    shouldScrollToEnd.current = true
  }, [])

  // 每次都从缓存里面取最新的pageSize条数据作为当前消息列表数据
  const startIndex = useRef(0)
  const pageNo = useRef(1)
  const pageSize = useRef(5).current
  const flatListRef = useRef(null)
  const shouldScrollToEnd = useRef(true)
  useEffect(() => {
    if (messageData) {
      if (messageData.messageGroups.length === 0) {
        messageGroupsDispatch({
          type: 'UPDATE_GROUP',
          payload: [],
        })

        imagesDispatch({
          type: 'UPDATE_IMAGES',
          payload: [],
        })
      }
      if (messageData.messageGroups.length > 0) {
        const s = Math.max(
          messageData.messageGroups.length - pageNo.current * pageSize,
          0,
        )
        const e = messageData.messageGroups.length

        messageGroupsDispatch({
          type: 'UPDATE_GROUP',
          payload: messageData.messageGroups.slice(s, e),
        })
        imagesDispatch({
          type: 'UPDATE_IMAGES',
          payload: messageData.messageGroups.slice(s, e),
        })

        // 对话打开状态每次有新消息进来都要置零未读信息
        dispatch(
          updateChatHallMsgUnreadCount({
            userId: senderBaseInfo.id,
            unreadCount: 0,
          }),
        )

        startIndex.current = s
        shouldScrollToEnd.current = true
      }
    }
  }, [dispatch, messageData, pageSize, senderBaseInfo.id])

  // 加载更多数据
  const [isLoadingEarlier, setIsLoadingEarlier] = useState(false)
  const handleLoadEarlierMessages = useCallback(
    ({ nativeEvent }) => {
      if (
        nativeEvent.contentOffset.y > 0 ||
        !messageData ||
        isLoadingEarlier ||
        startIndex.current <= 0
      ) {
        return
      }

      setIsLoadingEarlier(true)
      const s = Math.max(startIndex.current - pageSize, 0)
      const e = startIndex.current
      const elements = messageData.messageGroups.slice(s, e)
      startIndex.current = s
      pageNo.current = pageNo.current + 1
      shouldScrollToEnd.current = false

      setTimeout(() => {
        messageGroupsDispatch({
          type: 'ADD_GROUP',
          payload: elements,
        })
        imagesDispatch({
          type: 'ADD_IMAGES',
          payload: elements,
        })
        setIsLoadingEarlier(false)
      }, 500)
    },
    [isLoadingEarlier, messageData, pageSize],
  )

  const handleSendMessage = useCallback(
    async data => {
      let msgContent
      let msgStatus = 'sending'
      // console.log(data)
      switch (data.msgType) {
        case 'text':
          msgContent = data.msgContent
          break
        case 'image':
          msgContent = {
            imgUri: data.msgContent.uri,
            imgWidth: data.msgContent.width,
            imgHeight: data.msgContent.height,
          }
          break
      }

      // console.log(msgContent)

      dispatch(
        addChatHallMsg({
          userId: senderBaseInfo.id,
          sender: {
            id: senderBaseInfo.id,
            name: senderBaseInfo.displayName,
            avatar: senderBaseInfo.avatar,
            equip: {
              imgindex: senderBaseInfo.equip.imgindex,
              logo: senderBaseInfo.equip.logo,
            },
          },
          msgId: data.msgId,
          msgType: data.msgType,
          msgContent: msgContent,
          msgStatus: msgStatus,
          timestamp: new Date().getTime(),
        }),
      )

      // 如果发送的是图片，需要等图片上传到服务器返回图片url之后再发送ws消息
      // 发送图片信息的时候需要将本地获取的图片宽高发送过去，以便在接收端显示的时候能够立马设置长宽比
      if (data.msgType === 'image') {
        const imageType = commonUtil.getFileType(data.msgContent.uri)
        const uploadResult = await uploadBase64ImageTrigger({
          img: data.msgContent.base64,
          filename: new Date().getTime() + '.' + imageType,
        })
        if (uploadResult.data.code === 20000) {
          ws.send(
            JSON.stringify({
              action: 'chat',
              params: {
                msg: uploadResult.data.data.url,
                data: {
                  msgId: data.msgId,
                  msgType: data.msgType,
                  imgWidth: data.msgContent.width,
                  imgHeight: data.msgContent.height,
                },
              },
            }),
          )
        } else {
          dispatch(
            updateChatHallMsgStatus({
              userId: senderBaseInfo.id,
              msgId: data.msgId,
              msgStatus: 'sendError',
            }),
          )
        }
      } else {
        ws.send(
          JSON.stringify({
            action: 'chat',
            params: {
              msg: msgContent,
              data: {
                msgId: data.msgId,
                msgType: data.msgType,
              },
            },
          }),
        )
      }
    },
    [
      dispatch,
      senderBaseInfo.avatar,
      senderBaseInfo.displayName,
      senderBaseInfo.id,
      senderBaseInfo.equip.imgindex,
      senderBaseInfo.equip.logo,
      uploadBase64ImageTrigger,
      ws,
    ],
  )

  const [imageViewVisible, setImageViewVisible] = useState(false)
  const [imageViewIndex, setImageViewIndex] = useState(0)
  const handleImageView = useCallback(
    imageUri => {
      const index = images.findIndex(e => e.uri === imageUri)
      if (index !== -1) {
        setImageViewIndex(index)
      }

      setImageViewVisible(true)
    },
    [images],
  )

  const [showMessagePopover, setShowMessagePopover] = useState(false)
  const [currentMessageItemData, setCurrentMessageItemData] = useState({})
  const [messageItemRef, setMessageItemRef] = useState(null)
  const handleMessageLongPress = useCallback(data => {
    setMessageItemRef(data.messageWrapperRef)
    setCurrentMessageItemData(data.msgData)
    setShowMessagePopover(true)
  }, [])

  const handleMessageCopy = useCallback(async () => {
    await Clipboard.setStringAsync(currentMessageItemData.msgContent)
    setShowMessagePopover(false)

    DeviceEventEmitter.emit('showGlobalAlert', {
      type: 'success',
      content: t('page.common.copied'),
    })
  }, [currentMessageItemData.msgContent, t])

  const handleMessageDel = useCallback(() => {
    dispatch(
      delChatHallMsg({
        userId: senderBaseInfo.id,
        msgId: currentMessageItemData.msgId,
      }),
    )
    setMessageItemRef(null)
    setShowMessagePopover(false)
  }, [currentMessageItemData.msgId, dispatch, senderBaseInfo.id])

  const [preContentHeight, setPreContentHeight] = useState(0)
  const handleContentSizeChange = useCallback(
    (contentWidth, contentHeight) => {
      if (shouldScrollToEnd.current && contentHeight > preContentHeight) {
        setTimeout(() => flatListRef.current.scrollToEnd(), 100)
      }
      setPreContentHeight(contentHeight)
    },
    [preContentHeight],
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
            showName={true}
            key={item.msgId}
            style={styles.messageItem}
            data={item}
            senderBaseInfo={senderBaseInfo}
            onImagePress={handleImageView}
            onMessageLongPress={handleMessageLongPress}
          />
        ))}
      </View>
    ),
    [handleImageView, handleMessageLongPress, senderBaseInfo],
  )

  return (
    <SafeAreaView style={[globalStyles.container]}>
      <Header title={'Hall'} />
      <KeyboardView
        chatFee={chatFee}
        onMessage={handleSendMessage}
        listContentHeight={preContentHeight}
      >
        <FlatList
          ref={flatListRef}
          data={messageGroups}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderHeader}
          renderItem={renderItem}
          onScroll={handleLoadEarlierMessages}
          onContentSizeChange={handleContentSizeChange}
        />
      </KeyboardView>

      <ImageView
        images={images}
        imageIndex={imageViewIndex}
        visible={imageViewVisible}
        onRequestClose={() => setImageViewVisible(false)}
      />

      <Popover
        placement={PopoverPlacement.TOP}
        from={messageItemRef}
        isVisible={showMessagePopover}
        animationConfig={{ duration: 200 }}
        popoverStyle={styles.messagePopover}
        verticalOffset={
          Platform.OS === 'android' ? -StatusBar.currentHeight : 0
        }
        backgroundStyle={styles.messagePopoverBg}
        arrowSize={styles.messagePopoverArrowSize}
        onRequestClose={() => setShowMessagePopover(false)}
      >
        <View style={styles.messagePopoverInner}>
          {currentMessageItemData.msgType !== 'image' && (
            <Pressable
              style={styles.messagePopoverItem}
              onPress={handleMessageCopy}
            >
              <SvgIcon iconName="copy2" iconSize={20} />
              <Text style={styles.messagePopoverItemText}>
                {t('page.common.copy')}
              </Text>
            </Pressable>
          )}
          <Pressable
            style={styles.messagePopoverItem}
            onPress={handleMessageDel}
          >
            <SvgIcon iconName="delete" iconSize={20} />
            <Text style={styles.messagePopoverItemText}>
              {t('page.common.delete')}
            </Text>
          </Pressable>
        </View>
      </Popover>
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
  footer: {
    paddingHorizontal: 70,
    marginBottom: 11,
    alignContent: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 10,
    color: '#fff',
    opacity: 0.4,
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

  messagePopover: {
    backgroundColor: '#232631',
    borderRadius: 10,
  },
  messagePopoverBg: {
    opacity: 0,
  },
  messagePopoverArrowSize: {
    width: 10,
    height: 6,
  },
  messagePopoverInner: {
    paddingHorizontal: 10,
    paddingVertical: 15,
    flexDirection: 'row',
  },
  messagePopoverItem: {
    paddingHorizontal: 15,
    alignItems: 'center',
    // backgroundColor: '#ff3300',
  },
  messagePopoverItemText: {
    color: '#fff',
    marginTop: 5,
  },
})

export default ChatHall
