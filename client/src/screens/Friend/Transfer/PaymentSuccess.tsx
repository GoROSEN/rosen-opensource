import React, { useCallback } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { globalStyles } from '@/constants'
import SvgIcon from '@/components/SvgIcon'
import Header from '@/components/Header'
import Button from '@/components/Button'

import type { RootStackParamList } from '@/navigation/RootNavigator'

const PaymentSuccess = () => {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const route = useRoute<RouteProp<RootStackParamList, 'PaymentSuccess'>>()

  const { receiptor, amount } = route.params

  const handleDone = useCallback(() => {
    navigation.goBack()
    navigation.goBack()
  }, [navigation])

  return (
    <SafeAreaView
      style={[globalStyles.container, globalStyles.containerPadding]}
    >
      <Header goBackCb={handleDone} />

      <View style={styles.main}>
        <SvgIcon
          iconName="transfer_status_success"
          iconSize={100}
          style={globalStyles.mR3}
        />
        <Text style={styles.paymentSuccessfulText}>
          {t('page.transfer.payment-successful')}
        </Text>

        <Text style={styles.awaitingReceiptText}>
          {t('page.transfer.transfer-status-sender.initiated', {
            name: receiptor,
          })}
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

      <Button size="xlarge" onPress={handleDone}>
        {t('page.common.done')}
      </Button>
    </SafeAreaView>
  )
}

export default React.memo(PaymentSuccess)

const styles = StyleSheet.create({
  main: {
    flex: 1,
    alignItems: 'center',
  },

  paymentSuccessfulText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
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
})
