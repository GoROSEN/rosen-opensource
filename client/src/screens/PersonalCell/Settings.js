import React, { useCallback, useState } from 'react'
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ImageBackground,
  TouchableOpacity,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Header from '@/components/Header'
import { useSelector, useDispatch } from 'react-redux'
import { globalStyles } from '@/constants'
import SvgIcon from '@/components/SvgIcon'
import {
  useModifyBasicInfoMutation,
  usePostAvatarMutation,
} from '@/services/modules/member'
import { updataUserInfo } from '@/store/authSlice'
import * as ImagePicker from 'expo-image-picker'
import AddressFormat from './Component/AddressFormat'
import { disconnectPublicKey } from '@/store/blockchainAuth'
import { useTranslation } from 'react-i18next'
import base58 from 'bs58'
import Popup from '@/components/Popup'
// import { cos } from 'react-native-reanimated'
// import { set } from 'superstruct'

const Settings = ({ navigation, route }) => {
  const { t, i18n } = useTranslation()
  const dispatch = useDispatch()
  const userInfo = useSelector(state => state.authUser.userInfo)
  const publicKey = useSelector(state => state.authPubKey.sol)
  const [modifyBasicInfoTrigger, { isLoading: isModifyBasicInfoFetching }] =
    useModifyBasicInfoMutation()
  const [postAvatarTrigger, { isLoading: isPostAvatarFetching }] =
    usePostAvatarMutation()
  const [userName, setUserName] = useState(userInfo.member.displayName)
  const [newBio, setNewBio] = useState(userInfo.member.bio)
  const [showAvatarEdit, setShowAvatarEdit] = React.useState(false)
  const [pickedImage, setPickedImage] = React.useState()
  const [pickedImagePath, setPickedImagePath] = React.useState(
    userInfo.member.avatar,
  )
  const [changed, setChanged] = React.useState(false)
  const [showHeader, setShowHeader] = React.useState(true)

  console.log('===================================')
  console.log(userInfo)
  console.log(route.params.pubKey)

  const checkChanges = useCallback(() => {
    if (userName !== userInfo.member.displayName) {
      setChanged(true)
    } else if (newBio !== userInfo.member.bio) {
      setChanged(true)
      console.log('bio!!!')
    } else if (pickedImage) {
      setChanged(true)
      console.log('image!!!')
    } else if (route.params.pubKey && route.params.pubKey !== publicKey) {
      setChanged(true)
      console.log('wallet!!!')
    } else {
      navigation.goBack()
    }
  }, [
    navigation,
    newBio,
    pickedImage,
    publicKey,
    route.params.pubKey,
    userInfo.member.bio,
    userInfo.member.displayName,
    userName,
  ])

  const upload = useCallback(async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 1,
    })
    if (result.uri) {
      setPickedImagePath(result.uri)
      setShowAvatarEdit(true)
      const ImageData = {
        uri: result.uri, // file uri/path
        name: 'avatar.png', //file name
        type: 'image/png', //file type
      }
      const formData = new FormData()
      formData.append('file', ImageData)
      setPickedImage(formData)
    }
  }, [])

  const updateUserInfoWithImage = useCallback(
    ImagePath => {
      console.log(ImagePath)
      modifyBasicInfoTrigger({
        displayName: userName,
        bio: newBio,
        avatar: ImagePath.path,
        walletAddress: route.params.pubKey,
      }).then(() => {
        dispatch(
          updataUserInfo({
            displayName: userName,
            bio: newBio,
            avatar: ImagePath.url,
          }),
        )
        navigation.navigate('PersonalCell')
      })
    },
    [
      modifyBasicInfoTrigger,
      userName,
      newBio,
      route.params.pubKey,
      dispatch,
      navigation,
    ],
  )

  const updateUserInfo = useCallback(() => {
    modifyBasicInfoTrigger({
      displayName: userName,
      bio: newBio,
      walletAddress: route.params.pubKey,
      // walletAddress: publicKey
      //   ? publicKey.substring(1, publicKey.length - 1)
      //   : '',
    }).then(() => {
      dispatch(
        updataUserInfo({
          displayName: userName,
          bio: newBio,
        }),
      )
      navigation.navigate('PersonalCell')
    })
  }, [
    dispatch,
    modifyBasicInfoTrigger,
    navigation,
    newBio,
    route.params.pubKey,
    userName,
  ])

  const handlePopupClose = React.useCallback(() => {
    setChanged(false)
  }, [])

  return (
    <SafeAreaView
      style={[globalStyles.container, globalStyles.containerPadding]}
    >
      {showHeader && (
        <Header
          title={t('page.personalcell.settings.user-setting')}
          goBackCb={checkChanges}
          rightPart={
            <TouchableOpacity
              onPress={() => {
                showAvatarEdit
                  ? postAvatarTrigger(pickedImage).then(data => {
                      updateUserInfoWithImage(data.data.data)
                    })
                  : updateUserInfo()
              }}
              disabled={isModifyBasicInfoFetching || isPostAvatarFetching}
            >
              {!isModifyBasicInfoFetching && !isPostAvatarFetching && (
                <Text style={styles.saveText}>
                  {t('page.personalcell.settings.save')}
                </Text>
              )}
              {(isModifyBasicInfoFetching || isPostAvatarFetching) && (
                <ActivityIndicator size="small" color="#5A8CFF" />
              )}
            </TouchableOpacity>
          }
        />
      )}
      <Popup
        visible={changed}
        content={'You have unsaved changes, do you confirm to leave this page?'}
        confirmButton={() => {
          handlePopupClose()
          navigation.goBack()
        }}
        cancelButton={handlePopupClose}
      />
      <KeyboardAvoidingView
        behavior="position"
        keyboardVerticalOffset={-220}
        style={[globalStyles.container]}
      >
        <View style={styles.avatarMailContainer}>
          <ImageBackground
            imageStyle={styles.avatarStyle}
            style={styles.avatarStyle}
            source={{ uri: pickedImagePath }}
          >
            <Pressable
              style={styles.changeAvatarStyle}
              onPress={() => {
                upload()
              }}
            >
              <SvgIcon iconName={'write'} iconSize={14} />
            </Pressable>
          </ImageBackground>

          <Text style={styles.emailText}>{userInfo.member.userName}</Text>
        </View>
        <ScrollView style={styles.scroll}>
          <View style={styles.basicInfo}>
            <View style={styles.itemContainer}>
              <Text style={styles.itemText}>
                {t('page.personalcell.settings.username')}
              </Text>
              <View style={styles.rectangleTextInputBorder}>
                <TextInput
                  style={styles.rectangleTextInput}
                  keyboardType="default"
                  onFocus={() => {
                    setShowHeader(false)
                  }}
                  onBlur={() => {
                    setShowHeader(true)
                  }}
                  placeholder={t('page.personalcell.settings.add-your-name')}
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={userName}
                  onChangeText={text => {
                    setUserName(text)
                  }}
                />
              </View>
            </View>
            <View style={styles.itemContainer}>
              <Text style={styles.itemText}>
                {t('page.personalcell.settings.bio')}
              </Text>
              <View style={styles.rectangleTextInputBorder}>
                <TextInput
                  style={styles.rectangleTextInput}
                  keyboardType="default"
                  onFocus={() => {
                    setShowHeader(false)
                  }}
                  onBlur={() => {
                    setShowHeader(true)
                  }}
                  placeholder={t(
                    'page.personalcell.settings.add-a-bio-to-your-profile',
                  )}
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={newBio}
                  onChangeText={text => {
                    setNewBio(text)
                  }}
                />
              </View>
            </View>
            {/* <View style={styles.itemContainer}>
              <Text style={styles.itemText}>
                {t('page.personalcell.settings.phone')}
              </Text>
              <TouchableOpacity
                style={styles.connectButton}
                onPress={() => {
                  navigation.navigate('PhoneVerify')
                }}
              >
                <Text style={styles.connectText}>
                  {t('page.personalcell.settings.verify')}
                </Text>
              </TouchableOpacity>
            </View> */}
            <View style={styles.itemContainer}>
              <Text style={styles.itemText}>Email:</Text>
              <Text style={styles.itemText}>{userInfo.member.email}</Text>
            </View>
            <View style={styles.itemContainer_wallet}>
              <Text style={[styles.itemText]}>
                {t('page.personalcell.settings.wallet-address')}
              </Text>
              {!publicKey && !route.params.pubKey && (
                <TouchableOpacity
                  style={styles.connectButton}
                  onPress={() => {
                    navigation.navigate('WalletVerify')
                  }}
                >
                  <Text style={styles.connectText}>
                    {t('page.personalcell.settings.connect')}
                  </Text>
                </TouchableOpacity>
              )}
              {(publicKey || route.params.pubKey) && (
                <View style={styles.addressDisconnect}>
                  <Text style={styles.addressText}>
                    <AddressFormat
                      address={publicKey ? publicKey : route.params.pubKey}
                    />
                  </Text>
                  {/* <TouchableOpacity
                    style={styles.connectButton}
                    onPress={() => {
                      dispatch(disconnectPublicKey({ chain: 'sol' }))
                    }}
                  >
                    <Text style={styles.connectText}>
                      {t('page.personalcell.settings.disconnect')}
                    </Text>
                  </TouchableOpacity> */}
                </View>
              )}
            </View>
          </View>
          {/* <Text style={styles.addAccountsText}>
            {t('page.personalcell.settings.add-social-media-accounts')}
          </Text> */}
          {/* <View style={styles.socialMedia}> */}
          {/* <View style={styles.mediaTextInputBorder}>
              <View style={styles.iconBackground}>
                <SvgIcon
                  iconName="sns_logo_twitter"
                  iconSize={20}
                  iconColor=""
                  onPress={() => {}}
                  style={[styles.socialMediaIcon]}
                />
              </View>
              <TextInput
                style={styles.mediaTextInput}
                keyboardType="default"
                placeholder="Add the link"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
              />
            </View> */}
          {/* <View style={styles.mediaTextInputBorder}>
              <View style={styles.iconBackground}>
                <SvgIcon
                  iconName="sns_logo_instagram"
                  iconSize={20}
                  iconColor=""
                  onPress={() => {}}
                  style={[styles.socialMediaIcon]}
                />
              </View>
              <TextInput
                style={styles.mediaTextInput}
                keyboardType="default"
                placeholder="Add the link"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
              />
            </View> */}
          {/* <View style={styles.mediaTextInputBorder}>
              <View style={styles.iconBackground}>
                <SvgIcon
                  iconName="sns_logo_facebook"
                  iconSize={20}
                  iconColor=""
                  style={[styles.socialMediaIcon]}
                />
              </View>
              <TextInput
                style={styles.mediaTextInput}
                keyboardType="default"
                placeholder="Add the link"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
              />
            </View> */}
          {/* <View style={styles.mediaTextInputBorder}>
              <View style={styles.iconBackground}>
                <SvgIcon
                  iconName="sns_logo_tiktok"
                  iconSize={20}
                  iconColor=""
                  style={[styles.socialMediaIcon]}
                />
              </View>
              <TextInput
                style={styles.mediaTextInput}
                keyboardType="default"
                placeholder="Add the link"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
              />
            </View> */}
          {/* </View> */}
          <Text style={styles.addAccountsText}>{'Security & Privacy'}</Text>
          <View style={styles.socialMedia}>
            <TouchableOpacity
              style={styles.privacy}
              onPress={() => {
                navigation.navigate('ForgetPassword')
              }}
            >
              <Text style={styles.connectText}>Change your password</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  rectangleTextInput: {
    left: 10,
    width: 200,
    height: 38,
    color: 'white',
  },
  addressDisconnect: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  addressText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  iconBackground: {
    width: 32,
    height: 32,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaTextInput: {
    left: 10,
    height: 38,
    width: 230,
    color: 'white',
  },
  rectangleTextInputBorder: {
    position: 'relative',
    borderRadius: 34,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    height: 40,
    width: 210,
  },
  mediaTextInputBorder: {
    position: 'relative',
    borderRadius: 34,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    flex: 1,
    marginVertical: 4,
  },
  connectButton: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  privacy: {
    alignItems: 'center',
    marginLeft: 8,
  },
  disconnectButton: {
    alignItems: 'flex-end',
  },
  connectText: {
    color: '#5A8CFF',
    fontSize: 14,
    fontWeight: '500',
  },
  itemContainer: {
    flexDirection: 'row',
    flex: 1,
    marginVertical: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemContainer_wallet: {
    flexDirection: 'row',
    flex: 1,
    marginVertical: 10,
    justifyContent: 'space-between',
  },
  allContainer: { backgroundColor: 'black', flex: 1, alignItems: 'center' },
  saveText: { fontSize: 20, fontWeight: '500', color: '#FFFFFF' },
  itemText: { fontSize: 14, fontWeight: '500', color: '#FFFFFF' },
  avatarStyle: { height: 60, width: 60, borderRadius: 60 },
  changeAvatarStyle: {
    marginTop: 44,
    height: 16,
    width: 60,
    borderRadius: 0,
    backgroundColor: '#030000',
    opacity: 0.4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMailContainer: { marginTop: 24, alignItems: 'center' },
  emailText: { fontSize: 16, fontWeight: '400', color: '#FFFFFF', margin: 12 },
  addAccountsText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginTop: 12,
  },
  basicInfo: {
    backgroundColor: 'rgba(35, 38, 49, 0.5)',
    flex: 1,
    width: 327,
    marginVertical: 12,
    borderRadius: 20,
    padding: 19,
  },
  socialMedia: {
    backgroundColor: 'rgba(35, 38, 49, 0.5)',
    flex: 1,
    width: 327,
    // height: ,
    marginVertical: 12,
    borderRadius: 20,
    padding: 19,
  },
  scroll: {
    height: '100%',
  },
})

export default Settings
