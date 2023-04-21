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
import Button from '@/components/Button'
import SvgIcon from '@/components/SvgIcon'
import { globalStyles } from '@/constants'
import * as Clipboard from 'expo-clipboard'
import { useGetUserBasicQuery } from '@/services/modules/member'
import {
  useGetExchangeRateQuery,
  useExchangeRosenMutation,
} from '@/services/modules/exchange'
import ModalComp from '@/components/Popup'
import { useTranslation } from 'react-i18next'
import 'react-native-get-random-values'
import 'react-native-url-polyfill/auto'
import { useDispatch } from 'react-redux'
import { useSelector } from 'react-redux'
import { connectPublicKey, disconnectPublicKey } from '@/store/blockchainAuth'
import {
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js'
import * as Linking from 'expo-linking'
import nacl from 'tweetnacl'
import bs58 from 'bs58'
import { Buffer } from 'buffer'
import chain from '@/constants/chain'
import base58 from 'bs58'
import PhantomWallet from './PhantomWallet'

global.Buffer = global.Buffer || Buffer

const NETWORK = clusterApiUrl(chain.NETWORK)

const onConnectRedirectLink = Linking.createURL('onConnect')

const decryptPayload = (data, nonce, sharedSecret) => {
  if (!sharedSecret) {
    throw new Error('missing shared secret')
  }
  const decryptedData = nacl.box.open.after(
    bs58.decode(data),
    bs58.decode(nonce),
    sharedSecret,
  )
  if (!decryptedData) {
    throw new Error('Unable to decrypt data')
  }
  return JSON.parse(Buffer.from(decryptedData).toString('utf8'))
}

const encryptPayload = (payload, sharedSecret) => {
  if (!sharedSecret) {
    throw new Error('missing shared secret')
  }

  const nonce = nacl.randomBytes(24)

  const encryptedPayload = nacl.box.after(
    Buffer.from(JSON.stringify(payload)),
    nonce,
    sharedSecret,
  )

  return [nonce, encryptedPayload]
}
const buildUrl = (path, params) =>
  `https://phantom.app/ul/v1/${path}?${params.toString()}`

const onSignAndSendTransactionRedirectLink = Linking.createURL(
  'onSignAndSendTransaction',
)

const WalletExchange = () => {
  const [deepLink, setDeepLink] = React.useState('')
  const connection = new Connection(NETWORK)
  const [dappKeyPair] = React.useState(nacl.box.keyPair())
  const [sharedSecret, setSharedSecret] = React.useState()
  const [session, setSession] = React.useState()
  const [loading, setLoading] = React.useState(false)
  const [phantomWalletPublicKey, setPhantomWalletPublicKey] = React.useState() //new PublicKey(useSelector(state => state.authPubKey.sol)),
  React.useEffect(() => {
    ;(async () => {
      const initialUrl = await Linking.getInitialURL()
    })()
    const subscription = Linking.addEventListener('url', handleDeepLink)
    return () => {
      subscription.remove('url', handleDeepLink)
    }
  }, [handleDeepLink])

  React.useEffect(() => {
    if (!deepLink) {
      return
    }

    const url = new URL(deepLink)
    const params = url.searchParams

    if (params.get('errorCode')) {
      console.log(JSON.stringify(Object.fromEntries([...params]), null, 2))
      return
    }

    if (/onConnect/.test(url)) {
      const sharedSecretDapp = nacl.box.before(
        bs58.decode(params.get('phantom_encryption_public_key')),
        dappKeyPair.secretKey,
      )
      const connectData = decryptPayload(
        params.get('data'),
        params.get('nonce'),
        sharedSecretDapp,
      )
      setSharedSecret(sharedSecretDapp)
      setSession(connectData.session)
      console.log('here is what a public key ')
      console.log(new PublicKey(connectData.public_key))
      setPhantomWalletPublicKey(new PublicKey(connectData.public_key))
      // setPhantomWalletPublicKey(JSON.stringify(connectData.public_key))
      console.log('setphaton here', phantomWalletPublicKey)
      console.log(JSON.stringify(connectData, null, 2))
    } else if (/onDisconnect/.test(url.pathname)) {
      console.log('Disconnected!')
    }
    // else {
    //   setStage(stage + ' not test' + `${url}`)
    // }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLink])

  const connect = React.useCallback(async () => {
    const params = new URLSearchParams({
      dapp_encryption_public_key: bs58.encode(dappKeyPair.publicKey),
      cluster: 'devnet',
      app_url: 'https://phantom.app',
      redirect_link: onConnectRedirectLink,
    })
    const url = buildUrl('connect', params)
    Linking.openURL(url)
  }, [dappKeyPair.publicKey])

  const handleDeepLink = React.useCallback(({ url }) => {
    setDeepLink(url)
  }, [])

  const { t, i18n } = useTranslation()
  const { data: baseInfo = {} } = useGetUserBasicQuery('', {
    refetchOnMountOrArgChange: true,
  })

  const [showPopUp, setShowPopUp] = React.useState(false)
  const { data: exchangeRate = 0 } = useGetExchangeRateQuery(
    { from: 'rosen', to: 'energy' },
    {
      refetchOnMountOrArgChange: true,
    },
  )

  const createTransferTransaction = async () => {
    if (!phantomWalletPublicKey) {
      throw new Error('missing public key from user')
    }
    console.log('tcreate')
    console.log(phantomWalletPublicKey)
    let transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: phantomWalletPublicKey,
        toPubkey: phantomWalletPublicKey,
        lamports: 1,
      }),
    )
    transaction.feePayer = phantomWalletPublicKey
    const anyTransaction = transaction
    anyTransaction.recentBlockhash = (
      await connection.getLatestBlockhash('finalized')
    ).blockhash
    return transaction
  }

  const signAndSendTransaction = async () => {
    setLoading(true)
    console.log('ready')
    const transaction = await createTransferTransaction()

    console.log('trans')
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
    })

    const payload = {
      session,
      transaction: bs58.encode(serializedTransaction),
    }
    const [nonce, encryptedPayload] = encryptPayload(payload, sharedSecret)

    const params = new URLSearchParams({
      dapp_encryption_public_key: bs58.encode(dappKeyPair.publicKey),
      nonce: bs58.encode(nonce),
      redirect_link: onSignAndSendTransactionRedirectLink,
      payload: bs58.encode(encryptedPayload),
    })

    const url = buildUrl('signAndSendTransaction', params)
    Linking.openURL(url)
    setLoading(false)
  }

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

  // const [inputAmount, setInputAmount] = React.useState()
  // // console.log(plotlist)
  // const [exchangeTrigger] = useExchangeRosenMutation()
  const [cost, setCost] = React.useState(0)

  // const handleRosenExchange = () => {
  //   Keyboard.dismiss()
  //   if (inputAmount === '0') {
  //     return
  //   }
  //   exchangeTrigger({
  //     from: 'energy',
  //     to: 'rosen',
  //     value: Number(inputAmount * exchangeRate),
  //   }).then(dur => {
  //     console.log(dur)
  //     setCost(dur.data.cost)
  //     setInputAmount('0')
  //     setShowPopUp(true)
  //   })
  // }

  const closePopUp = () => {
    setShowPopUp(false)
  }

  return (
    <SafeAreaView
      style={[globalStyles.container, globalStyles.containerPadding]}
    >
      <Header title={'Wallet'} />
      <ModalComp
        visible={showPopUp}
        content={`Successfully exchange ${(cost / exchangeRate).toFixed(
          0,
        )} Rosen with ${cost.toFixed(0)} ENRG`}
        confirmButton={closePopUp}
      />
      <TouchableWithoutFeedback
        onPress={() => {
          Keyboard.dismiss()
        }}
      >
        <KeyboardAvoidingView behavior="position" keyboardVerticalOffset={-30}>
          <View style={styles.rosenView}>
            <ImageBackground
              source={require('@/assets/images/rosen_background.png')}
              imageStyle={styles.rosenBackgroud}
              resizeMode={'contain'}
            >
              <View style={styles.centerView}>
                <Text style={styles.tokenText}>{baseInfo.token}</Text>
                <View style={styles.tokenView}>
                  <SvgIcon
                    iconName="rosen_symbol"
                    iconSize={18}
                    style={globalStyles.mR3}
                  />
                  <Text style={styles.tokenNameText}>ROS</Text>
                </View>
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
              Note: You can click to copy the address above and send USDT to the
              address to deposit token to ROSEN
            </Text>
            <Button
              style={styles.button}
              onPress={signAndSendTransaction}
              loading={loading}
            >
              {t('page.personalcell.walletexchange.deposit')}
            </Button>
            <Button style={styles.button} onPress={connect}>
              {t('page.personalcell.walletexchange.withdraw')} (Coming Soon)
            </Button>
          </View>
          {/* <View style={styles.energyView}>
            <View style={styles.centerView}>
              <Text style={styles.tokenText}>{baseInfo.energy}</Text>
              <View style={styles.tokenView}>
                <SvgIcon
                  iconName="energy_symbol"
                  iconSize={18}
                  style={globalStyles.mR3}
                />
                <Text style={styles.tokenNameText}>Energy</Text>
              </View>
            </View>
            <View style={styles.tokenView}>
              <Text style={styles.rateText}>Current Rosen/Energy Rate:</Text>
              <Text style={styles.rateText1}>{`1:${exchangeRate}`}</Text>
            </View>
            <View style={styles.textInputView}>
              <TextInput
                style={{ color: 'white' }}
                keyboardType="numeric"
                placeholder="Enter Rosen Amount"
                placeholderTextColor={'#rgba(255, 255, 255, 0.4)'}
                onChangeText={text => {
                  const newText = text.replace(/[^\d]+/, '')
                  const maxExchangeAmount = parseInt(
                    baseInfo.energy / exchangeRate,
                  )
                  setInputAmount(
                    Number(newText) > maxExchangeAmount
                      ? maxExchangeAmount.toString()
                      : newText,
                  )
                }}
                value={inputAmount}
              />
            </View>
            <View style={styles.tokenView}>
              <Text style={styles.rateText}>You will cost:</Text>
              <Text style={styles.rateText1}>
                {inputAmount ? inputAmount * exchangeRate : 0}
              </Text>
              <Text style={[styles.rateText, { paddingTop: 10 }]}>ENRG</Text>
            </View>
            <Button onPress={handleRosenExchange}>Exchange</Button>
          </View> */}
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
  copynote: {
    fontSize: 10,
    color: '#fff',
    opacity: 0.4,
    marginVertical: 5,
  },
  button: {
    marginVertical: 10,
    minWidth: '30%',
  },
  addressStyle: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '300',
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
    width: 200,
    height: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 30,
    justifyContent: 'center',
    paddingHorizontal: 12,
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

export default WalletExchange
