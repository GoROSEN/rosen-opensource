import * as React from 'react'
import {
  Animated,
  ImageBackground,
  StyleSheet,
  TextInput,
  View,
  Text,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native'
import md5 from 'md5'
import { SafeAreaView } from 'react-native-safe-area-context'
import { globalStyles } from '@/constants'
import Popup from '@/components/Popup'
import Checkbox from '@/components/Checkbox'
import Header from '@/components/Header'
import Button from '@/components/Button'
import SvgIcon from '@/components/SvgIcon'
import VerifyCodeBtn from './VerifyCodeBtn'
import { useSignupMutation } from '@/services/modules/member'
import { useTranslation } from 'react-i18next'

const Signup = ({ navigation }) => {
  const { t, i18n } = useTranslation()
  const [trigger, { isLoading }] = useSignupMutation()
  const [agreementChecked, setAgreementChecked] = React.useState(false)
  const [email, setEmail] = React.useState('')
  const [emailVerify, setEmailVerify] = React.useState(true)
  const [vcode, setVCode] = React.useState('')
  const [codeVerify, setCodeVerify] = React.useState(true)
  const [pwd, setPwd] = React.useState('')
  const [pwdVerify, setPwdVerify] = React.useState(true)
  const [pwdConfirm, setPwdConfirm] = React.useState('')
  const [pwdConfirmVerify, setPwdConfirmVerify] = React.useState(true)
  const [showPopup, setShowPopup] = React.useState(false)
  const [PopupContent, setPopupContent] = React.useState('')
  const shakeAnimation = React.useRef(new Animated.Value(0)).current

  const check = React.useCallback(() => {
    let verify = true
    if (email === '') {
      setEmailVerify(false)
      verify = false
    } else {
      setEmailVerify(true)
    }

    if (vcode === '') {
      setCodeVerify(false)
      verify = false
    } else {
      setCodeVerify(true)
    }

    if (pwd === '') {
      setPwdVerify(false)
      verify = false
    } else {
      setPwdVerify(true)
    }
    if (pwdConfirm === '') {
      setPwdConfirmVerify(false)
      verify = false
    } else {
      setPwdConfirmVerify(true)
    }

    if (!agreementChecked) {
      startShake()
      verify = false
    }

    return verify
  }, [agreementChecked, email, pwd, pwdConfirm, startShake, vcode])

  const handleEmailChange = React.useCallback(newVal => {
    setEmail(newVal)
    if (newVal === '') {
      setEmailVerify(false)
    } else {
      setEmailVerify(true)
    }
  }, [])
  const handleCodeChange = React.useCallback(newVal => {
    setVCode(newVal)
    if (newVal === '') {
      setCodeVerify(false)
    } else {
      setCodeVerify(true)
    }
  }, [])
  const handlePwdChange = React.useCallback(newVal => {
    if (newVal === '') {
      setPwd('')
      setPwdVerify(false)
    } else {
      setPwd(md5(newVal))
      setPwdVerify(true)
    }
  }, [])
  const handlePwdConfirmChange = React.useCallback(newVal => {
    if (newVal === '') {
      setPwdConfirm('')
      setPwdConfirmVerify(false)
    } else {
      setPwdConfirm(md5(newVal))
      setPwdConfirmVerify(true)
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
      if (pwd !== pwdConfirm) {
        setPwdConfirmVerify(false)
      } else {
        trigger({
          userName: email,
          email: email,
          pwd: pwd,
          vcode: vcode,
        }).then(res => {
          const { code, msg } = res.data
          if (code !== 20000) {
            setShowPopup(true)
            setPopupContent(msg)
          } else {
            navigation.goBack()
          }
        })
      }
    }
  }, [check, email, navigation, pwd, pwdConfirm, trigger, vcode])

  const handlePopupClose = React.useCallback(() => {
    setShowPopup(false)
  }, [])

  return (
    <SafeAreaView
      style={[globalStyles.container, globalStyles.containerPadding]}
    >
      <Header />
      <ScrollView showsVerticalScrollIndicator={false}>
        <KeyboardAvoidingView behavior="position">
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
                !emailVerify ? styles.errorInputWrapper : '',
              ]}
            >
              <TextInput
                style={styles.signupInput}
                autoComplete="off"
                keyboardType="default"
                placeholder={t(
                  'page.loginsignup.signup.enter-your-email-address',
                )}
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                onChangeText={handleEmailChange}
              />
            </View>
            <View
              style={[
                styles.inputWrapper,
                styles.verificationCodeInputWrapper,
                !codeVerify ? styles.errorInputWrapper : '',
              ]}
            >
              <TextInput
                style={[styles.signupInput, styles.verificationCodeInput]}
                keyboardType="default"
                autoCapitalize="characters"
                placeholder={t(
                  'page.loginsignup.signup.enter-verification-code',
                )}
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                onChangeText={handleCodeChange}
              />
              <VerifyCodeBtn type="register" dest={email} channel="mail" />
            </View>
            <View
              style={[
                styles.inputWrapper,
                !pwdVerify ? styles.errorInputWrapper : '',
              ]}
            >
              <TextInput
                style={styles.signupInput}
                secureTextEntry={true}
                keyboardType="default"
                placeholder={t('page.loginsignup.signup.password')}
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                onChangeText={handlePwdChange}
              />
            </View>
            <View
              style={[
                styles.inputWrapper,
                !pwdConfirmVerify ? styles.errorInputWrapper : '',
              ]}
            >
              <TextInput
                style={styles.signupInput}
                autoComplete="off"
                secureTextEntry={true}
                keyboardType="default"
                placeholder={t('page.loginsignup.signup.confirm-your-password')}
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                onChangeText={handlePwdConfirmChange}
              />
            </View>

            <Animated.View
              style={{ transform: [{ translateX: shakeAnimation }] }}
            >
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
                <Text style={styles.agreementText}>
                  {t('page.loginsignup.login.consent-clause')}
                </Text>
              </Pressable>
            </Animated.View>

            <View style={styles.btnGroup}>
              <Button
                loading={isLoading}
                style={styles.btn}
                size="large"
                onPress={submit}
              >
                {t('page.loginsignup.login.sign-up')}
              </Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </ScrollView>
      <Popup
        visible={showPopup}
        content={PopupContent}
        confirmButton={handlePopupClose}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  rosenLogoContainer: {
    alignItems: 'center',
    height: 210,
  },
  rosenLogo: {
    width: 210,
    height: 150,
    paddingTop: 27,
    alignItems: 'center',
    resizeMode: 'cover',
  },

  inputWrapper: {
    height: 50,
    borderRadius: 25,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 1,
    marginBottom: 30,
    padding: 5,
    justifyContent: 'center',
  },
  errorInputWrapper: {
    borderColor: 'rgba(255, 34, 0, 0.4)',
  },
  verificationCodeInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  signupInput: {
    height: 40,
    fontSize: 12,
    paddingLeft: 25,
    color: '#fff',
    borderRadius: 20,
    // backgroundColor: '#999',
  },

  agreementCheck: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  agreementText: {
    color: 'rgba(90, 140, 255, 0.6)',
    marginLeft: 10,
  },
})

export default Signup
