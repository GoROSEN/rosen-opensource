import React, { useCallback } from 'react'
import { View, StyleSheet, Text, ImageBackground } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import Button from './Components/Button'
import { ModalProps } from '@/components/Modal'
import Modal from './Components/Modal'
import CountDownComponent from '@/components/CountDownComponent'
import { globalStyles } from '@/constants'

type Props = {
  onConfirm: () => void
} & ModalProps

const ChallengeModal: React.FC<Props> = props => {
  const { t } = useTranslation()
  const { onModalHide, onConfirm, ...restProps } = props

  const userInfo = useSelector(
    (state: Store.RootState) => state.authUser.userInfo,
  )

  const handleConfirm = useCallback(() => {
    onModalHide && onModalHide()
    onConfirm()
  }, [onConfirm, onModalHide])

  return (
    <Modal showCloseBtn {...restProps}>
      <View style={styles.container}>
        <ImageBackground
          source={require('@/assets/images/games/rps/challenge_bg.png')}
          style={styles.challengeBg}
        >
          <CountDownComponent
            showSecondsOnly
            until={30}
            textStyle={[globalStyles.lilitaOneFamily, styles.countdown]}
            onFinish={onModalHide}
          />
        </ImageBackground>

        <View style={styles.footer}>
          {userInfo.equip && userInfo.equip.imgindex !== 0 && (
            <>
              <Text style={styles.tipsText}>
                Player XXX is challenging on you. Please directly click the
                button below or the X2E button in the upper right corner of the
                main interface within 30 seconds to respond; If you respond
                overtime, you may lose coins.
              </Text>
              <Button size="medium" onPress={handleConfirm}>
                {t('page.common.confirm')}
              </Button>
            </>
          )}
          {!userInfo.equip ||
            (userInfo.equip && userInfo.equip.imgindex === 0 && (
              <>
                <Text style={styles.tipsText}>
                  You have worn the Avatar, how do you choose to participate in
                  the challenge?
                </Text>
                <Button
                  size="medium"
                  onPress={() => {
                    // setMatchModalVisible(true)
                  }}
                >
                  {t('page.common.confirm')}
                </Button>
                <Button
                  size="medium"
                  btnStyle={styles.participateBtn}
                  onPress={handleConfirm}
                >
                  {t('page.common.confirm')}
                </Button>
              </>
            ))}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 20,
    height: 420,
    position: 'relative',
    justifyContent: 'space-between',
  },
  challengeBg: {
    width: 224,
    height: 220,
    resizeMode: 'contain',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  countdown: {
    color: '#FFE604',
    fontSize: 90,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
    textShadowColor: '#666',
  },
  footer: {
    alignItems: 'center',
  },
  tipsText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
  },
  participateBtn: {
    marginTop: 10,
  },
})

export default React.memo(ChallengeModal)
