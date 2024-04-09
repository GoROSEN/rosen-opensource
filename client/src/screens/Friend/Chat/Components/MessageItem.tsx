import React, { useRef } from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  View,
  Text,
  Linking,
  Pressable,
  ViewStyle,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import ParsedText from 'react-native-parsed-text'
import Avatar from '@/components/Avatar'
import SvgIcon from '@/components/SvgIcon'
import FastImage from '@/components/FastImage'
import { dateUtil } from '@/utils'
import { globalStyles } from '@/constants'

export type MessageLongPressProps = {
  messageWrapperRef: React.MutableRefObject<View | null>
  msgData: Store.Message
}

type PageProps = {
  style: ViewStyle

  data: Store.Message

  showName?: boolean

  senderBaseInfo: API.UserInfo

  chatUserInfo: API.UserInfo

  onImagePress: (imgUri: string) => void

  onMessageLongPress: ({
    messageWrapperRef,
    msgData,
  }: MessageLongPressProps) => void
}

const getMessageCardContainerStyle = (isSender: boolean) => {
  return {
    flexDirection: isSender ? 'row' : 'row-reverse',
    justifyContent: 'flex-end',
  } as ViewStyle
}

const getMessageCardStyle = (isSender: boolean) => {
  const commonStyle: ViewStyle = {
    maxWidth: '90%',
    flexDirection: isSender ? 'row-reverse' : 'row',
    overflow: 'hidden',
  }

  return commonStyle
}

const getTextMessageStyle = (isSender: boolean) => {
  const commonStyle: ViewStyle = {
    backgroundColor: isSender
      ? 'rgba(121, 76, 250, 1)'
      : 'rgba(35, 38, 49, 0.5)',
  }

  return commonStyle
}

const getTransferMessageStyle = (msgType: string, transferStatus: string) => {
  const commonStyle: ViewStyle = {
    backgroundColor: 'rgba(90, 140, 255, 1)',
  }

  if (msgType === 'transfer' || msgType === 'transfer-received') {
    if (transferStatus === 'initiated') {
      commonStyle.backgroundColor = 'rgba(90, 140, 255, 1)'
    } else {
      commonStyle.backgroundColor = 'rgba(90, 140, 255, 0.7)'
    }
  }

  return commonStyle
}

