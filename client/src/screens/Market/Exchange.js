import React from 'react'
import { useSelector } from 'react-redux'
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  TextInput,
} from 'react-native'
import { useGetUserBasicQuery } from '@/services/modules/member'
import { globalStyles } from '@/constants'
import SvgIcon from '@/components/SvgIcon'
import { useGetExchangeRateQuery } from '@/services/modules/exchange'
import Button from '@/components/Button'
import ModalComp from '@/components/Popup'
import { useExchangeRosenMutation } from '@/services/modules/exchange'
import { useTranslation } from 'react-i18next'

const Exchange = props => {
  const { t, i18n } = useTranslation()
  const [inputAmount, setInputAmount] = React.useState()
  const [more, setMore] = React.useState(false)
  const [isRosen, setIsRosen] = React.useState(false)
  const [showPopUp, setShowPopUp] = React.useState(false)
  const [exchangeTrigger, { isLoading: isExchangeFetching }] =
    useExchangeRosenMutation()
  const [cost, setCost] = React.useState(0)
  const [maxExchangeAmount, setMaxExchangeAmount] = React.useState(0)
  const [content, setContent] = React.useState('')
  const { data: baseInfo = {} } = useGetUserBasicQuery('', {
    refetchOnMountOrArgChange: true,
  })
  const { data: R2EexchangeRate = 0 } = useGetExchangeRateQuery(
    { from: 'rosen', to: 'energy' },
    {
      refetchOnMountOrArgChange: true,
    },
  )

  const { data: E2RexchangeRate = 0 } = useGetExchangeRateQuery(
    { from: 'energy', to: 'rosen' },
    {
      refetchOnMountOrArgChange: true,
    },
  )

  const handleRosenExchange = () => {
    if (inputAmount === '0') {
      return
    }
    exchangeTrigger({
      from: paramters.input,
      to: paramters.output,
      value: Math.ceil(inputAmount / paramters.exchangeRate),
    }).then(dur => {
      if (dur.data.code !== 20000) {
        console.log(dur.data.msg)
        setContent(t(dur.data.msg))
        setShowPopUp(true)
      } else {
        console.log(dur)
        setCost(dur.data.data.cost)
        setContent(
          t('message.exchange.success', {
            output_amount: dur.data.data.cost * paramters.exchangeRate,
            output_token: paramters.outputTokenName,
            input_amount: dur.data.data.cost,
            input_token: paramters.inputTokenName,
          }),
        )
        setInputAmount('0')
        setShowPopUp(true)
      }
    })
  }

  const closePopUp = () => {
    setShowPopUp(false)
  }

  const paramters = isRosen
    ? {
        exchangeRate: E2RexchangeRate,
        input: 'energy',
        output: 'usdt',
        inputTokenName: 'ENGY',
        outputTokenName: 'USDT',
        exchangeFee: 0,
        inputBalance: baseInfo.energy,
        Abbr: 'E2U',
        note: t(
          'page.market.exchange.a-small-exchange-fee-will-be-charged-when-you-exchange-rosen-using-engy',
        ),
      }
    : {
        exchangeRate: R2EexchangeRate,
        input: 'usdt',
        output: 'energy',
        inputTokenName: 'USDT',
        outputTokenName: 'ENGY',
        exchangeFee: 0,
        inputBalance: baseInfo.token,
        Abbr: 'U2E',
        note: t(
          'page.market.exchange.you-may-also-find-that-the-expected-output-engy-does-not-match-the-output-you-want,-this-is-because-rosen-has-no-decimals.-you-can-only-cost-integer-amount-of-rosen-to-exchange-engy',
        ),
      }

  return (
    <View style={styles.buyTokenView}>
      <ModalComp
        visible={showPopUp}
        content={content}
        confirmButton={closePopUp}
      />
      <Text style={styles.tokenTitle}>{t('page.common.buy')} ENGY/USDT</Text>
      <View style={styles.switchToken}>
        <TouchableOpacity
          style={isRosen ? styles.notChoose : styles.choose}
          onPress={() => {
            setIsRosen(false)
            setInputAmount(0)
          }}
        >
          <View style={styles.tokenSwitchRow}>
            <SvgIcon
              iconName="energy_symbol"
              iconSize={16}
              style={globalStyles.mR3}
            />
            <Text
              style={
                isRosen ? styles.assetsLabelNotChoose : styles.assetsLabelChoose
              }
            >
              ENGY
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={isRosen ? styles.choose : styles.notChoose}
          onPress={() => {
            setIsRosen(true)
            setInputAmount(0)
          }}
        >
          <View style={styles.tokenSwitchRow}>
            <SvgIcon
              iconName="usdt_symbol"
              iconSize={16}
              style={globalStyles.mR3}
            />
            <Text
              style={
                isRosen ? styles.assetsLabelChoose : styles.assetsLabelNotChoose
              }
            >
              USDT
            </Text>
          </View>
        </TouchableOpacity>
      </View>
      <View style={styles.exchangeBoard}>
        <View style={styles.textInputView}>
          <TextInput
            // eslint-disable-next-line react-native/no-inline-styles
            style={{ color: 'white' }}
            keyboardType="numeric"
            keyboardAppearance="dark"
            onFocus={props.handleInputFocus}
            onBlur={props.handleInputBlur}
            placeholder={t('page.market.exchange.enter-xxx-amount-you-want', {
              token: paramters.outputTokenName,
            })}
            placeholderTextColor={'#rgba(255, 255, 255, 0.4)'}
            onChangeText={text => {
              const newText = text.replace(/[^\d]+/, '')
              setMaxExchangeAmount(
                parseInt(paramters.inputBalance * paramters.exchangeRate),
              )
              const correctAmount =
                Number(newText) > maxExchangeAmount
                  ? maxExchangeAmount.toString()
                  : newText
                  ? parseInt(newText, 10).toString()
                  : newText
              const AmountWithoutDecimals = isRosen
                ? correctAmount
                : correctAmount % paramters.exchangeRate === 0
                ? correctAmount
                : correctAmount -
                  (correctAmount % paramters.exchangeRate) +
                  paramters.exchangeRate
              setInputAmount(AmountWithoutDecimals)
            }}
            value={inputAmount}
          />
        </View>
        <View style={styles.itemAlign}>
          <Text style={styles.itemName}>
            {t('page.market.exchange.current-exchange-rate-xxx', {
              tokenPairs: paramters.Abbr,
            })}
          </Text>
          <Text style={styles.itemNumber}>{paramters.exchangeRate}</Text>
        </View>
        <View style={styles.itemAlign}>
          <Text style={styles.itemName}>
            {t('page.market.exchange.expected-cost-xxx', {
              token: paramters.inputTokenName,
            })}
          </Text>
          <Text style={styles.itemNumber}>
            {inputAmount
              ? (inputAmount / paramters.exchangeRate).toFixed(0)
              : 0}
          </Text>
        </View>
        <View style={styles.itemAlign}>
          <Text style={styles.itemName}>
            {t('page.market.exchange.expected-output-xxx', {
              token: paramters.outputTokenName,
            })}
          </Text>
          <Text style={styles.itemNumber}>{inputAmount ? inputAmount : 0}</Text>
        </View>
        <TouchableOpacity
          style={styles.moreContainer}
          onPress={() => setMore(!more)}
        >
          <Text style={styles.moreText}>{`${t('page.common.more')}`}</Text>
        </TouchableOpacity>

        {more && (
          <View>
            <View style={styles.itemAlign}>
              <Text style={styles.itemName}>
                {t('page.market.exchange.exchange-fee')}
              </Text>
              <Text style={styles.itemNumber}>{0}</Text>
            </View>
            <View style={styles.itemAlign}>
              <Text style={styles.itemName}>{`${t('page.common.note')}: ${
                paramters.note
              }`}</Text>
            </View>
          </View>
        )}
      </View>
      <View style={styles.alignBtn}>
        <Button
          loading={isExchangeFetching}
          size="large"
          onPress={handleRosenExchange}
          style={styles.btn}
          disabled={inputAmount === 0 || !inputAmount}
        >
          {t('page.common.purchase')}
        </Button>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
  },
  tokenSwitchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    bottom: 15,
  },
  choose: {
    backgroundColor: '#232631',
    flex: 1,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notChoose: {
    flex: 1,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alignBtn: {
    flex: 1,
    paddingVertical: 18,
  },
  btn: {
    alignSelf: 'flex-end',
    width: 150,
    height: 50,
  },
  itemAlign: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 5,
  },
  moreContainer: {
    paddingVertical: 5,
  },
  textInputView: {
    height: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 32,
    justifyContent: 'center',
    paddingLeft: 12,
    marginVertical: 5,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
  },
  itemNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
  moreText: {
    color: 'rgba(255, 255, 255, 0.3)',
    alignSelf: 'center',
  },
  exchangeBoard: {
    width: 327,
    backgroundColor: '#232631',
    justifyContent: 'space-between',
    flexDirection: 'column',
    borderRadius: 20,
    padding: 24,
    bottom: 10,
  },
  tokenTitle: {
    fontSize: 20,
    color: 'white',
    fontWeight: '700',
  },
  switchToken: {
    width: 327,
    top: 20,
    borderColor: '#232631',
    borderWidth: 1,
    justifyContent: 'space-around',
    flexDirection: 'row',
    borderRadius: 20,
    height: 90,
  },
  buyTokenView: { flex: 1, flexDirection: 'column' },
  assets: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 50,
    flex: 1,
    bottom: 20,
  },
  assetsItem: {
    alignItems: 'center',
  },
  assetsCount: {
    fontSize: 20,
    color: '#fff',
    marginBottom: 5,
    fontWeight: '700',
  },
  assetsLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
  },
  assetsLabelChoose: {
    fontSize: 14,
    color: 'white',
  },
  assetsLabelNotChoose: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
  },
  tokenAlign: {
    flexDirection: 'row',
  },
  iconWraper: {
    alignItems: 'center',
    bottom: 25,
  },
  tokenboard: {
    backgroundColor: '#232631',
    width: 327,
    height: 86,
    borderRadius: 20,
    marginTop: 145,
  },
  verticalView: { flexDirection: 'column', flex: 1 },
  icon: { width: 50, height: 50, borderRadius: 50 },
  switch: {
    borderRadius: 12,
    padding: 7,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'flex-end',
    marginBottom: 20,
    height: 50,
    width: '100%',
    marginVertical: 10,
  },
  switchItem: {
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#232631',
    minWidth: 64,
  },
  switchItemActive: {
    backgroundColor: '#5A8CFF',
  },
  switchItemText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '400',
  },
  switchItemTextActive: {
    color: '#fff',
  },
})

export default Exchange
