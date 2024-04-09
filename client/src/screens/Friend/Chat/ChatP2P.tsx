import React, {
  useState,
  useReducer,
  useRef,
  useCallback,
  useEffect,
} from 'react'
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  StatusBar,
  View,
  Text,
  FlatList,
  Platform,
  Pressable,
  NativeScrollEvent,
  Dimensions,
  DeviceEventEmitter,
} from 'react-native'
import { useSelector, useDispatch } from 'react-redux'
import { RouteProp, useRoute } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import ImageView from 'react-native-image-viewing'
import { useTranslation } from 'react-i18next'
import Popover, { PopoverPlacement } from 'react-native-popover-view'
import * as Clipboard from 'expo-clipboard'
import * as FileSystem from 'expo-file-system'
import { LinearGradient } from 'expo-linear-gradient'

import WebsockerUtil from '@/components/WebsocketReconnect/util'
import { dateUtil, commonUtil } from '@/utils'
import { globalStyles } from '@/constants'
import Header from '@/components/Header'
import SvgIcon from '@/components/SvgIcon'
import {
  useGetProducerBasicQuery,
  useUploadBase64ImageMutation,
} from '@/services/modules/member'
// import { useGetChatFeeQuery } from '@/services/modules/friend'
import {
  useGetChatTranslatorQuery,
  usePostChatTranslatorMutation,
} from '@/services/modules/chat'
import {
  addChatP2PMsg,
  delChatP2PMsg,
  updateChatP2PMsgUnreadCount,
  updateChatP2PMsgTranslateEnableTipsShowed,
  updataChatP2PMsgStatus,
  updataChatP2PMsgTransferStatus,
  updateChatUsers,
} from '@/store/chatSlice'

import MessageItem, {
  type MessageLongPressProps,
} from './Components/MessageItem'
import KeyboardView, { type MessageItemType } from './Components/KeyboardView'

import { RootStackParamList } from '@/navigation/RootNavigator'

const { width: screenWidth } = Dimensions.get('screen')

function messageGroupsReducer(
  state: Store.MessageGroup[],
  action: { type: string; payload: Store.MessageGroup[] },
) {
  switch (action.type) {
    case 'UPDATE_GROUP':
      return [...action.payload]
    case 'ADD_GROUP':
      return [...action.payload, ...state]
    default:
      return state
  }
}

function imagesReducer(
  state: { uri: string }[],
  action: { type: string; payload: Store.MessageGroup[] },
) {
  switch (action.type) {
    case 'UPDATE_IMAGES':
      const imagesArr1 = action.payload.reduce(
        (acc: { uri: string }[], group) => {
          group.messages.forEach(message => {
            if (
              message.msgType === 'image' &&
              typeof message.msgContent !== 'string' &&
              'imgUri' in message.msgContent
            ) {
              acc.push({
                uri: message.msgContent.imgUri,
              })
            }
          })
          return acc
        },
        [],
      )
      return imagesArr1
    case 'ADD_IMAGES':
      const imagesArr2 = action.payload.reduce(
        (acc: { uri: string }[], group) => {
          group.messages.forEach(message => {
            if (
              message.msgType === 'image' &&
              typeof message.msgContent !== 'string' &&
              'imgUri' in message.msgContent
            ) {
              acc.push({
                uri: message.msgContent.imgUri,
              })
            }
          })
          return acc
        },
        [],
      )
      return [...imagesArr2, ...state]
    default:
      return state
  }
}

