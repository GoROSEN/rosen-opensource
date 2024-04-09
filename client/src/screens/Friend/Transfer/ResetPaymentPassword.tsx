import React, { useCallback, useState } from 'react'
import {
  DeviceEventEmitter,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useSelector } from 'react-redux'
import AnimatedCodeInput from '@/components/CodeInput'
import { globalStyles } from '@/constants'
import Header from '@/components/Header'
import Button from '@/components/Button'
import VerifyCodeBtn from '@/components/VerifyCodeBtn'

import Drawer from '@/components/Drawer'
import { ConfirmModal } from '@/components/Modal'
import NumericKeyboard from '@/components/Keyboard/NumericKeyboard'

import { usePostResetPayPasswordMutation } from '@/services/modules/transfer'

const ResetPaymentPassword = () => {
  const { t } = useTranslation()
  const navigation = useNavigation()

  const userInfo = useSelector(
    (state: Store.RootState) => state.authUser.userInfo,
  )

  const [codeVerify, setCodeVerify] = useState(true)
  const [vcode, setVCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmationPassword, setConfirmationPassword] = useState('')
  const [passwordTmp, setPasswordTmp] = useState('')
  const [passwordInput, setPasswordInput] = useState(1)
  const [passwordLength] = useState(6)
  const [resetPasswordSuccessful, setResetPasswordSuccessful] = useState(true)

  const [confirmModalVisible, setConfirmModalVisible] = useState(false)
  const [confirmModalContent, setConfirmModalContent] = useState('')
  const [keyboardVisible, setKeyboardVisible] = useState(false)

  const [postResetPayPasswordTrigger] = usePostResetPayPasswordMutation()

  const handlePasswordInputFocus = useCallback((val: string) => {
    setPasswordTmp(val)
    setKeyboardVisible(true)
    setPasswordInput(1)
  }, [])

  const handleCnfirmationPasswordInputFocus = useCallback((val: string) => {
    setPasswordTmp(val)
    setKeyboardVisible(true)
    setPasswordInput(2)
  }, [])

  const handleKeyboardCancel = useCallback(() => {
    setKeyboardVisible(false)
  }, [])

  const handleKeyPress = useCallback(
    (val: string) => {
      if (val.length <= passwordLength) {
        if (passwordInput === 1) {
          setPassword(val)
        } else {
          setConfirmationPassword(val)
        }

        setPasswordTmp(val)
      }
    },
    [passwordInput, passwordLength],
  )

  const handlePassowrdInputSubmit = useCallback(() => {
    setKeyboardVisible(false)
  }, [])

  const handleConfirmModalHide = useCallback(() => {
    setConfirmModalVisible(false)

    if (resetPasswordSuccessful) {
      navigation.goBack()
    }
  }, [navigation, resetPasswordSuccessful])

  const handleCodeChange = React.useCallback((newVal: string) => {
    setVCode(newVal)
    if (newVal === '') {
      setCodeVerify(false)
    } else {
      setCodeVerify(true)
    }
  }, [])

  const handleConfirm = useCallback(async () => {
    if (!vcode) {
      setConfirmModalContent(
        t('page.transfer.set-password.invalid-vcode') as string,
      )
      setConfirmModalVisible(true)
      return
    }
    if (!password || password !== confirmationPassword) {
      setConfirmModalVisible(true)
      setConfirmModalContent(
        t('page.transfer.set-password.invalid-password') as string,
      )
      return
    }

    DeviceEventEmitter.emit('showGlobalLoading')
    const res = await postResetPayPasswordTrigger({
      vcode: vcode,
      new: password,
    })
    DeviceEventEmitter.emit('hideGlobalLoading')

    if ('data' in res && res.data.code === 20000) {
      setConfirmModalContent(
        t('page.transfer.set-password.reset-password-success') as string,
      )
      setConfirmModalVisible(true)
      setResetPasswordSuccessful(true)
    } else if ('data' in res && res.data.code !== 20000) {
      setConfirmModalContent(t(res.data.msg) as string)
      setConfirmModalVisible(true)
      setResetPasswordSuccessful(false)
    }
  }, [confirmationPassword, password, postResetPayPasswordTrigger, t, vcode])

  return (
    <SafeAreaView
      style={[
        styles.container,
        globalStyles.container,
        globalStyles.containerPadding,
      ]}
    >
      <Header
        title={t('page.transfer.set-password.reset-transaction-password')}
      />

      <View style={styles.main}>
        <View style={styles.passwordRow}>
          <Text style={styles.passwordRowLabel}>
            {t('page.transfer.set-password.your-email-label')}
          </Text>
          <Text style={styles.emailText}>{userInfo.email}</Text>
        </View>

        <View style={styles.passwordRow}>
          <Text style={styles.passwordRowLabel}>
            {t('page.transfer.set-password.verification-code-label')}
          </Text>
          <View
            style={[
              styles.inputWrapper,
              !codeVerify ? styles.errorInputWrapper : null,
            ]}
          >
            <TextInput
              style={[styles.input]}
              keyboardType="numeric"
              autoCapitalize="characters"
              placeholder={
                t('page.loginsignup.signup.enter-verification-code') as string
              }
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              onChangeText={handleCodeChange}
            />
            <VerifyCodeBtn
              type="forgotppw"
              style={styles.verifyCodeBtn}
              dest={userInfo.email}
              channel="mail"
            />
          </View>
        </View>

        <View style={styles.passwordRow}>
          <Text style={styles.passwordRowLabel}>
            {t('page.transfer.set-password.set-transaction-password')}
          </Text>

          <AnimatedCodeInput
            password={true}
            value={password}
            numberOfInputs={passwordLength}
            codeContainerStyle={styles.codeContainer}
            activeCodeContainerStyle={styles.activeCodeContainer}
            cursorStyle={styles.codeCursor}
            textColor="#fff"
            onFocus={handlePasswordInputFocus}
            onSubmitCode={handlePassowrdInputSubmit}
          />
        </View>

        <View style={styles.passwordRow}>
          <Text style={styles.passwordRowLabel}>
            {t('page.transfer.set-password.confirm-the-password-label')}
          </Text>

          <AnimatedCodeInput
            password={true}
            value={confirmationPassword}
            numberOfInputs={passwordLength}
            codeContainerStyle={styles.codeContainer}
            activeCodeContainerStyle={styles.activeCodeContainer}
            cursorStyle={styles.codeCursor}
            textColor="#fff"
            onFocus={handleCnfirmationPasswordInputFocus}
            onSubmitCode={handlePassowrdInputSubmit}
          />
        </View>
      </View>

      <Button size="xlarge" onPress={handleConfirm}>
        {t('page.common.confirm')}
      </Button>

      <Drawer visible={keyboardVisible} onCancel={handleKeyboardCancel}>
        <NumericKeyboard
          type="numeric"
          value={passwordTmp}
          onKeyPress={handleKeyPress}
        />
      </Drawer>

      <ConfirmModal
        visible={confirmModalVisible}
        content={confirmModalContent}
        onConfirm={handleConfirmModalHide}
      />
    </SafeAreaView>
  )
}

export default React.memo(ResetPaymentPassword)

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },

  main: {
    flex: 1,
  },

  passwordRow: {
    marginBottom: 40,
  },

  passwordRowLabel: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 15,
  },

  emailText: {
    fontSize: 14,
    color: '#fff',
  },

  inputWrapper: {
    height: 50,
    borderRadius: 25,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 1,
    justifyContent: 'center',
    position: 'relative',
  },
  errorInputWrapper: {
    borderColor: 'rgba(255, 34, 0, 0.4)',
  },
  verifyCodeBtn: {
    position: 'absolute',
    top: 4,
    right: 5,
  },
  input: {
    height: 40,
    fontSize: 12,
    paddingLeft: 25,
    color: '#fff',
    borderRadius: 20,
  },

  codeContainer: {
    backgroundColor: '#232631',
    borderColor: '#232631',
    width: 40,
    height: 40,
  },

  activeCodeContainer: {
    backgroundColor: '#232631',
    borderColor: '#232631',
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