const MessageItem: React.FC<PageProps> = props => {
  const {
    style,
    data,
    showName,
    senderBaseInfo,
    chatUserInfo,
    onImagePress,
    onMessageLongPress,
  } = props
  const { t } = useTranslation()
  const navigation = useNavigation()
  const { sender, msgType, msgContent, msgTranslatedContent, timestamp } = data
  const isSender = sender.id === senderBaseInfo?.id
  const messageWrapperRef = useRef(null)

  const handleMessageLongPress = () => {
    onMessageLongPress &&
      onMessageLongPress({
        messageWrapperRef: messageWrapperRef,
        msgData: data,
      })
  }

  const handleUrlPress = (url: string) => {
    Linking.openURL(url)
  }

  const handleAvatarPress = () => {
    navigation.navigate('PersonalCell', { id: sender.id })
  }

  const handleTransferPress = () => {
    if (isSender) {
      if (data.msgType === 'transfer-received') {
        navigation.navigate('TransferReceivingDetail', data)
      } else {
        navigation.navigate('TransferDetail', {
          ...data,
          chatUserInfo: chatUserInfo,
        })
      }
    } else {
      if (data.msgType === 'transfer-received') {
        navigation.navigate('TransferDetail', {
          ...data,
          chatUserInfo: chatUserInfo,
        })
      } else {
        navigation.navigate('TransferReceivingDetail', data)
      }
    }
  }

  const renderAvatar = () => {
    if (isSender) {
      return <Avatar size="small" />
    } else {
      return (
        <Pressable onPress={handleAvatarPress}>
          <Avatar
            size="small"
            avatarImage={sender.avatar}
            equip={sender.equip}
          />
        </Pressable>
      )
    }
  }

  const renderMessage = () => {
    if (msgType === 'text') {
      let localMsgContent = msgContent as string
      return (
        <>
          <View
            style={[styles.textMessageContainer, getTextMessageStyle(isSender)]}
          >
            <ParsedText
              style={styles.textMessage}
              parse={[
                {
                  type: 'url',
                  style: styles.textLink,
                  onPress: handleUrlPress,
                },
              ]}
              childrenProps={{ allowFontScaling: false }}
            >
              {localMsgContent}
            </ParsedText>
          </View>
          {msgTranslatedContent && (
            <View style={styles.textTranslatedMessageContainer}>
              <ParsedText
                style={styles.textTranslatedMessage}
                parse={[
                  {
                    type: 'url',
                    style: styles.textLink,
                    onPress: handleUrlPress,
                  },
                ]}
                childrenProps={{ allowFontScaling: false }}
              >
                {msgTranslatedContent}
              </ParsedText>
              <View style={styles.textTranslateFootnote}>
                <SvgIcon
                  iconName="transfer_status_received"
                  iconSize={8}
                  iconColor="#7b7d82"
                  style={globalStyles.mR3}
                />
                <Text style={styles.textTranslateFootnoteText}>
                  Rosen Translates
                </Text>
              </View>
            </View>
          )}
        </>
      )
    } else if (msgType === 'image') {
      let localMsgContent = msgContent as Store.MessageContentImage

      return (
        <Pressable
          style={styles.imageMessageContainer}
          onPress={() => onImagePress(localMsgContent.imgUri)}
          onLongPress={handleMessageLongPress}
        >
          <FastImage
            source={{ uri: localMsgContent.imgUri }}
            style={[
              styles.imageMessage,
              {
                aspectRatio:
                  localMsgContent.imgWidth / localMsgContent.imgHeight,
              },
            ]}
          />
          {data.msgStatus === 'sending' && (
            <View style={styles.messageActivityIndicatorContainer}>
              <ActivityIndicator color="#0CC4FF" />
            </View>
          )}
        </Pressable>
      )
    } else if (msgType === 'transfer' || msgType === 'transfer-received') {
      let localMsgContent = msgContent as Store.MessageContentTransfer

      function renderTransferStatusIcon() {
        if (localMsgContent.transferStatus === 'initiated') {
          return <SvgIcon iconName="transfer_status_initiated" iconSize={20} />
        } else if (localMsgContent.transferStatus === 'received') {
          return <SvgIcon iconName="transfer_status_received" iconSize={20} />
        } else if (localMsgContent.transferStatus === 'refunded') {
          return <SvgIcon iconName="transfer_status_received" iconSize={20} />
        }
      }

      function renderTransferStatusText() {
        if (isSender) {
          if (localMsgContent.transferStatus === 'initiated') {
            return t('page.transfer.msg-transfer-status-sender.initiated')
          } else if (localMsgContent.transferStatus === 'received') {
            if (msgType === 'transfer') {
              return t('page.transfer.msg-transfer-status-sender.received')
            } else {
              return t('page.transfer.msg-transfer-status-receiver.received')
            }
          } else if (localMsgContent.transferStatus === 'refunded') {
            return t('page.transfer.msg-transfer-status-sender.refunded')
          }
        } else {
          if (localMsgContent.transferStatus === 'initiated') {
            return t('page.transfer.msg-transfer-status-receiver.initiated')
          } else if (localMsgContent.transferStatus === 'received') {
            return t('page.transfer.msg-transfer-status-receiver.received')
          } else if (localMsgContent.transferStatus === 'refunded') {
            return t('page.transfer.msg-transfer-status-receiver.refunded')
          }
        }
      }

      return (
        <Pressable
          style={[
            styles.transferMessageContainer,
            getTransferMessageStyle(
              data.msgType,
              typeof data.msgContent !== 'string' &&
                'transferStatus' in data.msgContent
                ? data.msgContent.transferStatus
                : '',
            ),
          ]}
          onPress={handleTransferPress}
          onLongPress={handleMessageLongPress}
        >
          {renderTransferStatusIcon()}
          <View style={styles.transferMessageMain}>
            <View style={styles.transferMessageAmount}>
              <SvgIcon
                iconName="gold_coin"
                iconSize={18}
                style={globalStyles.mR3}
              />
              <Text style={styles.transferMessageAmountText}>
                {Number(localMsgContent.transferAmount).toFixed(2)}
              </Text>
            </View>
            <Text style={styles.transferMessageStatus}>
              {renderTransferStatusText()}
            </Text>
          </View>
        </Pressable>
      )
    }
  }

  return (
    <View style={style}>
      <View style={getMessageCardContainerStyle(isSender)}>
        <View style={styles.messageStatus}>
          {(data.msgStatus === 'sendError' ||
            data.msgStatus === 'insufficientEnergy') && (
            <SvgIcon iconName="exclamation" iconSize={16} iconColor="#FF3A33" />
          )}
          {data.msgStatus === 'sending' && (
            <ActivityIndicator color="#0CC4FF" />
          )}
        </View>
        <Pressable
          ref={messageWrapperRef}
          style={getMessageCardStyle(isSender)}
          onLongPress={handleMessageLongPress}
          delayLongPress={100}
        >
          {renderAvatar()}

          <View style={styles.messageWrapper}>
            {showName && !isSender && (
              <View style={styles.messageWrapperHd}>
                <Text style={styles.messageSenderName}>{sender.name}</Text>
                <Text style={styles.messageSendTime}>
                  {dateUtil.formatTimestamp(timestamp)}
                </Text>
              </View>
            )}
            {showName && isSender && (
              <View style={styles.messageWrapperHd}>
                <Text style={styles.messageSendTime}>
                  {dateUtil.formatTimestamp(timestamp)}
                </Text>
              </View>
            )}
            {renderMessage()}
          </View>
        </Pressable>
      </View>

      {data.msgStatus === 'insufficientEnergy' && (
        <View style={styles.errorMessage}>
          <Text style={styles.errorMessageText}>
            {t('page.friends.chat.insufficient-energy')}
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  messageStatus: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageWrapper: {
    // flexGrow: 0,
    // flexWrap: 'wrap',
    // flex: 2,
    maxWidth: '80%',
    // marginTop: 10,
    // marginBottom: 10,
    marginLeft: 10,
    marginRight: 10,
  },
  messageWrapperHd: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  messageWrapperBd: {
    // flexDirection: 'row',
    // flexWrap: 'wrap',
  },

  textMessageContainer: {
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  textMessage: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 24,
  },
  textLink: {
    color: 'rgba(79, 123, 223, 1)',
    textDecorationLine: 'underline',
    fontSize: 16,
    lineHeight: 24,
    flexWrap: 'wrap',
  },
  textTranslatedMessageContainer: {
    borderRadius: 10,
    backgroundColor: '#232631',
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 10,
  },
  textTranslatedMessage: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    lineHeight: 24,
  },
  textTranslateFootnote: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  textTranslateFootnoteText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 8,
  },

  imageMessageContainer: {
    position: 'relative',
  },
  imageMessage: {
    borderRadius: 10,
    maxWidth: 200,
    maxHeight: 400,
  },

  transferMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  transferMessageMain: {
    marginLeft: 15,
  },
  transferMessageAmount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transferMessageAmountText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  transferMessageStatus: {
    fontSize: 12,
    color: '#fff',
    marginTop: 5,
  },

  messageActivityIndicatorContainer: {
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0, 0.5)',
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageSenderName: {
    fontSize: 16,
    color: '#fff',
  },
  messageSendTime: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
  },

  errorMessage: {
    backgroundColor: '#232631',
    borderRadius: 10,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    // width: '80%',
    marginTop: 10,
  },
  errorMessageText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
  },
})

export default React.memo(MessageItem)
