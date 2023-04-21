import React, { useState, useRef } from 'react'
import {
  Animated,
  Alert,
  Dimensions,
  Image,
  ImageBackground,
  StyleSheet,
  TextInput,
  Text,
  View,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  TouchableOpacity,
} from 'react-native'
import { useSelector, useDispatch } from 'react-redux'
import md5 from 'md5'
import Checkbox from '@/components/Checkbox'
import { globalStyles } from '@/constants'
import Popup from '@/components/Popup'
import Button from '@/components/Button'
import TouchIcon from '@/components/TouchIcon'
import SvgIcon from '@/components/SvgIcon'
import { useSigninMutation } from '@/services/modules/member'
import { useDeviceBindMutation } from '@/services/modules/member'
import GoogleLoginIcon from './ThirdPartyAPPLogin/GoogleLogin'
import TwitterLoginIcon from './ThirdPartyAPPLogin/TwitterLogin'
import FacebookLoginIcon from './ThirdPartyAPPLogin/FacebookLogin'
import InstagramLoginIcon from './ThirdPartyAPPLogin/InstagramLogin'
import TiktokLoginIcon from './ThirdPartyAPPLogin/TiktokLogin'
import { api } from '@/services/api'
import { userInfo, clearUserInfo } from '@/store/authSlice'
import { disconnectPublicKey } from '@/store/blockchainAuth'
import { clearNotificationPermissionAsk } from '@/store/permissionSlice'
import { useTranslation } from 'react-i18next'
import BeautyWebView from './Terms'

