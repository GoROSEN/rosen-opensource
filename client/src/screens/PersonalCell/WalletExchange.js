import * as React from 'react'
import {
  View,
  StyleSheet,
  Text,
  ImageBackground,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Header from '@/components/Header'
import SvgIcon from '@/components/SvgIcon'
import { globalStyles } from '@/constants'
import * as Clipboard from 'expo-clipboard'
import { useGetUserBasicQuery } from '@/services/modules/member'
import { useTranslation } from 'react-i18next'
import 'react-native-get-random-values'
import 'react-native-url-polyfill/auto'
import { useDispatch } from 'react-redux'
import { useSelector } from 'react-redux'
import { clusterApiUrl, Connection, PublicKey } from '@solana/web3.js'
import * as Linking from 'expo-linking'
import nacl from 'tweetnacl'
import bs58 from 'bs58'
import { Buffer } from 'buffer'
import chain from '@/constants/chain'
import Button from '@/components/Button'
import LinearGradientText from '../../components/LinearGradientText'
import { useWithdrawTokenMutation } from '../../services/modules/exchange'
import ModalComp from '@/components/Popup'
import { ScrollView } from 'react-native-gesture-handler'
// import base58 from 'bs58'
// import PhantomWallet from './PhantomWallet'

// global.Buffer = global.Buffer || Buffer

// const NETWORK = clusterApiUrl(chain.NETWORK)

// const onConnectRedirectLink = Linking.createURL('onConnect')

// const decryptPayload = (data, nonce, sharedSecret) => {
//   if (!sharedSecret) {
//     throw new Error('missing shared secret')
//   }
//   const decryptedData = nacl.box.open.after(
//     bs58.decode(data),
//     bs58.decode(nonce),
//     sharedSecret,
//   )
//   if (!decryptedData) {
//     throw new Error('Unable to decrypt data')
//   }
//   return JSON.parse(Buffer.from(decryptedData).toString('utf8'))
// }

// const encryptPayload = (payload, sharedSecret) => {
//   if (!sharedSecret) {
//     throw new Error('missing shared secret')
//   }

//   const nonce = nacl.randomBytes(24)

//   const encryptedPayload = nacl.box.after(
//     Buffer.from(JSON.stringify(payload)),
//     nonce,
//     sharedSecret,
//   )

//   return [nonce, encryptedPayload]
// }
// const buildUrl = (path, params) =>
//   `https://phantom.app/ul/v1/${path}?${params.toString()}`

// const onSignAndSendTransactionRedirectLink = Linking.createURL(
//   'onSignAndSendTransaction',
// )

const WalletExchange = ({ navigation }) => {
  const { t, i18n } = useTranslation()
  const { data: baseInfo = {} } = useGetUserBasicQuery('', {
    refetchOnMountOrArgChange: true,
  })
  const publicKey = useSelector(state => state.authPubKey.sol)
  const [withdrawTokenTrigger, { isLoading: isWithdrawLoading }] =
    useWithdrawTokenMutation()
  const [inputAmount, setInputAmount] = React.useState()
  const [showPopUp, setShowPopUp] = React.useState(false)
  const [confirm, setConfirm] = React.useState(false)
  const [content, setContent] = React.useState('')
  const [showHeader, setShowHeader] = React.useState(true)
  // console.log(plotlist)
  const handleTokenWithdraw = ({ token, amount }) => {
    Keyboard.dismiss()
    if (inputAmount === '0') {
      return
    }
    withdrawTokenTrigger({ token: token, amount: Number(amount) }).then(dur => {
      console.log('===========================')
      console.log(dur)
      console.log('===========================')
      if (dur.data.code !== 20000) {
        setContent(t(dur.data.msg))
        setInputAmount()
        setShowPopUp(true)
      } else {
        setContent(`Successfully withdrew ${amount} ${'USDT'}`)
        setInputAmount()
        setShowPopUp(true)
      }
    })
  }

  const closePopUp = () => {
    setShowPopUp(false)
    setConfirm(false)
  }

  // console.log(plotlist)

  // const [showPopUp, setShowPopUp] = React.useState(false)
  // const [deepLink, setDeepLink] = React.useState('')
  // const connection = new Connection(NETWORK)
  // const [dappKeyPair] = React.useState(nacl.box.keyPair())
  // const [sharedSecret, setSharedSecret] = React.useState()
  // const [session, setSession] = React.useState()
  // const [loading, setLoading] = React.useState(false)
  // const [phantomWalletPublicKey, setPhantomWalletPublicKey] = React.useState(
  //   new PublicKey(useSelector(state => state.authPubKey.sol)),
  // ) //new PublicKey(useSelector(state => state.authPubKey.sol)),
  // React.useEffect(() => {
  //   ;(async () => {
  //     const initialUrl = await Linking.getInitialURL()
  //   })()
  //   const subscription = Linking.addEventListener('url', handleDeepLink)
  //   return () => {
  //     subscription.remove('url', handleDeepLink)
  //   }
  // }, [handleDeepLink])

  // React.useEffect(() => {
  //   if (!deepLink) {
  //     return
  //   }

  //   const url = new URL(deepLink)
  //   const params = url.searchParams

  //   if (params.get('errorCode')) {
  //     console.log(JSON.stringify(Object.fromEntries([...params]), null, 2))
  //     return
  //   }

  //   if (/onConnect/.test(url)) {
  //     const sharedSecretDapp = nacl.box.before(
  //       bs58.decode(params.get('phantom_encryption_public_key')),
  //       dappKeyPair.secretKey,
  //     )
  //     const connectData = decryptPayload(
  //       params.get('data'),
  //       params.get('nonce'),
  //       sharedSecretDapp,
  //     )
  //     setSharedSecret(sharedSecretDapp)
  //     setSession(connectData.session)
  //     console.log('here is what a public key ')
  //     console.log(new PublicKey(connectData.public_key))
  //     setPhantomWalletPublicKey(new PublicKey(connectData.public_key))
  //     // setPhantomWalletPublicKey(JSON.stringify(connectData.public_key))
  //     console.log('setphaton here', phantomWalletPublicKey)
  //     console.log(JSON.stringify(connectData, null, 2))
  //   } else if (/onDisconnect/.test(url.pathname)) {
  //     console.log('Disconnected!')
  //   }
  //   // else {
  //   //   setStage(stage + ' not test' + `${url}`)
  //   // }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [deepLink])

  // const connect = React.useCallback(async () => {
  //   const params = new URLSearchParams({
  //     dapp_encryption_public_key: bs58.encode(dappKeyPair.publicKey),
  //     cluster: 'devnet',
  //     app_url: 'https://phantom.app',
  //     redirect_link: onConnectRedirectLink,
  //   })
  //   const url = buildUrl('connect', params)
  //   Linking.openURL(url)
  // }, [dappKeyPair.publicKey])

  // const handleDeepLink = React.useCallback(({ url }) => {
  //   setDeepLink(url)
  // }, [])

  // const { data: exchangeRate = 0 } = useGetExchangeRateQuery(
  //   { from: 'rosen', to: 'energy' },
  //   {
  //     refetchOnMountOrArgChange: true,
  //   },
  // )

  // const createTransferTransaction = async () => {
  //   if (!phantomWalletPublicKey) {
  //     throw new Error('missing public key from user')
  //   }
  //   console.log('tcreate')
  //   console.log(phantomWalletPublicKey)
  //   let transaction = new Transaction().add(
  //     SystemProgram.transfer({
  //       fromPubkey: phantomWalletPublicKey,
  //       toPubkey: phantomWalletPublicKey,
  //       lamports: 100,
  //     }),
  //   )
  //   transaction.feePayer = phantomWalletPublicKey
  //   const anyTransaction = transaction
  //   anyTransaction.recentBlockhash = (
  //     await connection.getLatestBlockhash()
  //   ).blockhash
  //   return transaction
  // }

  // const signAndSendTransaction = async () => {
  //   setLoading(true)
  //   console.log('ready')
  //   const transaction = await createTransferTransaction()

  //   console.log('trans')
  //   const serializedTransaction = transaction.serialize({
  //     requireAllSignatures: false,
  //   })

  //   const payload = {
  //     session,
  //     transaction: bs58.encode(serializedTransaction),
  //   }
  //   const [nonce, encryptedPayload] = encryptPayload(payload, sharedSecret)

  //   const params = new URLSearchParams({
  //     dapp_encryption_public_key: bs58.encode(dappKeyPair.publicKey),
  //     nonce: bs58.encode(nonce),
  //     redirect_link: onSignAndSendTransactionRedirectLink,
  //     payload: bs58.encode(encryptedPayload),
  //   })

  //   const url = buildUrl('signAndSendTransaction', params)
  //   Linking.openURL(url)
  //   setLoading(false)
  // }

  const copyToClipboard = async address => {
    await Clipboard.setStringAsync(address)
    Alert.alert(
      'Successfully copied the address!',
      'Now you can go to your wallet and send token to this address',
      [
        {
          text: 'OK',
        },
      ],
    )
  }

  // const [address, setAddress] = React.useState()
  // // console.log(plotlist)
  // const [exchangeTrigger] = useExchangeRosenMutation()

  // const handleRosenExchange = () => {
  //   Keyboard.dismiss()
  //   if (address === '0') {
  //     return
  //   }
  //   exchangeTrigger({
  //     from: 'energy',
  //     to: 'rosen',
  //     value: Number(address * exchangeRate),
  //   }).then(dur => {
  //     console.log(dur)
  //     setCost(dur.data.cost)
  //     setAddress('0')
  //     setShowPopUp(true)
  //   })
  // }

  // const closePopUp = () => {
  //   setShowPopUp(false)
  // }

  return (
    <SafeAreaView
      style={[globalStyles.container, globalStyles.containerPadding]}
    >
      {showHeader && <Header title={'Wallet'} />}
      <ModalComp
        visible={showPopUp}
        content={content}
        confirmButton={closePopUp}
      />
      <TouchableWithoutFeedback
        onPress={() => {
          Keyboard.dismiss()
        }}
      >
        <KeyboardAvoidingView behavior="position" keyboardVerticalOffset={-30}>
          <ScrollView>
            <View style={styles.rosenView}>
              <ImageBackground
                source={require('@/assets/images/rosen_background.png')}
                imageStyle={styles.rosenBackgroud}
                resizeMode={'contain'}
              >
                <View style={styles.centerView}>
                  <LinearGradientText size={20}>
                    {'Deposit USDT'}
                  </LinearGradientText>
                </View>
              </ImageBackground>
              <Text style={styles.addressTitle}>Your Rosen Address: </Text>
              <TouchableOpacity
                onPress={() => copyToClipboard(baseInfo.sysWalletAddresses[0])}
                style={styles.copy}
              >
                <Text style={styles.addressStyle}>
                  {baseInfo.sysWalletAddresses[0]} (Click to Copy)
                </Text>
              </TouchableOpacity>
              <Text style={styles.copynote}>
                Note: You can click to copy the address above and go to your
                wallet to send USDT to the address to deposit USDT into Rosen.
                After transferring USDT to this address, it may take some time
                for the system to be processed and updated, please wait
                patiently
              </Text>
              {/* <Button
              style={styles.button}
              onPress={signAndSendTransaction}
              loading={loading}
              disabled={true}
            >
              {t('page.personalcell.walletexchange.deposit')} (
              {t('page.common.coming-soon')})
            </Button> */}
            </View>
            <View style={styles.rosenView}>
              <ImageBackground
                source={require('@/assets/images/rosen_background.png')}
                imageStyle={styles.rosenBackgroud}
                resizeMode={'contain'}
              >
                <View style={styles.centerView}>
                  <LinearGradientText size={20}>
                    {'Withdraw USDT'}
                  </LinearGradientText>
                  <Text style={styles.addressTitle}>Your Balance: </Text>
                  <Text style={styles.tokenText}>{baseInfo.token}</Text>
                  <View style={styles.tokenView}>
                    <SvgIcon
                      iconName="usdt_symbol"
                      iconSize={18}
                      style={globalStyles.mR3}
                    />
                    <Text style={styles.tokenNameText}>USDT</Text>
                  </View>
                </View>
              </ImageBackground>
              <Text style={styles.addressTitle}>Your Connected Address: </Text>
              <View style={styles.copy}>
                {!!publicKey && (
                  <Text style={styles.addressStyle}>
                    {baseInfo.walletAddresses[0]}
                  </Text>
                )}
                {!publicKey && (
                  <TouchableOpacity
                    style={styles.connectButton}
                    onPress={() => {
                      navigation.navigate('Settings', { email: baseInfo.email })
                    }}
                  >
                    <Text style={styles.connectText}>
                      Click to {t('page.personalcell.settings.connect')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              {/* <Text style={styles.addressTitle}>Enter Your Target Address: </Text>
            <View style={styles.textInputView}>
              <TextInput
                style={{ color: 'white' }}
                placeholder="Enter Your Target Address"
                multiline={true}
                maxLength={128}
                blurOnSubmit={true}
                placeholderTextColor={'#rgba(255, 255, 255, 0.4)'}
                onChangeText={text => {
                  setAddress(text)
                }}
                value={address}
              />
            </View> */}
              <Text style={styles.addressTitle}>
                Please Enter the Token Amount:
              </Text>
              <View style={styles.amount}>
                <View style={styles.textInputView1}>
                  <TextInput
                    style={{ color: 'white' }}
                    keyboardType="numeric"
                    placeholder="Enter USDT Amount"
                    blurOnSubmit={true}
                    onFocus={() => {
                      setShowHeader(false)
                    }}
                    onBlur={() => {
                      setShowHeader(true)
                    }}
                    editable={!confirm}
                    placeholderTextColor={'#rgba(255, 255, 255, 0.4)'}
                    onChangeText={text => {
                      const newText = text.replace(/[^0-9^]/g, '')
                      setInputAmount(
                        Number(newText) > baseInfo.token
                          ? baseInfo.token.toString()
                          : newText,
                      )
                    }}
                    value={inputAmount}
                  />
                </View>
                <Text style={styles.amountText}>USDT</Text>
              </View>
              <Text style={styles.copynote}>
                Note: The minimum withdrawal amount is 50 USDT
              </Text>
              {confirm && (
                <View style={styles.confirmStyle}>
                  <Button
                    style={styles.buttonConfirm}
                    type={'hollow'}
                    size={'middle'}
                    onPress={() => {
                      setConfirm(false)
                    }}
                  >
                    {t('page.common.cancel')}
                  </Button>
                  <Button
                    style={styles.buttonConfirm}
                    loading={isWithdrawLoading}
                    onPress={() => {
                      handleTokenWithdraw({
                        token: 'usdt',
                        amount: inputAmount,
                      })
                    }}
                  >
                    {t('page.common.confirm')}
                  </Button>
                </View>
              )}
              {!confirm && (
                <Button
                  style={styles.button}
                  disabled={!inputAmount}
                  onPress={() => {
                    setConfirm(true)
                  }}
                >
                  {t('page.personalcell.walletexchange.withdraw')}
                </Button>
              )}
              {/* <Button
              style={styles.button}
              onPress={signAndSendTransaction}
              loading={loading}
              disabled={true}
            >
              {t('page.personalcell.walletexchange.deposit')} (
              {t('page.common.coming-soon')})
            </Button> */}
            </View>
          </ScrollView>
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
  connectText: {
    color: '#5A8CFF',
    fontSize: 14,
    fontWeight: '500',
  },
  copynote: {
    fontSize: 10,
    color: '#fff',
    opacity: 0.4,
    marginVertical: 5,
  },
  amount: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    marginTop: 15,
    minWidth: '30%',
  },
  buttonConfirm: {
    marginTop: 15,
    width: 110,
  },
  addressStyle: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '300',
  },
  amountText: {
    fontSize: 14,
    color: '#fff',
    marginLeft: 8,
    marginTop: 6,
    fontWeight: '400',
  },
  confirmStyle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 240,
  },
  addressTitle: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
    marginTop: 10,
  },
  copy: {
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
    borderRadius: 30,
    backgroundColor: '#232631',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
    padding: 30,
    overflow: 'hidden',
  },
  energyView: {
    borderRadius: 20,
    backgroundColor: '#232631',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 20,
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
    width: 240,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 30,
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 2,
    paddingBottom: 5,
  },
  textInputView1: {
    width: 190,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 30,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    paddingVertical: 8,
  },
  rosenBackgroud: {
    width: 420,
    height: 450,
    top: -40,
    left: -100,
  },
  centerView: {
    alignItems: 'center',
  },
  bixTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
})

export default WalletExchange
