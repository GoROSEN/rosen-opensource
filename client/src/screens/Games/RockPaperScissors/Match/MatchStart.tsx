import React, { useCallback, useState } from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import Animated, { FadeOut } from 'react-native-reanimated'
import SvgIcon from '@/components/SvgIcon'
import Button from '../Components/Button'

type Props = {
  onMatchStartConfirm: () => void
}

const MatchStart: React.FC<Props> = props => {
  const { t } = useTranslation()
  const { onMatchStartConfirm } = props
  const userInfo = useSelector(
    (state: Store.RootState) => state.authUser.userInfo,
  )
  const [loading, setLoading] = useState(false)

  const handleConfirm = useCallback(() => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      onMatchStartConfirm()
    }, 1000)
  }, [onMatchStartConfirm])

  return (
    <Animated.View exiting={FadeOut}>
      <ScrollView>
        <View style={styles.matchStatus}>
          <View>
            <Text style={styles.matchTimes}>
              This is your 1 time participation today
            </Text>
            <Text style={styles.matchCost}>100 ENGY</Text>
            <Text style={styles.matchCostLabel}>
              This time you will consume
            </Text>
            <Text style={styles.matchCostDescription}>
              If you win, you will get 20/30 coins from the opponent If you
              lose, you will pay the Blazer 30 coins
            </Text>
          </View>
        </View>

        <View style={styles.balance}>
          <View style={styles.balanceItem}>
            <SvgIcon iconName="energy" iconSize={20} />
            <Text style={styles.balanceAmount}>{userInfo.energy || 0}</Text>
          </View>
          <View style={styles.balanceItem}>
            <SvgIcon iconName="gold_coin" iconSize={20} />
            <Text style={styles.balanceAmount}>
              {((userInfo.token || 0) * 100).toFixed(2)}
            </Text>
          </View>
        </View>
        <View style={styles.balanceLabel}>
          <Text style={styles.balanceLabelText}>
            Your current account balance
          </Text>
        </View>
        <View style={styles.tips}>
          <Text style={styles.tipsText}>
            Once the match starts, it cannot be canceled. If you quit midway, it
            may be regarded as giving up by the system and counted as a failure;
            Are you sure you want to start matching?
          </Text>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Button size="medium" loading={loading} onPress={handleConfirm}>
          {t('page.common.confirm')}
        </Button>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  matchStatus: {
    marginBottom: 30,
  },
  matchTimes: {
    textAlign: 'center',
  },
  matchCost: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#F8C366',
    marginTop: 15,
  },
  matchCostLabel: {
    textAlign: 'center',
    fontSize: 10,
    marginBottom: 15,
  },
  matchCostDescription: {
    textAlign: 'center',
    fontSize: 10,
  },
  balance: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    height: 37,
    borderRadius: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  balanceItem: {
    flexDirection: 'row',
  },
  balanceAmount: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  balanceLabel: {
    marginTop: 5,
    alignItems: 'center',
  },
  balanceLabelText: {
    fontSize: 10,
    fontWeight: 'bold',
  },

  tips: {
    marginVertical: 20,
  },
  tipsText: {
    fontSize: 12,
    textAlign: 'center',
  },

  footer: {
    alignItems: 'center',
  },
})

export default React.memo(MatchStart)
