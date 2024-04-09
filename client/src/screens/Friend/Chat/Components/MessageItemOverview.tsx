import React from 'react'
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ViewStyle,
  GestureResponderEvent,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import Avatar from '@/components/Avatar'
import { dateUtil } from '@/utils'

import UnreadCount from './UnreadCount'

type PageProps = {
  style: ViewStyle

  data: {
    lastMessage: Store.Message
    unreadCount: number
    receiverBaseInfo: API.UserInfo
  }

  onPress: (event: GestureResponderEvent) => void
}

const MessageItemOverview: React.FC<PageProps> = props => {
  const { t } = useTranslation()
  const { style, data, onPress } = props
  const senderBaseInfo = useSelector(
    (state: Store.RootState) => state.authUser.userInfo,
  )

  const renderContent = () => {
    if (!data.lastMessage) {
      return ''
    }

    const isSender = data.lastMessage.sender.id === senderBaseInfo?.id

    if (data.lastMessage.msgStatus === 'ok') {
      if (data.lastMessage.msgType === 'text') {
        return data.lastMessage.msgContent as string
      }
      if (data.lastMessage.msgType === 'image') {
        return `[${t('page.common.image')}]`
      }
      if (
        data.lastMessage.msgType === 'transfer' ||
        data.lastMessage.msgType === 'transfer-received'
      ) {
        const msgContent = data.lastMessage
          .msgContent as Store.MessageContentTransfer

        if (isSender) {
          if (data.lastMessage.msgType === 'transfer') {
            return `[${t('page.common.transfer')}]${t('page.transfer.msg-transfer-status-sender.' + msgContent.transferStatus)}`
          } else {
            return `[${t('page.common.transfer')}]${t('page.transfer.msg-transfer-status-receiver.' + msgContent.transferStatus)}`
          }
        } else {
          return `[${t('page.common.transfer')}]${t('page.transfer.msg-transfer-status-receiver.' + msgContent.transferStatus)}`
        }
      }
    } else {
      if (data.lastMessage.msgStatus === 'sending') {
        return `[${t('page.friends.chat.msg-type', {
          context: data.lastMessage.msgType,
        })}] ➟`
      }
      if (data.lastMessage.msgStatus === 'sendError') {
        return `[${t('page.friends.chat.send-error', {
          context: data.lastMessage.msgType,
        })}]`
      }
    }
  }

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[style, styles.messageCard]}
      onPress={onPress}
    >
      <View style={styles.avatar}>
        <Avatar
          size="small"
          avatarImage={data.receiverBaseInfo.avatar}
          equip={data.receiverBaseInfo.equip}
        />
        {data.unreadCount > 0 && <UnreadCount unreadCount={data.unreadCount} />}
      </View>
      <View style={styles.messageWrapper}>
        <View style={styles.messageWrapperHd}>
          <Text style={styles.messageSenderName}>
            {data.receiverBaseInfo.displayName || data.receiverBaseInfo.name}
          </Text>
          {data.lastMessage && (
            <Text style={styles.messageSendTime}>
              {dateUtil.formatTimestamp(data.lastMessage.timestamp)}
            </Text>
          )}
        </View>
        <View style={styles.messageWrapperBd}>
          <Text
            style={styles.textContent}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {renderContent()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  avatar: {
    position: 'relative',
  },
  unread: {
    backgroundColor: '#FF3A33',
    height: 8,
    width: 8,
    borderRadius: 4,
    position: 'absolute',
    top: 7,
    right: 7,
  },
  messageCard: {
    borderRadius: 20,
    backgroundColor: 'rgba(35, 38, 49, 0.5)',
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  messageWrapper: {
    width: '80%',
    marginTop: 5,
  },
  messageWrapperHd: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  messageWrapperBd: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  messageSenderName: {
    fontSize: 16,
    color: '#fff',
  },
  messageSendTime: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
  },
  textContent: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    lineHeight: 20,
  },
})

export default React.memo(MessageItemOverview)
