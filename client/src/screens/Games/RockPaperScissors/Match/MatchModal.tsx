import React, { useCallback, useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { ModalProps } from '@/components/Modal'
import Modal from '../Components/Modal'
import MatchStart from './MatchStart'
import MatchProgress from './MatchProgress'
import MatchSuccess from './MatchSuccess'

type Props = {
  onMatchSuccess: (matcherInfo: API.UserInfo) => void
} & ModalProps

const MatchModal: React.FC<Props> = props => {
  const { onModalHide, onMatchSuccess, ...restProps } = props
  const [step, setStep] = useState(1)
  const [matcherInfo, setMatcherInfo] = useState<API.UserInfo>(
    {} as API.UserInfo,
  )

  const handleMatchStartConfirm = useCallback(() => {
    setStep(2)
  }, [])

  const handleMatchProgressConfirm = useCallback((info: API.UserInfo) => {
    setMatcherInfo(info)
    setStep(3)
  }, [])

  const handleMatchSuccessConfirm = useCallback(() => {
    onModalHide && onModalHide()
    onMatchSuccess(matcherInfo)
    setTimeout(() => setStep(1), 500)
  }, [matcherInfo, onMatchSuccess, onModalHide])

  return (
    <Modal onModalHide={onModalHide} showCloseBtn={step === 1} {...restProps}>
      <View style={styles.container}>
        {step === 1 && (
          <MatchStart onMatchStartConfirm={handleMatchStartConfirm} />
        )}
        {step === 2 && (
          <MatchProgress onMatchProgressConfirm={handleMatchProgressConfirm} />
        )}
        {step === 3 && (
          <MatchSuccess
            matcherInfo={matcherInfo}
            onMatchSuccessConfirm={handleMatchSuccessConfirm}
          />
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 50,
    height: 400,
  },
})

export default React.memo(MatchModal)
