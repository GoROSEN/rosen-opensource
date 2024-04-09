import React, { useCallback, useState } from 'react'
import {
  DeviceEventEmitter,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import md5 from 'md5'

import { globalStyles } from '@/constants'
import Header from '@/components/Header'
import Button from '@/components/Button'
import AnimatedCodeInput from '@/components/CodeInput'
import Drawer from '@/components/Drawer'
import { ConfirmModal } from '@/components/Modal'
import NumericKeyboard from '@/components/Keyboard/NumericKeyboard'

import { usePostSetPayPasswordMutation } from '@/services/modules/transfer'

const SetPaymentPassword = () => {
  const { t } = useTranslation()
  const navigation = useNavigation()

  const [password, setPassword] = useState('')
  const [confirmationPassword, setConfirmationPassword] = useState('')
  const [passwordTmp, setPasswordTmp] = useState('')
  const [passwordInput, setPasswordInput] = useState(1)
  const [passwordLength] = useState(6)
  const [setPasswordSuccessful, setSetPasswordSuccessful] = useState(true)

  const [postSetPayPasswordTrigger] = usePostSetPayPasswordMutation()

  const [confirmModalVisible, setConfirmModalVisible] = useState(false)
  const [confirmModalContent, setConfirmModalContent] = useState('')
  const [keyboardVisible, setKeyboardVisible] = useState(false)

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

    if (setPasswordSuccessful) {
      navigation.goBack()
    }
  }, [navigation, setPasswordSuccessful])

  const handleDone = useCallback(async () => {
    if (!password || password !== confirmationPassword) {
      setConfirmModalVisible(true)
      setConfirmModalContent(
        t('page.transfer.set-password.invalid-password') as string,
      )
    } else {
      DeviceEventEmitter.emit('showGlobalLoading')
      const res = await postSetPayPasswordTrigger({
        new: md5(password),
      })
      DeviceEventEmitter.emit('hideGlobalLoading')

      if ('data' in res && res.data.code === 20000) {
        setConfirmModalContent(
          t('page.transfer.set-password.set-password-success') as string,
        )
        setConfirmModalVisible(true)
        setSetPasswordSuccessful(true)
      } else if ('data' in res && res.data.code !== 20000) {
        setConfirmModalVisible(true)
        setConfirmModalContent(t(res.data.msg) as string)
        setSetPasswordSuccessful(false)
      }
    }
  }, [confirmationPassword, password, postSetPayPasswordTrigger, t])

  return (
    <SafeAreaView
      style={[
        styles.container,
        globalStyles.container,
        globalStyles.containerPadding,
      ]}
    >
      <Header
        title={t('page.transfer.set-password.set-transaction-password')}
      />

      <View style={styles.main}>
        <View style={styles.passwordWrapper}>
          <Text style={styles.setPasswordDescriptionText}>
            {t('page.transfer.set-password.set-password-label')}
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

        <View>
          <Text style={styles.confirmThePasswordText}>
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

      <Button size="xlarge" onPress={handleDone}>
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

export default React.memo(SetPaymentPassword)

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },

  main: {
    flex: 1,
  },

  passwordWrapper: {
    marginBottom: 40,
  },

  setPasswordDescriptionText: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 15,
  },

  confirmThePasswordText: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 15,
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