const ChatP2P = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'ChatP2P'>>()
  const chatId = Number(route.params.id)
  const { t, i18n } = useTranslation()
  const ws = useRef(WebsockerUtil.getInstance('chat')).current
  // const messageItemRef = useRef(null)
  const dispatch = useDispatch()
  const senderBaseInfo = useSelector(
    (state: Store.RootState) => state.authUser.userInfo,
  )
  const { chatP2P, chatUsers } = useSelector(
    (state: Store.RootState) => state.chat,
  )
  const messageData = chatP2P[senderBaseInfo.id].byId[chatId]
  const chatUserData = chatUsers.byId[chatId]
  const [messageGroups, messageGroupsDispatch] = useReducer(
    messageGroupsReducer,
    [],
  )
  const [images, imagesDispatch] = useReducer(imagesReducer, [])

  const { data: receiverBaseInfo = {} } = useGetProducerBasicQuery(chatId, {
    refetchOnMountOrArgChange: true,
  })

  const { data: chatTranslator = {}, refetch: chatTranslatorRefetch } =
    useGetChatTranslatorQuery(null, {
      refetchOnMountOrArgChange: true,
    })

  const [postChatTranslatorTrigger] = usePostChatTranslatorMutation()
  // const { data: chatFee = {}, refetch: chatFeeRefetch } = useGetChatFeeQuery(
  //   {
  //     toUserId: chatId,
  //   },
  //   {
  //     refetchOnMountOrArgChange: true,
  //   },
  // )

  const [uploadBase64ImageTrigger] = useUploadBase64ImageMutation()

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
        userId: senderBaseInfo.id,
        chatId: chatId,
        unreadCount: 0,
      }),
    )
  }, [dispatch, chatId, senderBaseInfo.id])

  // 每次本地缓存数据有更新的时候当前页面消息列表都要跟着更新一次
  const startIndex = useRef(0)
  const pageNo = useRef(1)
  const pageSize = useRef(5).current
  const flatListRef = useRef<FlatList | null>(null)
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
          updateChatP2PMsgUnreadCount({
            userId: senderBaseInfo.id,
            chatId: chatId,
            unreadCount: 0,
          }),
        )

        startIndex.current = s
        shouldScrollToEnd.current = true
      }
    }
  }, [dispatch, messageData, pageSize, chatId, senderBaseInfo.id])

  // 加载更多数据
  const [isLoadingEarlier, setIsLoadingEarlier] = useState(false)
  const handleLoadEarlierMessages = useCallback(
    ({ nativeEvent }: { nativeEvent: NativeScrollEvent }) => {
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
    async (data: MessageItemType) => {
      // 向本地缓存添加一条发送信息
      dispatch(
        addChatP2PMsg({
          userId: senderBaseInfo.id,
          chatId: chatId,
          sender: {
            id: senderBaseInfo.id,
            name: senderBaseInfo.displayName,
            avatar: senderBaseInfo.avatar,
            equip: senderBaseInfo.equip as API.Equip,
          },
          msgId: data.msgId,
          msgType: data.msgType,
          msgContent: data.msgContent,
          msgTranslatedContent: '',
          msgStatus: 'sending',
          timestamp: new Date().getTime(),
        }),
      )

      // 如果发送的是图片，需要等图片上传到服务器返回图片url之后再发送ws消息
      // 发送图片信息的时候需要将本地获取的图片宽高发送过去，以便在接收端显示的时候能够立马设置长宽比
      if (data.msgType === 'text') {
        ws.send(
          JSON.stringify({
            action: 'p2pchat',
            params: {
              destination: chatId,
              msg: data.msgContent,
              data: {
                msgId: data.msgId,
                msgType: data.msgType,
              },
            },
          }),
        )
      } else if (data.msgType === 'image') {
        const imageMsgContent = data.msgContent as Store.MessageContentImage
        const imageType = commonUtil.getFileType(imageMsgContent.imgUri)
        const imageContents = await FileSystem.readAsStringAsync(
          imageMsgContent.imgUri,
          { encoding: 'base64' },
        )
        const uploadResult = await uploadBase64ImageTrigger({
          img: imageContents,
          filename: new Date().getTime() + '.' + imageType,
        })
        if ('data' in uploadResult && uploadResult.data.code === 20000) {
          ws.send(
            JSON.stringify({
              action: 'p2pchat',
              params: {
                destination: chatId,
                msg: uploadResult.data.data.url,
                data: {
                  msgId: data.msgId,
                  msgType: data.msgType,
                  imgWidth: imageMsgContent.imgWidth,
                  imgHeight: imageMsgContent.imgHeight,
                },
              },
            }),
          )
        } else {
          dispatch(
            updataChatP2PMsgStatus({
              userId: senderBaseInfo.id,
              chatId: chatId,
              msgId: data.msgId,
              msgStatus: 'sendError',
            }),
          )
        }
      } else if (data.msgType === 'transfer') {
        const transferMsgContent =
          data.msgContent as Store.MessageContentTransfer
        ws.send(
          JSON.stringify({
            action: 'transfer-currency',
            params: {
              destination: chatId,
              msg: '',
              uuid: transferMsgContent.transferId,
              type: 'usdt',
              value: Number(transferMsgContent.transferAmount) / 100,
              data: {
                msgId: data.msgId,
                msgType: data.msgType,
                transferType: transferMsgContent.transferType,
                transferTime: transferMsgContent.transferTime,
              },
            },
          }),
        )
      } else if (data.msgType === 'transfer-received') {
        const transferMsgContent =
          data.msgContent as Store.MessageContentTransfer

        dispatch(
          updataChatP2PMsgTransferStatus({
            userId: senderBaseInfo.id,
            chatId: chatId,
            msgId: transferMsgContent.associatedMsgId!,
            transferStatus: 'received',
            receiptTime: transferMsgContent.receiptTime,
          }),
        )

        ws.send(
          JSON.stringify({
            action: 'transfer-currency-ack',
            params: {
              destination: chatId,
              msg: '',
              uuid: transferMsgContent.transferId,
              data: {
                msgId: data.msgId,
                msgType: data.msgType,
                associatedMsgId: transferMsgContent.associatedMsgId,
                transferType: transferMsgContent.transferType,
                transferAmount: Number(transferMsgContent.transferAmount) / 100,
                receiptTime: transferMsgContent.receiptTime,
              },
            },
          }),
        )
      }
    },
    [
      dispatch,
      senderBaseInfo.id,
      senderBaseInfo.displayName,
      senderBaseInfo.avatar,
      senderBaseInfo.equip,
      chatId,
      uploadBase64ImageTrigger,
      ws,
    ],
  )

  // useEffect(() => {
  // const substitution = DeviceEventEmitter.addListener(
  //   'chatReceivedMessage',
  //   data => {
  //     if (data.action === 'following' && data.params.from === chatId) {
  //       chatFeeRefetch()
  //     }
  //   },
  // )
  // return () => {
  //   substitution.remove()
  // }
  // }, [chatId])

  const [imageViewVisible, setImageViewVisible] = useState(false)
  const [imageViewIndex, setImageViewIndex] = useState(0)
  const handleImageView = useCallback(
    (imageUri: string) => {
      const index = images.findIndex(e => e.uri === imageUri)
      if (index !== -1) {
        setImageViewIndex(index)
      }

      setImageViewVisible(true)
    },
    [images],
  )

  // 每次有新内容进来的时候滚动到底部
  const [preContentHeight, setPreContentHeight] = useState(0)
  const handleContentSizeChange = useCallback(
    (contentWidth: number, contentHeight: number) => {
      if (shouldScrollToEnd.current && contentHeight > preContentHeight) {
        setTimeout(() => {
          flatListRef.current!.scrollToEnd()
        }, 100)
      }
      setPreContentHeight(contentHeight)
    },
    [preContentHeight],
  )

  const [showMessagePopover, setShowMessagePopover] = useState(false)
  const [currentMessageItemData, setCurrentMessageItemData] = useState<
    Partial<Store.Message>
  >({
    msgId: '',
    msgContent: '',
  })
  const messageItemRef = useRef<View | null>(null)
  const handleMessageLongPress = useCallback((data: MessageLongPressProps) => {
    messageItemRef.current = data.messageWrapperRef.current
    setCurrentMessageItemData(data.msgData)
    setShowMessagePopover(true)
  }, [])

  const handleMessageCopy = useCallback(async () => {
    await Clipboard.setStringAsync(currentMessageItemData.msgContent as string)
    setShowMessagePopover(false)
    DeviceEventEmitter.emit('showGlobalAlert', {
      type: 'success',
      content: t('page.common.copied'),
    })
  }, [currentMessageItemData.msgContent, t])

  const handleMessageDel = useCallback(() => {
    dispatch(
      delChatP2PMsg({
        userId: senderBaseInfo.id,
        chatId: chatId,
        msgId: currentMessageItemData.msgId!,
      }),
    )
    messageItemRef.current = null
    setShowMessagePopover(false)
  }, [currentMessageItemData.msgId, dispatch, chatId, senderBaseInfo.id])

  const handleTranslatePress = useCallback(
    async (flag: string) => {
      DeviceEventEmitter.emit('showGlobalLoading')
      await postChatTranslatorTrigger({
        enable: flag === 'on' ? false : true,
        language: i18n.language,
      })
      await chatTranslatorRefetch()
      DeviceEventEmitter.emit('hideGlobalLoading')
    },
    [chatTranslatorRefetch, i18n.language, postChatTranslatorTrigger],
  )

  const handleTranslateEnableTipsClose = useCallback(() => {
    dispatch(
      updateChatP2PMsgTranslateEnableTipsShowed({
        userId: senderBaseInfo.id,
        chatId: chatId,
      }),
    )
  }, [chatId, dispatch, senderBaseInfo.id])

  const renderHeaderRightPart = useCallback(() => {
    return (
      <View style={styles.headerRightWrapper}>
        {chatTranslator.enable && (
          <Pressable onPress={() => handleTranslatePress('on')}>
            <SvgIcon iconName="translate_on" iconSize={25} />
          </Pressable>
        )}
        {!chatTranslator.enable && (
          <Pressable onPress={() => handleTranslatePress('off')}>
            <SvgIcon iconName="translate_off" iconSize={25} />
          </Pressable>
        )}

        {senderBaseInfo.lang !== receiverBaseInfo.lang &&
          (!messageData || !messageData.translateEnableTipsShowed) && (
            <View
              style={[styles.translateEnableTips, { width: screenWidth - 48 }]}
            >
              <LinearGradient
                start={{ x: 0, y: 0.25 }}
                end={{ x: 0.8, y: 1 }}
                colors={['#B04CFF', '#0CC4FF']}
                style={styles.translateEnableTipsBg}
              >
                <Image
                  source={require('@/assets/images/kefu_avatar.png')}
                  style={styles.kefuAvatarImage}
                />
                <Text style={styles.translateEnableTipsText}>
                  {t('page.friends.chat.translate-enable-tips')}
                </Text>
              </LinearGradient>
              <Image
                source={require('@/assets/images/translate_tips_arrow.png')}
                style={styles.translateEnableTipsArrow}
              />
              <Pressable
                style={styles.translateEnableTipsCloseBtn}
                onPress={handleTranslateEnableTipsClose}
              >
                <SvgIcon iconName="close" iconSize={12} iconColor="#000" />
              </Pressable>
            </View>
          )}
      </View>
    )
  }, [
    chatTranslator.enable,
    handleTranslateEnableTipsClose,
    handleTranslatePress,
    messageData,
    receiverBaseInfo.lang,
    senderBaseInfo.lang,
    t,
  ])

  const renderListHeader = useCallback(() => {
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
    ({ item: group }: { item: Store.MessageGroup }) => (
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
            chatUserInfo={chatUserData}
            onImagePress={handleImageView}
            onMessageLongPress={handleMessageLongPress}
          />
        ))}
      </View>
    ),
    [chatUserData, handleImageView, handleMessageLongPress, senderBaseInfo],
  )

  return (
    <SafeAreaView style={[globalStyles.container]}>
      <Header
        title={chatUserData?.displayName}
        rightPart={renderHeaderRightPart()}
      />

      <KeyboardView
        // chatFee={chatFee}
        chatId={chatId}
        onMessage={handleSendMessage}
        listContentHeight={preContentHeight}
      >
        <FlatList
          ref={flatListRef}
          // inverted={isContentOverflow}
          data={messageGroups}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderListHeader}
          renderItem={renderItem}
          onScroll={handleLoadEarlierMessages}
          onContentSizeChange={handleContentSizeChange}
          keyExtractor={item => item.timestamp.toString()}
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
          Platform.OS === 'android' ? -(StatusBar.currentHeight || 0) : 0
        }
        backgroundStyle={styles.messagePopoverBg}
        arrowSize={styles.messagePopoverArrowSize}
        onRequestClose={() => setShowMessagePopover(false)}
      >
        <View style={styles.messagePopoverInner}>
          {currentMessageItemData.msgType === 'text' && (
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
  headerRightWrapper: {
    position: 'relative',
  },
  translateEnableTips: {
    position: 'absolute',
    top: 40,
    right: 0,
  },
  translateEnableTipsArrow: {
    width: 32,
    height: 27,
    position: 'absolute',
    right: 10,
    top: -15,
  },
  translateEnableTipsCloseBtn: {
    width: 21,
    height: 21,
    backgroundColor: '#fff',
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    right: 0,
    bottom: -5,
  },
  translateEnableTipsBg: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    borderRadius: 999,
    overflow: 'hidden',
  },
  kefuAvatarImage: {
    width: 30,
    height: 30,
    marginRight: 10,
  },
  translateEnableTipsText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
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
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
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

export default ChatP2P
