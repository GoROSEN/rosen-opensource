import 'react-native-get-random-values'
import 'react-native-url-polyfill/auto'
import { useDispatch } from 'react-redux'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View, StyleSheet, Text, FlatList } from 'react-native'
import Header from '@/components/Header'
import { useSelector } from 'react-redux'
import WalletAppCard from './Component/WalletAppCard'
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
import { useTranslation } from 'react-i18next'
import chain from '@/constants/chain'
global.Buffer = global.Buffer || Buffer

const NETWORK = clusterApiUrl(chain.NETWORK)

const onConnectRedirectLink = Linking.createURL('onConnect')

const buildUrl = (path, params) =>
  `https://phantom.app/ul/v1/${path}?${params.toString()}`

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

const walletApps = [
  { appIcon: require('@/assets/images/phamton.png'), appName: 'Phamton' },
  { appIcon: require('@/assets/images/metamask.png'), appName: 'Metamask' },
]

const WalletVerify = ({ navigation }) => {
  const { t, i18n } = useTranslation()
  nacl.setPRNG(function (s, t) {
    return (
      ((s = (s + 1831565813) | 0),
      (t = Math.imul(s ^ (s >>> 15), 1 | s)),
      (t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t),
      (t ^ (t >>> 14)) >>> 0) /
      2 ** 32
    )
    // ... copy n random bytes into x ...
  })
  const userInfo = useSelector(state => state.authUser.userInfo)
  // console.log(plotlist)
  const [deepLink, setDeepLink] = useState('')
  const [logs, setLogs] = useState([])
  const connection = new Connection(NETWORK)
  const publicKey = useSelector(state => state.authPubKey.sol)
  const [key, setKey] = useState('')
  // store dappKeyPair, sharedSecret, session and account SECURELY on device
  // to avoid having to reconnect users.
  const [dappKeyPair] = useState(nacl.box.keyPair())
  const [sharedSecret, setSharedSecret] = useState()
  const [session, setSession] = useState()
  const [phantomWalletPublicKey, setPhantomWalletPublicKey] = useState()
  const [stage, setStage] = useState('start')
  const [pathname, setPathname] = useState()
  // const dispatch = useDispatch()

  useEffect(() => {
    ;(async () => {
      const initialUrl = await Linking.getInitialURL()
      if (initialUrl) {
        setStage(stage + 'getinitialurl')
        setDeepLink(initialUrl)
      } else {
        setStage(stage + 'not getinitialurl')
      }
    })()
    const subscription = Linking.addEventListener('url', handleDeepLink)
    return () => {
      subscription.remove('url', handleDeepLink)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleDeepLink])

  const handleDeepLink = useCallback(({ url }) => {
    setStage(stage + ' try set deep link ')
    setDeepLink(url)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // handle inbounds links
  useEffect(() => {
    if (!deepLink) {
      setStage(stage + 'no deep link')
      return
    }
    setStage('get deep link')

    const url = new URL(deepLink)
    const params = url.searchParams

    if (params.get('errorCode')) {
      setStage(stage + 'error in getting params')
      console.log(JSON.stringify(Object.fromEntries([...params]), null, 2))
      return
    }

    setPathname(/onConnect/.test(url))
    console.log('testurl:', pathname)
    if (/onConnect/.test(url)) {
      const sharedSecretDapp = nacl.box.before(
        bs58.decode(params.get('phantom_encryption_public_key')),
        dappKeyPair.secretKey,
      )
      setStage(stage + 'start connect')
      const connectData = decryptPayload(
        params.get('data'),
        params.get('nonce'),
        sharedSecretDapp,
      )
      setStage(stage + 'get connect Data')
      setSharedSecret(sharedSecretDapp)
      setSession(connectData.session)
      console.log('here is what a public key ')
      console.log(new PublicKey(connectData.public_key))
      // setPhantomWalletPublicKey(new PublicKey(connectData.public_key))
      setPhantomWalletPublicKey(JSON.stringify(connectData.public_key))
      console.log('setphaton here', phantomWalletPublicKey)
      // dispatch(
      //   connectPublicKey({
      //     publicKey: JSON.stringify(connectData.public_key),
      //     chain: 'sol',
      //   }),
      // )
      setKey(JSON.stringify(connectData.public_key))
      console.log('dispatch here', publicKey)
      setStage(stage + ' dispatch here')
      console.log(JSON.stringify(connectData, null, 2))
    } else if (/onDisconnect/.test(url.pathname)) {
      setStage(stage + 'disconnected')
      console.log('Disconnected!')
    }
    // else {
    //   setStage(stage + ' not test' + `${url}`)
    // }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLink])

  const connect = useCallback(async () => {
    const params = new URLSearchParams({
      dapp_encryption_public_key: bs58.encode(dappKeyPair.publicKey),
      cluster: chain.NETWORK,
      app_url: 'https://phantom.app',
      redirect_link: onConnectRedirectLink,
    })
    const url = buildUrl('connect', params)
    Linking.openURL(url)
  }, [dappKeyPair.publicKey])

  console.log('baseInfo===============')
  console.log(userInfo)

  return (
    <View style={styles.propertyView}>
      <Header
        title={t('page.personalcell.walletverify.connet-your-wallet')}
        goBackCb={() => {
          navigation.navigate('Settings', {
            pubKey: key.substring(1, key.length - 1),
          })
        }}
      />
      <Text style={styles.addressText}>
        {t('page.personalcell.walletverify.your-address-is')} {key ? key : '-'}
      </Text>
      {/* <Text style={styles.addressText}>stage {stage}</Text>
      <Text style={styles.addressText}>url {durl}</Text>
      <Text style={styles.addressText}>{`pathname ${pathname}`}</Text>
      <Text style={styles.addressText}>deeplink {deepLink}</Text> */}
      <FlatList
        style={styles.flatlistView}
        keyExtractor={(item, index) => 'key' + index}
        data={walletApps}
        scrollEnabled={true}
        renderItem={({ item }) => (
          <WalletAppCard
            AppIcon={item.appIcon}
            AppName={item.appName}
            OnPress={connect}
          />
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  maskGroupIcon: {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: 40,
  },
  addressText: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'left',
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  nameText: {
    position: 'relative',
    fontSize: 18,
    color: '#fff',
    textAlign: 'left',
    marginLeft: 5,
  },
  blazerView: {
    position: 'relative',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  flatlistView: {
    position: 'relative',
  },
  propertyView: {
    paddingTop: 120,
    paddingHorizontal: 24,
    position: 'relative',
    backgroundColor: '#000',
    width: '100%',
    flex: 1,
    alignItems: 'center',
  },
})

export default WalletVerify
