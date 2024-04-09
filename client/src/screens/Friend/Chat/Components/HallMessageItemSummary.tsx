import React from 'react'
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ViewStyle,
} from 'react-native'
import Avatar from '@/components/Avatar'

type PageProps = {
  style: ViewStyle
  item: Store.Message
  onPress: () => void
}

const HallMessageItemSummary: React.FC<PageProps> = props => {
  const { style, item, onPress } = props

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[style, styles.messageCard]}
      onPress={onPress}
    >
      <View style={styles.avatar}>
        <Avatar
          size="tiny"
          avatarImage={item.sender.avatar}
          equip={item.sender.equip}
        />
      </View>
      <View style={styles.messageWrapper}>
        <View style={styles.messageWrapperHd}>
          {/* <Text style={styles.messageSenderName}>{item.sender.name}: </Text> */}
          <Text
            style={styles.textContent}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {item.msgType === 'text' &&
              typeof item.msgContent === 'string' &&
              item.msgContent.replace('\n', ' ')}
            {item.msgType === 'image' && '[Image]'}
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
    flexDirection: 'row',
  },
  messageWrapper: {
    width: '86%',
    justifyContent: 'center',
    marginLeft: 5,
  },
  messageWrapperHd: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 40,
  },
  messageWrapperBd: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  messageSenderName: {
    marginLeft: 2,
    fontSize: 12,
    color: '#fff',
  },
  messageSendTime: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
  },
  textContent: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    lineHeight: 16,
  },
})

export default React.memo(HallMessageItemSummary)
