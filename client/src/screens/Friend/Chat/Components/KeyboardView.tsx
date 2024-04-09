import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  ReactNode,
} from 'react'
import {
  Animated,
  DeviceEventEmitter,
  StyleSheet,
  View,
  Text,
  Pressable,
  Platform,
  TextInput,
  Keyboard,
  EmitterSubscription,
  LayoutChangeEvent,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Crypto from 'expo-crypto'

import { globalStyles } from '@/constants'
import TouchIcon from '@/components/TouchIcon'

import Toolbox from './Toolbox'
import { ViewDriver } from './Driver/ViewDriver'
import { KeyboardDriver } from './Driver/KeyboardDriver'

import { type ImagePickerAsset } from 'expo-image-picker'

export type MessageItemType = {
  msgId: string
  msgType: Store.Message['msgType']
  msgContent: Store.Message['msgContent']
}

type PageProps = {
  chatId?: number

  listContentHeight: number

  onMessage: (data: MessageItemType) => void

  children: ReactNode
}

const KeyboardView: React.FC<PageProps> = props => {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  // const senderBaseInfo = useSelector(state => state.authUser.userInfo)

  const [wsConnectStatus, setWsConnectStatus] = useState('success')

  const [listContainerHeight, setListContainerHeight] = useState(0)
  const [listContainerRestHeight, setListContainerRestHeight] = useState(0)

  const toolboxDriver = useRef(new ViewDriver('toolbox')).current
  const keyboardDriver = useRef(new KeyboardDriver()).current

  const [driver, setDriver] = useState<
    typeof toolboxDriver | typeof keyboardDriver
  >()
  const [mainTranslateY, setMainTranslateY] = useState(new Animated.Value(0))
  const [senderTranslateY, setSenderTranslateY] = useState(
    new Animated.Value(0),
  )
  const driverState = useMemo(
    () => ({ driver, setDriver, setMainTranslateY, setSenderTranslateY }),
    [driver],
  )

  const mainStyle = {
    transform: [
      {
        translateY: mainTranslateY,
      },
    ],
  }
  const senderStyle = {
    transform: [
      {
        translateY: senderTranslateY,
      },
    ],
  }

  // 计算list容器的移动位置
  // ios全面屏手机需要特殊处理一下，减去底部手势条的高度
  // 并且还要判断list容器剩余空间和键盘（工具）高度的两者的大小来决定移动的距离
  const calculateMainAnimationHeight = useCallback(
    ({
      popupPanelHeight,
      isFromKeyboard,
    }: {
      popupPanelHeight: number
      isFromKeyboard?: boolean
    }) => {
      let popupPanelHeightFixed = popupPanelHeight
      if (Platform.OS === 'ios' && insets.bottom > 0 && isFromKeyboard) {
        popupPanelHeightFixed = popupPanelHeightFixed - insets.bottom
      }

      if (listContainerRestHeight > 0) {
        if (listContainerRestHeight > popupPanelHeightFixed) {
          return 0
        } else {
          return popupPanelHeightFixed - listContainerRestHeight
        }
      } else {
        return popupPanelHeightFixed
      }
    },
    [insets.bottom, listContainerRestHeight],
  )

  const calculateSenderAnimationHeight = useCallback(
    ({
      popupPanelHeight,
      isFromKeyboard,
    }: {
      popupPanelHeight: number
      isFromKeyboard?: boolean
    }) => {
      if (Platform.OS === 'ios' && insets.bottom > 0 && isFromKeyboard) {
        return popupPanelHeight - insets.bottom
      } else {
        return popupPanelHeight
      }
    },
    [insets.bottom],
  )

  // 监听键盘的显示和隐藏事件
  // 每次键盘显示的时候都需要计算一下list容器和sender容器的移动位置
  useEffect(() => {
    const showEventName =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEventName =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const substitutions: EmitterSubscription[] = []

    substitutions.push(
      Keyboard.addListener(showEventName, ({ endCoordinates }) => {
        keyboardDriver.show(
          calculateMainAnimationHeight({
            popupPanelHeight: endCoordinates.height,
            isFromKeyboard: true,
          }),
          calculateSenderAnimationHeight({
            popupPanelHeight: endCoordinates.height,
            isFromKeyboard: true,
          }),
          driverState,
        )
      }),
    )

    substitutions.push(
      Keyboard.addListener(hideEventName, () => {
        keyboardDriver.hide(driverState)
      }),
    )

    return () => substitutions.forEach(sub => sub.remove())
  }, [
    calculateMainAnimationHeight,
    calculateSenderAnimationHeight,
    driverState,
    insets.bottom,
    keyboardDriver,
  ])

  useEffect(() => {
    setListContainerRestHeight(listContainerHeight - props.listContentHeight)
  }, [listContainerHeight, props.listContentHeight])

  // 每当有新信息被添加并且还没到触发滚动的时候需要移动整个list容器的位置
  const preListContainerRestHeight = useRef(0)
  useEffect(() => {
    if (
      driver &&
      ((listContainerRestHeight > 0 &&
        listContainerRestHeight < preListContainerRestHeight.current) ||
        // 下面这个条件是在整体移动list容器的临界点时会满足
        // 既前一条消息的listContainerRestHeight还大于0，后一条信息的listContainerRestHeight已经小于0
        (listContainerRestHeight < 0 && preListContainerRestHeight.current > 0))
    ) {
      driver.resetMainAnimateHeight(
        calculateMainAnimationHeight({
          popupPanelHeight: driver.senderAnimateHeight,
        }),
        driverState,
      )
    }

    preListContainerRestHeight.current = listContainerRestHeight
  }, [
    calculateMainAnimationHeight,
    driver,
    driverState,
    listContainerRestHeight,
  ])

  const handleListContainerLayout = useCallback((event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout
    setListContainerHeight(height)
  }, [])

  const handleDriverHide = useCallback(() => {
    keyboardDriver.hide(driverState)
    toolboxDriver.hide(driverState)
  }, [driverState, keyboardDriver, toolboxDriver])

  const [inputText, setInputText] = useState('')
  const handleInputChange = useCallback((text: string) => {
    setInputText(text)
  }, [])

  const handleSendMessage = useCallback(
    (data: {
      msgType: Store.Message['msgType']
      msgContent: Store.Message['msgContent']
    }) => {
      props.onMessage({
        msgId: Crypto.randomUUID(),
        msgType: data.msgType,
        msgContent:
          data.msgType === 'text' ? inputText.slice(0, 350) : data.msgContent,
      })

      // 清空输入框
      data.msgType === 'text' && setInputText('')
    },
    [inputText, props],
  )

  // 按发送键发送文字信息
  const handleSendPress = useCallback(() => {
    handleSendMessage({
      msgType: 'text',
      msgContent: inputText.slice(0, 350),
    })
  }, [handleSendMessage, inputText])

  // 选择图片或者拍摄图片发送图片信息
  const handleImagePick = useCallback(
    (imageData: ImagePickerAsset[]) => {
      toolboxDriver.hide(driverState)
      imageData.forEach(item => {
        handleSendMessage({
          msgType: 'image',
          msgContent: {
            imgUri: item.uri,
            imgWidth: item.width,
            imgHeight: item.height,
          },
        })
      })
    },
    [driverState, handleSendMessage, toolboxDriver],
  )

  useEffect(() => {
    const substitutions: EmitterSubscription[] = []
    substitutions.push(
      DeviceEventEmitter.addListener('chatConnectError', () => {
        setWsConnectStatus('error')
      }),
    )
    substitutions.push(
      DeviceEventEmitter.addListener('chatConnectSuccess', () => {
        setWsConnectStatus('success')
      }),
    )

    substitutions.push(
      DeviceEventEmitter.addListener('transferPaymentSuccess', data => {
        toolboxDriver.hide(driverState)
        handleSendMessage({
          msgType: 'transfer',
          msgContent: {
            transferType: 1,
            transferId: data.transferId,
            transferAmount: data.transferAmount,
            transferStatus: 'initiated',
            transferTime: new Date().getTime(),
            receiptTime: new Date().getTime(),
          },
        })
      }),
    )

    substitutions.push(
      DeviceEventEmitter.addListener('transferReceiveSuccess', data => {
        handleSendMessage({
          msgType: 'transfer-received',
          msgContent: {
            transferType: 1,
            associatedMsgId: data.associatedMsgId,
            transferId: data.transferId,
            transferAmount: data.transferAmount,
            transferStatus: 'received',
            transferTime: data.transferTime,
            receiptTime: new Date().getTime(),
          },
        })
      }),
    )

    return () => substitutions.forEach(sub => sub.remove())
  }, [driverState, handleSendMessage, toolboxDriver])

  return (
    <View style={styles.container}>
      {wsConnectStatus === 'error' && (
        <View style={styles.connectStatus}>
          <Text style={styles.connectStatusText}>
            {t('page.friends.chat.network-error')}
          </Text>
        </View>
      )}
      <Animated.View style={[globalStyles.flex1, mainStyle]}>
        <View
          style={[styles.flatListContainer, globalStyles.flex1]}
          onLayout={handleListContainerLayout}
        >
          {props.children}
          {driver?.show && (
            <Pressable
              style={styles.pressableMask}
              onPress={handleDriverHide}
            />
          )}
        </View>
      </Animated.View>
      <Animated.View style={[styles.sender, senderStyle]}>
        <TextInput
          style={styles.messageInput}
          multiline
          value={inputText}
          textAlignVertical="center"
          onChangeText={handleInputChange}
        />
        {!inputText && (
          <TouchIcon
            iconName="plus"
            iconSize={34}
            onPress={() =>
              toolboxDriver.toggle(
                calculateMainAnimationHeight({
                  popupPanelHeight: toolboxDriver.senderAnimateHeight,
                }),
                calculateSenderAnimationHeight({
                  popupPanelHeight: toolboxDriver.senderAnimateHeight,
                }),
                driverState,
              )
            }
          />
        )}
        {inputText && (
          <TouchIcon
            iconName="send"
            iconSize={20}
            iconColor="#fff"
            style={styles.sendButton}
            onPress={handleSendPress}
          />
        )}
        {/* {props.chatFee.cost !== null && (
          <Reanimated.View
            entering={FadeIn.duration(250)}
            style={styles.engyConsume}
          >
            <Text style={styles.engyText}>
              {t('page.friends.chat.energy-cost-tip', {
                cost: props.chatFee.cost,
                energy: senderBaseInfo?.energy || 0,
              })}
            </Text>
          </Reanimated.View>
        )} */}
      </Animated.View>
      <Toolbox
        chatId={props.chatId}
        style={toolboxDriver.style}
        onLayout={toolboxDriver.onLayout}
        onImagePick={handleImagePick}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 60,
    overflow: 'hidden',
    position: 'relative',
  },
  connectStatus: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: '#fff2f0',
    borderColor: '#ffccc7',
    borderWidth: 1,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectStatusText: {
    color: '#ff4d4f',
    fontSize: 12,
  },
  flatListContainer: {
    position: 'relative',
    // marginBottom: 35,
    marginBottom: 5,
  },
  pressableMask: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  sender: {
    flexDirection: 'row',
    backgroundColor: '#232631',
    alignItems: 'center',
    padding: 15,
    position: 'relative',
    zIndex: 2,
  },
  engyConsume: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    position: 'absolute',
    left: 0,
    right: 0,
    top: -35,
    paddingVertical: 10,
  },
  engyText: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    lineHeight: 14,
  },
  messageInput: {
    color: '#fff',
    backgroundColor: '#000',
    flex: 1,
    minHeight: 40,
    maxHeight: 80,
    borderRadius: 20,
    fontSize: 14,
    padding: 5,
    paddingLeft: 15,
    marginRight: 10,
  },
  sendButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#4F7BDF',
    alignItems: 'center',
    justifyContent: 'center',
  },
})

export default React.memo(KeyboardView)
