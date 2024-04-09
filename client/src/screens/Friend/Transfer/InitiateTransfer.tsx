import React, { useCallback, useState } from 'react'
import {
  DeviceEventEmitter,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { useSelector } from 'react-redux'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import md5 from 'md5'

import { globalStyles } from '@/constants'
import Header from '@/components/Header'
import Avatar from '@/components/Avatar'
import SvgIcon from '@/components/SvgIcon'
import NumericKeyboard from '@/components/Keyboard/NumericKeyboard'
import { ConfirmModal } from '@/components/Modal'

import PaymentConfirmation from './PaymentConfirmation'

import {
  useGetTransferRulesQuery,
  usePostInitiateTransferMutation,
} from '@/services/modules/transfer'

import type { RootStackParamList } from '@/navigation/RootNavigator'

function formatNumber(value: string) {
  // 移除非数字和非小数点的字符
  value = value.replace(/[^\d.]/g, '')

  // 如果输入中包含多个小数点，只保留第一个
  value = value.replace(/(\..*)\./g, '$1')

  // 如果输入中包含多个0开头的小数，只保留一个
  value = value.replace(/^0+(\d)/g, '$1')

  // 如果输入以小数点开头，自动添加0到开头
  value = value.replace(/^\./, '0.')

  // 限制小数点后最多两位
  var decimalIndex = value.indexOf('.')
  if (decimalIndex !== -1) {
    var decimalPart = value.substring(decimalIndex + 1)
    if (decimalPart.length > 2) {
      value = value.substring(0, decimalIndex + 3)
    }
  }

  return value
}

const InitiateTransfer = () => {
  const navigation = useNavigation()
  const route = useRoute<RouteProp<RootStackParamList, 'InitiateTransfer'>>()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()

  const userInfo = useSelector(
    (state: Store.RootState) => state.authUser.userInfo,
  )
  const { chatUsers } = useSelector((state: Store.RootState) => state.chat)

  const {
    data: transferRule = {} as API.TransferRules,
  }: {
    data?: API.TransferRules
  } = useGetTransferRulesQuery(null, {
    refetchOnMountOrArgChange: true,
  })

  const [postInitiateTransferTrigger] = usePostInitiateTransferMutation()

  const chatUserData = chatUsers.byId[route.params.id]

  const [transferAmount, setTransferAmount] = useState('')

  const [transferDrawerVisible, setTransferDrawerVisible] = useState(false)

  const [confirmModalVisible, setConfirmModalVisible] = useState(false)
  const [confirmModalContent, setConfirmModalContent] = useState('')

  const handleConfirmModalHide = useCallback(() => {
    setConfirmModalVisible(false)
  }, [])

  const handleKeyPress = useCallback((val: string) => {
    setTransferAmount(formatNumber(val))
  }, [])

  const handleKeyConfirm = useCallback(() => {
    if (
      Number(transferAmount) < transferRule.min * 100 ||
      Number(transferAmount) > transferRule.max * 100
    ) {
      setConfirmModalContent(
        t('page.transfer.transfer-amount-range-limit', {
          min: transferRule.min * 100,
          max: transferRule.max * 100,
        }) as string,
      )
      setConfirmModalVisible(true)
    } else if (Number(transferAmount) > userInfo.token * 100) {
      setConfirmModalContent(
        t('page.common.token.insufficient-token') as string,
      )
      setConfirmModalVisible(true)
    } else {
      if (userInfo.hasPayPassword) {
        setTransferDrawerVisible(true)
      } else {
        navigation.navigate('SetPaymentPassword')
      }
    }
  }, [
    navigation,
    t,
    transferAmount,
    transferRule.max,
    transferRule.min,
    userInfo.hasPayPassword,
    userInfo.token,
  ])

  const handleTransferCancel = useCallback(() => {
    setTransferDrawerVisible(false)
  }, [])

  const handleTransferConfirm = useCallback(
    async (password: string) => {
      DeviceEventEmitter.emit('showGlobalLoading')
      const res = await postInitiateTransferTrigger({
        currency: 'usdt',
        type: 1,
        amount: Number(transferAmount) / 100,
        password: md5(password),
        receivers: [Number(route.params.id)],
      })
      DeviceEventEmitter.emit('hideGlobalLoading')

      if ('data' in res && res.data.code === 20000) {
        // 通知聊天界面转账成功
        DeviceEventEmitter.emit('transferPaymentSuccess', {
          transferId: res.data.data.transferId,
          transferAmount: transferAmount,
        })

        // 跳转到交易成功页面
        navigation.navigate('PaymentSuccess', {
          receiptor: chatUserData.displayName,
          amount: transferAmount,
        })
      } else if ('data' in res && res.data.code !== 20000) {
        setConfirmModalVisible(true)
        setConfirmModalContent(t(res.data.msg) as string)
      }
    },
    [
      chatUserData.displayName,
      navigation,
      postInitiateTransferTrigger,
      route.params.id,
      t,
      transferAmount,
    ],
  )

  return (
    <SafeAreaView style={[globalStyles.container, styles.container]}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 60, height: insets.top + 120 },
        ]}
      >
        <Header bgColor="#232631" />
        <View style={styles.receiptorInfo}>
          <View>
            <Text style={styles.displayName}>
              {t('page.transfer.transfer-to')} {chatUserData.displayName}
            </Text>
            <Text style={styles.email}>
              {t('page.common.email')}: {chatUserData.email}
            </Text>
          </View>
          <View>
            <Avatar
              size="small"
              avatarImage={chatUserData.avatar}
              equip={chatUserData.equip}
            />
          </View>
        </View>
      </View>
      <View style={[styles.body, { paddingTop: insets.top + 50 }]}>
        <Text style={styles.balance}>
          {t('page.transfer.balance')}:{' '}
          {((userInfo.token || 0) * 100).toFixed(0)}
        </Text>

        <View style={styles.transferAmount}>
          <View style={styles.transferAmountMain}>
            <Text style={styles.transferAmountLabel}>
              {t('page.transfer.transfer-amount')}
            </Text>
            <View style={styles.transferAmountInputWrapper}>
              <SvgIcon
                iconName="gold_coin"
                iconSize={30}
                style={globalStyles.mR3}
              />
              <TextInput
                style={styles.transferAmountInput}
                keyboardType="numeric"
                value={transferAmount}
                onChangeText={text => {
                  setTransferAmount(text)
                }}
                editable={false}
              />
            </View>
          </View>
          <Text style={styles.transferAmountNotes}>
            {t('page.transfer.transfer-notes', {
              min: transferRule.min * 100,
              max: transferRule.max * 100,
              dailyLimit: transferRule.dailyLimit * 100,
            })}
          </Text>
        </View>
      </View>

      <NumericKeyboard
        type="decimal-confirm"
        value={transferAmount}
        onKeyPress={handleKeyPress}
        onConfirm={handleKeyConfirm}
        confirmText={t('page.common.transfer')}
      />

      <PaymentConfirmation
        visible={transferDrawerVisible}
        receiptor={chatUserData}
        amount={transferAmount}
        onCancel={handleTransferCancel}
        onConfirm={handleTransferConfirm}
      />

      <ConfirmModal
        visible={confirmModalVisible}
        content={confirmModalContent}
        onConfirm={handleConfirmModalHide}
      />
    </SafeAreaView>
  )
}

export default React.memo(InitiateTransfer)

const styles = StyleSheet.create({
  container: {
    paddingTop: 60,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#232631',
    paddingHorizontal: 24,
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
  },
  receiptorInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  displayName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  email: {
    fontSize: 12,
    color: '#fff',
  },

  balance: {
    textAlign: 'right',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },

  transferAmount: {
    marginTop: 20,
    flex: 1,
  },
  transferAmountMain: {
    flex: 1,
  },

  transferAmountLabel: {
    fontSize: 16,
    color: '#fff',
  },

  transferAmountInputWrapper: {
    borderColor: 'rgba(255,255,255,0.4)',
    borderWidth: 1,
    borderRadius: 999,
    marginTop: 15,
    paddingHorizontal: 15,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },

  transferAmountInput: {
    fontSize: 34,
    marginLeft: 10,
    flex: 1,
    color: '#fff',
  },

  transferAmountNotes: {
    marginBottom: 20,
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
  },

  transferDrawer: {
    backgroundColor: '#232631',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    padding: 24,
  },

  transferInfo: {},
})
