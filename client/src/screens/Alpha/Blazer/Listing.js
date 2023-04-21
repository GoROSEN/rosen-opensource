import * as React from 'react'
import {
  View,
  StyleSheet,
  Text,
  Image,
  ImageBackground,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Header from '@/components/Header'
import Button from '@/components/Button'
import SvgIcon from '@/components/SvgIcon'
import { globalStyles } from '@/constants'
import { useListPlotOnMarketMutation } from '@/services/modules/market'
import ModalComp from '@/components/Popup'
import { useNavigation } from '@react-navigation/native'
import LinearGradientText from '@/components/LinearGradientText'
import { useTranslation } from 'react-i18next'

const Listing = props => {
  const { t, i18n } = useTranslation()
  const navigation = useNavigation()
  const [showPopUp, setShowPopUp] = React.useState(false)
  const [showHeader, setShowHeader] = React.useState(true)
  const [inputAmount, setInputAmount] = React.useState()
  const [modalState, setModalState] = React.useState(0)
  const [content, setContent] = React.useState(
    'Fail to list the plot, try again',
  )
  // console.log(plotlist)
  const [listTrigger, { isLoading: isListFetching }] =
    useListPlotOnMarketMutation()

  const textComponent = (
    <View style={styles.gradientText}>
      <Text style={styles.popUpContent}>
        {t('page.blazer.listing.confirm-listing')}
      </Text>
      <LinearGradientText
        size={14}
        style={styles.gradientText}
      >{`${inputAmount} USDT`}</LinearGradientText>
      <Text style={styles.popUpContent}>
        {t('page.blazer.listing.after-confirm')}
      </Text>
      <LinearGradientText size={14} style={styles.gradientText}>
        {t('page.blazer.listing.waiting-hour', { hour: '12' })}
      </LinearGradientText>
      <Text style={styles.popUpContent}>
        {t('page.blazer.listing.cancel-right')}
      </Text>
    </View>
  )
  const modalStateForConfirmation = [
    {
      height: 240,
      confirmButton: () => handleBuyPlot(),
      cancelButton: () => closePopUp(),
      textComponent: textComponent,
      content: false,
    },
    {
      height: 200,
      confirmButton: () => navigation.goBack(),
      cancelButton: false,
      textComponent: false,
      content: content,
    },
    {
      height: 200,
      confirmButton: () => {
        setShowPopUp(false)
        setModalState(0)
      },
      cancelButton: false,
      textComponent: false,
      content: content,
    },
  ]

  const handleBuyPlot = React.useCallback(() => {
    Keyboard.dismiss()
    if (inputAmount === '0') {
      return
    }
    listTrigger({
      plotId: props.route.params.id,
      price: Number(inputAmount),
      currency: 'usdt',
    }).then(dur => {
      console.log(dur)
      if (dur.data.code !== 20000) {
        setContent(t(dur.data.msg))
        setModalState(2)
      } else {
        setContent(
          t('message.listing-plot.success', {
            plot: props.route.params.name,
            amount: Number(inputAmount),
            token: 'USDT',
          }),
        )
        setModalState(1)
      }
    })
  }, [
    inputAmount,
    listTrigger,
    props.route.params.id,
    props.route.params.name,
    t,
  ])

  const closePopUp = React.useCallback(() => {
    setShowPopUp(false)
  }, [])

  return (
    <SafeAreaView
      style={[globalStyles.container, globalStyles.containerPadding]}
    >
      {showHeader && <Header title={`${t('page.common.listing')}`} />}
      <ModalComp
        visible={showPopUp}
        loading={isListFetching}
        confirmButton={modalStateForConfirmation[modalState].confirmButton}
        cancelButton={modalStateForConfirmation[modalState].cancelButton}
        textComponent={modalStateForConfirmation[modalState].textComponent}
        content={modalStateForConfirmation[modalState].content}
      />
      <TouchableWithoutFeedback
        onPress={() => {
          Keyboard.dismiss()
        }}
      >
        <KeyboardAvoidingView behavior="position" keyboardVerticalOffset={-30}>
          <View style={styles.allContainer}>
            <View>
              <Text style={styles.subTitle}>
                {t('page.blazer.listing.listing-the-plot')}
              </Text>
              <Text style={styles.plotName}>{props.route.params.name}</Text>
            </View>
            <View style={styles.alignImg}>
              <Image
                source={{
                  uri: `${props.route.params.img}?x-oss-process=style/p_50`,
                }}
                style={[
                  styles.plotImg,
                  props.route.params.style === 1 ? styles.activityPlotImg : '',
                ]}
                resizeMode="contain"
              />
            </View>
            <View style={styles.textInputView}>
              <TextInput
                style={{ color: 'white' }}
                keyboardType="numeric"
                placeholder={t(
                  'page.blazer.listing.enter-the-listed-price-in-rosen',
                )}
                onFocus={() => {
                  setShowHeader(false)
                }}
                onBlur={() => {
                  setShowHeader(true)
                }}
                placeholderTextColor={'#rgba(255, 255, 255, 0.4)'}
                onChangeText={text => {
                  const newText = text.replace(/[^\d]+/, '')
                  const maxExchangeAmount = 9999999
                  setInputAmount(
                    Number(newText) > maxExchangeAmount
                      ? maxExchangeAmount.toString()
                      : newText,
                  )
                }}
                value={inputAmount}
              />
              <SvgIcon
                iconName="usdt_symbol"
                iconSize={16}
                style={styles.rosenIcon}
              />
            </View>
            <Text style={styles.remarks}>
              {t(
                'page.blazer.listing.remarks-there-will-be-a-12-hour-countdown-after-you-set-up-listing,-and-the-public-sale-will-start-after-the-countdown-ends.',
              )}
            </Text>
            <View style={styles.buttons}>
              <Button
                style={styles.Button}
                type={'hollow'}
                onPress={() => {
                  navigation.goBack()
                }}
              >
                {t('page.common.cancel')}
              </Button>
              <Button
                style={styles.Button}
                onPress={() => {
                  if (inputAmount && inputAmount > 0) {
                    setShowPopUp(true)
                  }
                }}
              >
                {t('page.common.confirm')}
              </Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  propertyView: {
    paddingTop: 80,
    paddingHorizontal: 24,
    position: 'relative',
    backgroundColor: '#000',
    width: '100%',
    flex: 1,
    alignItems: 'center',
  },
  gradientText: {
    alignItems: 'center',
  },
  rosenIcon: {
    alignSelf: 'center',
    marginLeft: 8,
  },
  buttons: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignContent: 'space-between',
    marginTop: 20,
    width: 280,
  },
  popUpContent: {
    fontSize: 12,
    color: 'white',
    alignSelf: 'center',
    justifyContent: 'center',
  },
  plotImg: {
    flex: 1,
    borderRadius: 20,
  },
  activityPlotImg: {
    borderRadius: 0,
    resizeMode: 'contain',
  },
  remarks: {
    fontSize: 8,
    color: 'white',
  },
  allContainer: {
    backgroundColor: '#232631',
    height: 540,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  Button: {
    width: 120,
    height: 40,
  },
  subTitle: {
    fontSize: 20,
    color: 'white',
    marginRight: 140,
  },
  alignImg: {
    width: 280,
    height: 280,
    borderRadius: 20,
    alignSelf: 'center',
  },
  plotName: {
    fontSize: 16,
    color: 'white',
    alignSelf: 'center',
    marginVertical: 10,
  },
  tokenText: {
    fontSize: 40,
    color: '#fff',
    fontWeight: '400',
  },
  tokenNameText: {
    fontSize: 10,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.4)',
  },
  tokenView: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rosenView: {
    height: 288,
    borderRadius: 30,
    backgroundColor: '#232631',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
    padding: 40,
    overflow: 'hidden',
  },
  energyView: {
    height: 359,
    borderRadius: 20,
    backgroundColor: '#232631',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
    padding: 40,
  },
  rateText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '400',
    padding: 5,
  },
  rateText1: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '400',
  },
  textInputView: {
    width: 280,
    height: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 30,
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginTop: 20,
    marginBottom: 8,
    flexDirection: 'row',
  },
  rosenBackgroud: {
    width: 310,
    height: 321,
    top: -40,
    left: -80,
  },
  centerView: {
    alignItems: 'center',
  },
})

export default Listing
