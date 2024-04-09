import React, { useCallback, useState } from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { globalStyles } from '@/constants'
import SvgIcon from '@/components/SvgIcon'
import Drawer from '@/components/Drawer'
import NumericKeyboard from '@/components/Keyboard/NumericKeyboard'
import AnimatedCodeInput from '@/components/CodeInput'

type PageProps = {
  /** 是否显示 */
  visible: boolean
  /** 接受者信息 */
  receiptor: API.UserInfo
  /** 转账金额 */
  amount: string

  onCancel: () => void

  onConfirm: (code: string) => void
}

const PaymentConfirmation: React.FC<PageProps> = props => {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()

  const { visible, receiptor, amount, onCancel, onConfirm } = props

  const [code, setCode] = useState<string>('')
  const [codeLength] = useState(6)

  const handelCodeSubmit = useCallback(
    (codeValue: string) => {
      onConfirm(codeValue)
    },
    [onConfirm],
  )

  const handleKeyPress = useCallback(
    (val: string) => {
      if (val.length <= codeLength) {
        setCode(val)
      }
    },
    [codeLength],
  )

  const handleForgotPasswordPress = useCallback(() => {
    navigation.navigate('ResetPaymentPassword')
  }, [navigation])

  return (
    <Drawer visible={visible} onCancel={onCancel}>
      <View style={styles.transactionDrawerMain}>
        <View style={styles.transactionInfo}>
          <Text style={styles.displayName}>
            {t('page.transfer.transfer-to')} {receiptor.displayName}
          </Text>
          <View style={styles.transferAmount}>
            <SvgIcon
              iconName="gold_coin"
              iconSize={30}
              style={globalStyles.mR3}
            />
            <Text style={styles.transferAmountText}>
              {Number(amount).toFixed(2)}
            </Text>
          </View>
        </View>
        <View style={styles.transactionPassword}>
          <Text style={styles.transactionPasswordLabel}>
            {t('page.transfer.enter-transaction-password')}
          </Text>
          <AnimatedCodeInput
            value={code}
            password={true}
            numberOfInputs={codeLength}
            codeContainerStyle={styles.codeContainer}
            activeCodeContainerStyle={styles.activeCodeContainer}
            cursorStyle={styles.codeCursor}
            textColor="#fff"
            onSubmitCode={handelCodeSubmit}
          />
          <Pressable onPress={handleForgotPasswordPress}>
            <Text style={styles.transactionForgotPasswordText}>
              {t('page.transfer.forgot-password')}
            </Text>
          </Pressable>
        </View>
      </View>
      <View style={{ paddingBottom: insets.bottom }}>
        <NumericKeyboard
          type="numeric"
          value={code}
          onKeyPress={handleKeyPress}
        />
      </View>
    </Drawer>
  )
}

export default React.memo(PaymentConfirmation)

const styles = StyleSheet.create({
  transactionDrawerMain: {
    backgroundColor: '#232631',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    padding: 24,
  },

  transactionInfo: {
    alignItems: 'center',
  },

  displayName: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 10,
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

  transactionPassword: {
    marginTop: 55,
  },

  transactionPasswordLabel: {
    fontSize: 12,
    color: '#fff',
    marginBottom: 15,
  },

  transactionForgotPasswordText: {
    fontSize: 12,
    color: '#fff',
    marginTop: 15,
    textAlign: 'right',
  },

  codeContainer: {
    backgroundColor: '#000',
    borderColor: '#000',
    width: 40,
    height: 40,
  },

  activeCodeContainer: {
    backgroundColor: '#000',
    borderColor: '#000',
    width: 40,
    height: 40,
  },

  codeCursor: {
    width: 35,
    height: 35,
    marginTop: Platform.select({
      ios: 10,
      android: -38,
    }),
    marginLeft: 10,
  },
})
