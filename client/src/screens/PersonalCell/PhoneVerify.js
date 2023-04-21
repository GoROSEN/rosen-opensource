import React, { useCallback } from 'react'
import {
  StyleSheet,
  TextInput,
  View,
  Text,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native'
import md5 from 'md5'
import { globalStyles } from '@/constants'
import Checkbox from '@/components/Checkbox'
import Header from '@/components/Header'
import Button from '@/components/Button'
import SvgIcon from '@/components/SvgIcon'
import VerifyCodeBtn from '../Loginsignup/VerifyCodeBtn'
import { useSignupMutation } from '@/services/modules/member'
import { useTranslation } from 'react-i18next'

const PhoneVerify = ({ navigation }) => {
  const { t, i18n } = useTranslation()
  const [checked, setChecked] = React.useState(false)
  const [phone, setphone] = React.useState('')
  const [phoneVerify, setphoneVerify] = React.useState(true)
  const [code, setCode] = React.useState('')
  const [codeVerify, setCodeVerify] = React.useState(true)
  const [submitLoading, setSubmitLoading] = React.useState(false)

  const handlephoneChange = useCallback(newVal => {
    setphone(newVal)
    if (newVal === '') {
      setphoneVerify(false)
    } else {
      setphoneVerify(true)
    }
  }, [])

  const handleCodeChange = useCallback(newVal => {
    setCode(newVal)
    if (newVal === '') {
      setCodeVerify(false)
    } else {
      setCodeVerify(true)
    }
  }, [])

  //   const submit = () => {
  //     if (check()) {
  //       if (pwd !== pwdConfirm) {
  //         setPwdConfirmVerify(false)
  //       } else {
  //         setSubmitLoading(true)
  //         trigger({
  //           userName: phone,
  //           phone: phone,
  //           pwd: pwd,
  //         }).then(() => {
  //           setSubmitLoading(false)
  //           navigation.goBack()
  //         })
  //       }
  //     }
  //   }

  return (
    <View style={[globalStyles.container, styles.container]}>
      <Header title={'Verify Your Phone'} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{
          paddingTop: 40,
          flex: 1,
        }}
      >
        <View
          style={[
            styles.inputWrapper,
            !phoneVerify ? styles.errorInputWrapper : '',
          ]}
        >
          <TextInput
            style={styles.signupInput}
            autoComplete="off"
            keyboardType="default"
            placeholder="+100  Enter your phone number"
            placeholderTextColor="rgba(255, 255, 255, 0.4)"
            onChangeText={handlephoneChange}
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
            placeholder="Enter verification code"
            placeholderTextColor="rgba(255, 255, 255, 0.4)"
            onChangeText={handleCodeChange}
          />
          <VerifyCodeBtn email={phone} />
        </View>

        <Pressable
          style={styles.agreementCheck}
          onPress={() => {
            setChecked(!checked)
          }}
        >
          <Checkbox
            disableText
            isChecked={checked}
            size={16}
            fillColor="#fff"
            disableBuiltInState
          />
          <Text style={styles.agreementText}>Consent clause</Text>
        </Pressable>

        <View style={styles.btnGroup}>
          <Button
            loading={submitLoading}
            style={styles.btn}
            size="large"
            onPress={() => {
              navigation.goBack()
            }}
          >
            {t('page.common.confirm')}
          </Button>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 80,
    paddingBottom: 40,
    paddingLeft: 24,
    paddingRight: 24,
    flex: 1,
  },
  signinContainer: {
    flex: 1,
    backgroundColor: 'blue',
  },
  btnGroup: {
    flex: 1,
    height: 450,
    justifyContent: 'flex-end',
  },
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

export default PhoneVerify
