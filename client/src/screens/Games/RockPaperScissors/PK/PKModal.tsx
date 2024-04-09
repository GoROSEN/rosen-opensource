import React, { useCallback, useEffect, useState } from 'react'
import { View, StyleSheet, Image, ImageBackground } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Modal, ModalProps } from '@/components/Modal'
import CloseBtn from '../Components/CloseBtn'
import Start from './Start'
import Selection from './Selection'
import PK from './PK'
import Summary from './Summary'

type Props = {
  visible: boolean
  matcherInfo: API.UserInfo
} & ModalProps

const PKModal: React.FC<Props> = props => {
  const insets = useSafeAreaInsets()
  const { visible, matcherInfo, onModalHide, ...restProps } = props
  const [step, setStep] = useState(0)
  const [offerId, setOfferId] = useState(0)
  const [roundCount, setRoundCount] = useState(1)
  const [winCount, setWinCount] = useState(0)
  const [loseCount, setLoseCount] = useState(0)
  const [summaryResult, setSummaryResult] = useState('lose')

  const handleClose = useCallback(() => {
    onModalHide && onModalHide()
    setStep(0)
    setRoundCount(1)
    setWinCount(0)
    setLoseCount(0)
  }, [onModalHide])

  const handleStart = useCallback(() => {
    setStep(2)
  }, [])

  const handleSelectionConfirm = useCallback((id: number) => {
    setOfferId(id)
    setStep(3)
  }, [])

  const handlePKEnd = useCallback((pkResult: string) => {
    setRoundCount(prevRoundCount => prevRoundCount + 1)
    if (pkResult === 'win') {
      setWinCount(prevWinCount => prevWinCount + 1)
    }
    if (pkResult === 'lose') {
      setLoseCount(prevLoseCount => prevLoseCount + 1)
    }
    if (pkResult === 'draw') {
      setStep(2)
    }
  }, [])

  useEffect(() => {
    // 加上大于等于1的判断，使第一次render的时候不执行setStep的逻辑
    if (winCount >= 1 || loseCount >= 1) {
      if (winCount >= 2) {
        setSummaryResult('win')
      }
      if (loseCount >= 2) {
        setSummaryResult('lose')
      }

      if (winCount >= 2 || loseCount >= 2) {
        setStep(4)
      } else {
        setStep(2)
      }
    }
  }, [loseCount, winCount])

  useEffect(() => {
    if (visible) {
      setStep(1)
    }
  }, [visible])

  return (
    <Modal visible={visible} {...restProps} style={styles.modal}>
      <View style={styles.container}>
        <View style={styles.containerBg}>
          <ImageBackground
            source={require('@/assets/images/games/rps/index_bg_1.jpg')}
            style={styles.containerBg1}
          />
          <Image
            source={require('@/assets/images/games/rps/index_bg_2.png')}
            style={[
              styles.containerBg2,
              { height: step === 1 || step === 3 ? '50%' : '70%' },
            ]}
          />
        </View>
        {step === 4 && (
          <CloseBtn
            onPress={handleClose}
            style={[styles.closeBtn, { top: insets.top + 10 }]}
          />
        )}

        {step === 1 && (
          <Start matcherInfo={matcherInfo} onStart={handleStart} />
        )}

        {step === 2 && (
          <Selection
            winCount={winCount}
            roundCount={roundCount}
            onSelectionConfirm={handleSelectionConfirm}
          />
        )}
        {step === 3 && (
          <PK
            winCount={winCount}
            loseCount={loseCount}
            matcherInfo={matcherInfo}
            offerId={offerId}
            onPKEnd={handlePKEnd}
          />
        )}

        {step === 4 && <Summary summaryResult={summaryResult} />}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modal: {
    paddingHorizontal: 0,
  },
  container: {
    flex: 1,
  },
  containerBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  closeBtn: {
    top: 20,
    right: 20,
    zIndex: 2,
  },
})

export default React.memo(PKModal)