const Screen = ({ navigation }) => {
  const dispatch = useDispatch()
  const notificationPushToken = useSelector(
    state => state.permission.notificationPushToken,
  )
  const [deviceBindTrigger] = useDeviceBindMutation()
  const { t, i18n } = useTranslation()
  const [trigger, { isLoading }] = useSigninMutation()
  const [agreementChecked, setAgreementChecked] = useState(false)
  const [userName, setUserName] = useState('')
  const [userNameVerify, setUserNameVerify] = useState(true)
  const [password, setPassword] = useState('')
  const [passwordVerify, setPasswordVerify] = useState(true)
  const [showPopup, setShowPopup] = useState(false)
  const [PopupContent, setPopupContent] = useState('')
  const shakeAnimation = useRef(new Animated.Value(0)).current

  const check = React.useCallback(() => {
    let verify = true
    if (userName === '') {
      setUserNameVerify(false)
      verify = false
    } else {
      setUserNameVerify(true)
    }

    if (password === '') {
      setPasswordVerify(false)
      verify = false
    } else {
      setPasswordVerify(true)
    }

    if (!agreementChecked) {
      startShake()
      verify = false
    }

    return verify
  }, [agreementChecked, password, startShake, userName])

  const handleUserNameChange = React.useCallback(newVal => {
    setUserName(newVal)
    if (newVal === '') {
      setUserNameVerify(false)
    } else {
      setUserNameVerify(true)
    }
  }, [])

  const handlePasswordChange = React.useCallback(newVal => {
    if (newVal === '') {
      setPassword('')
      setPasswordVerify(false)
    } else {
      setPassword(md5(newVal))
      setPasswordVerify(true)
    }
  }, [])

  const startShake = React.useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start()
  }, [shakeAnimation])

  const submit = React.useCallback(() => {
    if (check()) {
      // 清空所有api state
      // 这步只能放在这里处理，因为删除api的缓存会触发接口重新请求数据
      // 如果放在外面，token已经删除掉了，会报50018错误
      dispatch(api.util.resetApiState())
      trigger({
        mobile: userName,
        password: password,
        captcha: '2',
      }).then(res => {
        const { data, code, msg } = res.data
        // console.log(data)
        if (code !== 20000) {
          setShowPopup(true)
          setPopupContent(t(msg))
        } else {
          dispatch(userInfo(data))

          // 每次登录的时候绑定一下推送用的pushToken
          if (notificationPushToken) {
            deviceBindTrigger({
              devType: notificationPushToken.type,
              token: notificationPushToken.data,
            })
          }

          navigation.reset({
            index: 0,
            routes: [
              {
                name: 'Dashboard',
              },
            ],
          })
        }
      })
    }
  }, [
    check,
    deviceBindTrigger,
    dispatch,
    navigation,
    notificationPushToken,
    password,
    t,
    trigger,
    userName,
  ])

  const handlePopupClose = React.useCallback(() => {
    setShowPopup(false)
  }, [])

  React.useEffect(() => {
    // 清空钱包链接
    dispatch(disconnectPublicKey({ chain: 'sol' }))

    // 清空推送消息权限询问记录
    dispatch(clearNotificationPermissionAsk())

    // 清空用户基本信息
    dispatch(clearUserInfo())
  }, [dispatch])

  return (
    <KeyboardAvoidingView
      behavior="position"
      keyboardVerticalOffset={-150}
      style={[globalStyles.container]}
    >
      <View style={styles.container}>
        <View style={styles.rosenLogoContainer}>
          <ImageBackground
            source={require('@/assets/images/login_logo_bg.png')}
            style={styles.rosenLogo}
          >
            <SvgIcon iconName="rosen_logo" iconSize={96} />
            <SvgIcon iconName="rosen_logo_text" iconSize={80} />
          </ImageBackground>
        </View>

        <View style={styles.signinContainer}>
          <View
            style={[
              styles.inputWrapper,
              !userNameVerify ? styles.errorInputWrapper : '',
            ]}
          >
            <TextInput
              style={styles.signinInput}
              autoComplete="off"
              placeholder={t(
                'page.loginsignup.login.enter-your-phone-number-or-email-address',
              )}
              keyboardType="default"
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              onChangeText={handleUserNameChange}
            />
          </View>
          <View
            style={[
              styles.inputWrapper1,
              !passwordVerify ? styles.errorInputWrapper : '',
            ]}
          >
            <TextInput
              style={styles.signinInput}
              autoComplete="off"
              secureTextEntry={true}
              // keyboardType="default"
              // autoCapitalize="characters"
              placeholder={t('page.loginsignup.login.password')}
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              onChangeText={handlePasswordChange}
            />
          </View>
          <TouchableOpacity
            style={styles.forget}
            onPress={() => navigation.navigate('ForgetPassword')}
          >
            <Text style={styles.agreementText}>Forget Password?</Text>
          </TouchableOpacity>

          <Animated.View
            style={{ transform: [{ translateX: shakeAnimation }] }}
          >
            <View style={styles.consent}>
              <Pressable
                style={styles.agreementCheck}
                onPress={() => {
                  setAgreementChecked(!agreementChecked)
                }}
              >
                <Checkbox
                  disableText
                  isChecked={agreementChecked}
                  size={16}
                  fillColor="#fff"
                  disableBuiltInState
                  onPress={() => {
                    setAgreementChecked(!agreementChecked)
                  }}
                />
              </Pressable>
              <Pressable
                style={styles.agreementCheck}
                onPress={() => {
                  navigation.navigate('Terms')
                }}
              >
                <Text style={styles.agreementText}>
                  {t('page.loginsignup.login.consent-clause')}
                </Text>
              </Pressable>
            </View>
          </Animated.View>

          <View style={styles.btnGroup}>
            <Button
              loading={isLoading}
              style={styles.btn}
              size="large"
              onPress={submit}
            >
              {t('page.loginsignup.login.sign-in')}
            </Button>
            <Pressable
              style={[styles.btn, styles.btnTransparent]}
              onPress={() => {
                navigation.navigate('Signup')
              }}
            >
              <Text style={styles.btnTransparentText}>
                {t('page.loginsignup.login.sign-up')}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.thirdPartySignin}>
          {/* <GoogleLoginIcon />
          <TwitterLoginIcon />
          <InstagramLoginIcon />
          <FacebookLoginIcon />
          <TiktokLoginIcon /> */}
        </View>
      </View>

      <Popup
        visible={showPopup}
        content={PopupContent}
        confirmButton={handlePopupClose}
      />
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 100,
    paddingBottom: 40,
    paddingLeft: 45,
    paddingRight: 45,
    justifyContent: 'space-between',
    // flex: 1,
    height: Dimensions.get('window').height,
  },
  consent: {
    flexDirection: 'row',
  },
  rosenLogoContainer: {
    alignItems: 'center',
  },
  web: {
    position: 'absolute',
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'red',
  },
  rosenLogo: {
    width: 210,
    height: 150,
    paddingTop: 27,
    alignItems: 'center',
    resizeMode: 'cover',
  },
  forget: {
    alignItems: 'flex-end',
    marginVertical: 5,
    marginHorizontal: 5,
  },
  inputWrapper: {
    height: 50,
    borderRadius: 32,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 1,
    marginBottom: 30,
    padding: 5,
    justifyContent: 'center',
  },
  inputWrapper1: {
    height: 50,
    borderRadius: 32,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 1,
    padding: 5,
    justifyContent: 'center',
  },
  errorInputWrapper: {
    borderColor: 'rgba(255, 34, 0, 0.4)',
  },
  signinInput: {
    height: 40,
    fontSize: 12,
    paddingHorizontal: 25,
    color: '#fff',
    borderRadius: 20,
  },

  agreementCheck: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  agreementText: {
    color: 'rgba(90, 140, 255, 0.6)',
    marginLeft: 10,
  },

  btnGroup: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    borderStyle: 'solid',
    borderRadius: 25,
  },
  btn: {
    width: '50%',
  },
  btnTransparent: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnTransparentText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 20,
  },

  thirdPartySignin: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  thirdPartySigninItem: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    borderStyle: 'solid',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

export default Screen
