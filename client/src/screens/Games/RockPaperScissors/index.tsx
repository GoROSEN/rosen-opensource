import React, { useCallback, useEffect, useState } from 'react'
import {
  StyleSheet,
  View,
  Text,
  Image,
  ImageBackground,
  TouchableOpacity,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { globalStyles } from '@/constants'
import LinearGradientText from '@/components/LinearGradientText'
import CloseBtn from './Components/CloseBtn'
import Button from './Components/Button'
import ChallengeModal from './ChallengeModal'
import MatchModal from './Match/MatchModal'
import PKModal from './PK/PKModal'

const RockPaperScissors = () => {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()
  const [challengeModalVisible, setChallengeModalVisible] = useState(false)
  const [matchModalVisible, setMatchModalVisible] = useState(false)
  const [pkModalVisible, setPKModalVisible] = useState(false)
  const [matcherInfo, setMatcherInfo] = useState<API.UserInfo>(
    {} as API.UserInfo,
  )

  const handleClose = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  useEffect(() => {
    setTimeout(() => {
      // setChallengeModalVisible(true)
    }, 500)

    return () => {
      setChallengeModalVisible(false)
    }
  }, [])

  return (
    <View style={[globalStyles.container, styles.container]}>
      <View style={styles.containerBg}>
        <ImageBackground
          source={require('@/assets/images/games/rps/index_bg_1.jpg')}
          style={styles.containerBg1}
        />
        <Image
          source={require('@/assets/images/games/rps/index_bg_2.png')}
          style={styles.containerBg2}
        />
        <Image
          source={require('@/assets/images/games/rps/index_bg_3.png')}
          style={[styles.containerBg3, { top: insets.top + 50 }]}
        />
        <Image
          source={require('@/assets/images/games/rps/index_bg_4.png')}
          style={styles.containerBg4}
        />
      </View>
      <CloseBtn
        onPress={handleClose}
        style={[styles.closeBtn, { top: insets.top + 10 }]}
      />
      <View style={styles.bottomPart}>
        <Button
          size="large"
          btnStyle={styles.goBtn}
          onPress={() => {
            setMatchModalVisible(true)
          }}
        >
          {t('page.common.go')}
        </Button>
        <View style={styles.footer}>
          <TouchableOpacity
            onPress={() => {
              navigation.navigate('GamesRPSRulesAndNotes')
            }}
          >
            <LinearGradientText
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              color={['#FFE604', '#F88906']}
              textStyle={[globalStyles.lilitaOneFamily, styles.footerText]}
            >
              Rules & Notes
            </LinearGradientText>
          </TouchableOpacity>
          <Text style={styles.footerTextSplit}>|</Text>
          <TouchableOpacity
            onPress={() => {
              navigation.navigate('GamesRPSBattleRecord')
            }}
          >
            <LinearGradientText
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              color={['#FFE604', '#F88906']}
              textStyle={[globalStyles.lilitaOneFamily, styles.footerText]}
            >
              Battle record
            </LinearGradientText>
          </TouchableOpacity>
          <Text style={styles.footerTextSplit}>|</Text>
          <TouchableOpacity
            onPress={() => {
              navigation.navigate('GamesRPSSetting')
            }}
          >
            <LinearGradientText
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              color={['#FFE604', '#F88906']}
              textStyle={[globalStyles.lilitaOneFamily, styles.footerText]}
            >
              Setting
            </LinearGradientText>
          </TouchableOpacity>
        </View>
      </View>

      <ChallengeModal
        visible={challengeModalVisible}
        onModalHide={() => {
          setChallengeModalVisible(false)
        }}
        onConfirm={() => {
          setTimeout(() => {
            setPKModalVisible(true)
          }, 500)
        }}
      />
      <MatchModal
        visible={matchModalVisible}
        closeOnClickMask={false}
        onModalHide={() => {
          setMatchModalVisible(false)
        }}
        onBackButtonPress={() => {}}
        onMatchSuccess={(info: API.UserInfo) => {
          setMatcherInfo(info)
          setTimeout(() => {
            setPKModalVisible(true)
          }, 500)
        }}
      />
      <PKModal
        matcherInfo={matcherInfo}
        visible={pkModalVisible}
        // animation="slide"
        onModalHide={() => {
          setPKModalVisible(false)
        }}
        onBackButtonPress={() => {}}
      />
    </View>
  )
}

export default React.memo(RockPaperScissors)

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  containerBg: {
    position: 'relative',
    flex: 1,
    alignItems: 'center',
  },
  containerBg1: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    resizeMode: 'cover',
  },
  containerBg2: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: '70%',
    resizeMode: 'stretch',
  },
  containerBg3: {
    position: 'absolute',
    width: 338,
    height: 167,
    resizeMode: 'stretch',
  },
  containerBg4: {
    position: 'absolute',
    bottom: 250,
    width: 284,
    height: 226.66,
    resizeMode: 'stretch',
  },
  closeBtn: {
    top: 20,
    right: 20,
  },
  bottomPart: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'column',
    alignItems: 'center',
  },
  goBtn: {
    marginBottom: 40,
    marginTop: 15,
  },
  goBtnText: {},

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    color: '#FFE604',
    fontSize: 16,
  },
  footerTextSplit: {
    fontSize: 14,
    color: '#CA9604',
    marginHorizontal: 10,
  },
})
