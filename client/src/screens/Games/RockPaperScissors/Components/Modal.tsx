import React from 'react'
import { Image, StyleSheet, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Modal as BaseModal, ModalProps } from '@/components/Modal'
import CloseBtn from './CloseBtn'

type Props = {
  showCloseBtn?: boolean
} & ModalProps

const Modal: React.FC<Props> = props => {
  const { showCloseBtn = false, children, ...restProps } = props

  return (
    <BaseModal {...restProps}>
      <View style={styles.modal}>
        <LinearGradient
          colors={['#B04CFF', '#0CC4FF']}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 1 }}
          style={styles.linearGradientBg}
        >
          {children}
        </LinearGradient>

        {showCloseBtn && (
          <CloseBtn onPress={restProps.onModalHide} style={styles.closeBtn} />
        )}

        <Image
          source={require('@/assets/images/games/rps/index_bg_3.png')}
          style={styles.modalLogo}
        />
      </View>
    </BaseModal>
  )
}

export default React.memo(Modal)

const styles = StyleSheet.create({
  modal: {
    marginLeft: 20,
    marginRight: 20,
    position: 'relative',
  },
  linearGradientBg: {
    borderRadius: 30,
    padding: 24,
  },
  modalLogo: {
    width: 200,
    height: 98.81,
    position: 'absolute',
    top: -40,
    zIndex: 10,
    alignSelf: 'center',
  },
  closeBtn: {
    position: 'absolute',
    right: -15,
    top: -15,
    zIndex: 1,
  },
})
