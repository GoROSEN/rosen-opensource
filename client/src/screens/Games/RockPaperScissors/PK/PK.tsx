import React, { useCallback, useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import PKCard from './PKCard'
import VSAnimation from './VSAnimation'
import RoundResult from './RoundResult'

type Props = {
  winCount: number
  loseCount: number
  matcherInfo: API.UserInfo
  offerId: number
  onPKEnd: (pkResult: string) => void
}

const PK: React.FC<Props> = props => {
  const insets = useSafeAreaInsets()
  const { winCount, loseCount, matcherInfo, offerId, onPKEnd } = props
  const [showRoundResult, setShowRoundResult] = useState(false)
  const [resultStatus, setResultStatus] = useState('win')
  const [startPK, setStartPK] = useState(false)

  const determineWinner = (id: number, mid: number) => {
    if (id === mid) {
      return 'draw'
    } else if (
      (id === 1 && mid === 2) ||
      (id === 2 && mid === 3) ||
      (id === 3 && mid === 1)
    ) {
      return 'win'
    } else {
      return 'lose'
    }
  }

  const handleReady = useCallback(
    (id: number) => {
      setStartPK(true)

      // 开始pk之后会延迟2秒揭晓答案，揭晓答案的问号有500毫秒动画
      // 所以这里需要一共延迟4.5秒显示结果（既答案揭晓之后停留2秒让用户看清结果）
      setTimeout(() => {
        setResultStatus(determineWinner(offerId, id))
        setShowRoundResult(true)
      }, 4500)
    },
    [offerId],
  )

  const handlePKEnd = useCallback(() => {
    onPKEnd(resultStatus)
  }, [onPKEnd, resultStatus])

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40 }]}>
      <PKCard
        winCount={winCount}
        loseCount={loseCount}
        isMatcher={true}
        matcherInfo={matcherInfo}
        startPK={startPK}
        onReady={handleReady}
      />

      <VSAnimation />

      <PKCard
        winCount={winCount}
        loseCount={loseCount}
        isMatcher={false}
        offerId={offerId}
        startPK={startPK}
      />

      {showRoundResult && (
        <RoundResult status={resultStatus} onClose={handlePKEnd} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
})

export default React.memo(PK)
