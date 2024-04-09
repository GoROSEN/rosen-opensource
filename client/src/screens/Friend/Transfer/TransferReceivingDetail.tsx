import React, { useCallback } from 'react'
import { DeviceEventEmitter, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import moment from 'moment'
import { globalStyles } from '@/constants'
import SvgIcon from '@/components/SvgIcon'
import Header from '@/components/Header'
import Button from '@/components/Button'

import { usePostReceiveTransferMutation } from '@/services/modules/transfer'

import type { RootStackParamList } from '@/navigation/RootNavigator'

const TransferReceivingDetail = () => {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const route =
    useRoute<RouteProp<RootStackParamList, 'TransferReceivingDetail'>>()

  const [postReceiveTransferTrigger] = usePostReceiveTransferMutation()

  const { sender, msgId, msgContent } = route.params
  const localMsgContent = msgContent as Store.MessageContentTransfer

  const handleAcceptTransfer = useCallback(async () => {
    DeviceEventEmitter.emit('showGlobalLoading')
    const res = await postReceiveTransferTrigger(localMsgContent.transferId)
    DeviceEventEmitter.emit('hideGlobalLoading')

    if ('data' in res && res.data.code === 20000) {
      // 通知聊天界面接收转账成功
      DeviceEventEmitter.emit('transferReceiveSuccess', {
        associatedMsgId: msgId,
        transferId: localMsgContent.transferId,
        transferAmount: localMsgContent.transferAmount,
        transferTime: localMsgContent.transferTime,
      })

      navigation.goBack()
    }
  }, [
    localMsgContent.transferAmount,
    localMsgContent.transferId,
    localMsgContent.transferTime,
    msgId,
    navigation,
    postReceiveTransferTrigger,
  ])

  const renderTransferStatusIcon = useCallback(() => {
    if (localMsgContent.transferStatus === 'initiated') {
      return (
        <SvgIcon
          iconName="transfer_status_await"
          iconSize={100}
          style={globalStyles.mR3}
        />
      )
    } else if (localMsgContent.transferStatus === 'received') {
      return (
        <SvgIcon
          iconName="transfer_status_success"
          iconSize={100}
          style={globalStyles.mR3}
        />
      )
    } else if (localMsgContent.transferStatus === 'refunded') {
      return (
        <SvgIcon
          iconName="transfer_status_refunded"
          iconSize={100}
          style={globalStyles.mR3}
        />
      )
    }
  }, [localMsgContent.transferStatus])

  const renderTransferStatusText = useCallback(() => {
    if (localMsgContent.transferStatus === 'initiated') {
      return (
        <Text style={styles.statusText}>
          {t('page.transfer.transfer-status-receiver.initiated', {
            name: sender.name,
          })}
        </Text>
      )
    } else if (localMsgContent.transferStatus === 'received') {
      return (
        <Text style={styles.statusText}>
          {t('page.transfer.transfer-status-receiver.received')}
        </Text>
      )
    } else if (localMsgContent.transferStatus === 'refunded') {
      return (
        <Text style={styles.statusText}>
          {t('page.transfer.transfer-status-receiver.refunded')}
        </Text>
      )
    }
  }, [localMsgContent.transferStatus, sender.name, t])

  return (
    <SafeAreaView
      style={[
        styles.container,
        globalStyles.container,
        globalStyles.containerPadding,
      ]}
    >
      <Header />

      <View style={styles.main}>
        <View style={styles.statusWrapper}>
          {renderTransferStatusIcon()}
          {renderTransferStatusText()}
        </View>

        <View style={styles.transferAmount}>
          <SvgIcon
            iconName="gold_coin"
            iconSize={30}
            style={globalStyles.mR3}
          />
          <Text style={styles.transferAmountText}>
            {Number(localMsgContent.transferAmount).toFixed(2)}
          </Text>
        </View>

        {localMsgContent.transferStatus === 'initiated' && (
          <View style={styles.refundedNotes}>
            <Text style={styles.refundedNotesText}>
              {t('page.transfer.transfer-status-receiver.refunded-notes')}
            </Text>
          </View>
        )}

        <View style={styles.transferTime}>
          <View style={styles.transferTimeRow}>
            <Text style={styles.transferTimeLabel}>
              {t('page.transfer.transfer-time')}
            </Text>
            <Text style={styles.transferTimeValue}>
              {moment(localMsgContent.transferTime).format(
                'DD/MMM/YYYY HH:mm:ss',
              )}
            </Text>
          </View>
          {localMsgContent.transferStatus === 'received' && (
            <View style={styles.transferTimeRow}>
              <Text style={styles.transferTimeLabel}>
                {t('page.transfer.receipt-time')}
              </Text>
              <Text style={styles.transferTimeValue}>
                {moment(localMsgContent.receiptTime).format(
                  'DD/MMM/YYYY HH:mm:ss',
                )}
              </Text>
            </View>
          )}
        </View>
      </View>

      {localMsgContent.transferStatus === 'initiated' && (
        <Button size="xlarge" onPress={handleAcceptTransfer}>
          Accept Transfer
        </Button>
      )}
    </SafeAreaView>
  )
}

export default React.memo(TransferReceivingDetail)

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },
  main: {
    flex: 1,
    alignItems: 'center',
  },

  statusWrapper: {
    alignItems: 'center',
    marginBottom: 70,
  },

  statusText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
  },

  transferAmount: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  transferAmountText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },

  awaitingReceiptText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 70,
  },

  refundedNotes: {
    marginTop: 40,
    width: '80%',
  },
  refundedNotesText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },

  transferTime: {
    marginTop: 60,
    width: '100%',
  },
  transferTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  transferTimeLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.5)',
  },
  transferTimeValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.5)',
  },
})
