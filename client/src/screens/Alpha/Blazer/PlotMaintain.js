import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  StyleSheet,
  Image,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BlurView } from 'expo-blur'
import { globalStyles } from '@/constants'
import ProgressBar from '@/components/ProgressBar'
import Header from '@/components/Header'
import Button from '@/components/Button'
import SvgIcon from '@/components/SvgIcon'
import { usePlotMaintainMutation } from '@/services/modules/maintain'
import { useGetUserBasicQuery } from '@/services/modules/member'
import {
  useGetPlotByIdQuery,
  useLazyGetPlotByIdQuery,
} from '@/services/modules/plot'
import { ddtodms } from '@/utils'
import ModalComp from '@/components/Popup'
import { useTranslation } from 'react-i18next'
import { set } from 'react-native-reanimated'

const PlotMaintain = ({ navigation, route }) => {
  const { t, i18n } = useTranslation()
  const [getPlotTriger, { data: plot = {} }] = useLazyGetPlotByIdQuery(
    route.params.id,
    {
      refetchOnMountOrArgChange: true,
    },
  )
  const { data: plotInfo = {} } = useGetPlotByIdQuery(route.params.id, {
    refetchOnMountOrArgChange: true,
  })
  const [progressBar, setProgressBar] = useState(
    route.params.progression.toFixed(2),
  )
  const [currentState, setcurrentState] = useState(
    route.params.progression.toFixed(2),
  )
  const [status, setStatus] = useState(
    route.params.progression.toFixed(2) * 100,
  )
  const [plotImgContainerWidth, setPlotImgContainerWidth] = useState(0)
  const [progressText, setProgressText] = useState(0)
  const [showPopUp, setShowPopUp] = useState(false)
  const [cost, setCost] = useState(0)
  const [content, setContent] = useState('')
  const [nearRecycle, setNearRecycle] = useState(false)
  const isUnmounted = useRef(false)
  useEffect(() => {
    if (plotInfo.durability <= 0.5) {
      setNearRecycle(true)
    } else {
      setNearRecycle(false)
    }
    return () => {
      isUnmounted.current = true
    }
  }, [plotInfo.durability])

  const { data: baseInfo = {} } = useGetUserBasicQuery('', {
    refetchOnMountOrArgChange: true,
  })

  const updateProgressText = useCallback(
    async newText => {
      setProgressText(newText)
      const dur = await getPlotTriger(route.params.id)
      if (!isUnmounted.current) {
        console.log(
          dur.data.durability,
          dur.data.durability.toFixed(2) * 100,
          Number(newText) / route.params.maintainCost,
        )
        setProgressBar(
          (dur.data.durability.toFixed(2) * 100 +
            Number(newText) / route.params.maintainCost) /
            100,
        )
        setStatus(dur.data.durability.toFixed(2) * 100)
      }
    },
    [getPlotTriger, route.params.id, route.params.maintainCost],
  )

  const [trigger, { isLoading: isPlotFetching }] = usePlotMaintainMutation()
  const maintainHandler = React.useCallback(() => {
    // console.log(route.params.id, progressText)
    Keyboard.dismiss()
    trigger({ id: route.params.id, energy: Number(progressText) }).then(dur => {
      console.log(dur)
      if (dur.data.code !== 20000) {
        setContent(t(dur.data.msg, { fail: 'Maintain failed' }))
      } else {
        setContent(
          t('message.maintain.success', {
            percent: (dur.data.data.cost / route.params.maintainCost).toFixed(
              1,
            ),
            amount: dur.data.data.cost.toFixed(0),
          }),
        )
        setProgressBar(dur.data.data.durability.toFixed(2))
        setCost(dur.data.data.cost)
        setProgressText(0)
        setShowPopUp(true)
        setcurrentState(dur.data.data.durability.toFixed(2))
      }
    })
  }, [progressText, route.params.id, route.params.maintainCost, t, trigger])

  const closePopUp = useCallback(() => {
    setNearRecycle(false)
    setShowPopUp(false)
  }, [])

  const plotImgContainerLayout = event => {
    setPlotImgContainerWidth(event.nativeEvent.layout.width)
  }

  return (
    <SafeAreaView
      style={[globalStyles.container, globalStyles.containerPadding]}
    >
      <Header title={t('page.blazer.plotmaintain.maintaining')} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <TouchableWithoutFeedback
          onPress={() => {
            Keyboard.dismiss()
          }}
          onPressOut={() => {
            Keyboard.dismiss()
          }}
          onPressIn={() => {
            Keyboard.dismiss()
          }}
        >
          <KeyboardAvoidingView behavior={'position'}>
            <View
              style={[
                styles.plotImgContainer,
                { height: plotImgContainerWidth },
              ]}
              onLayout={event => plotImgContainerLayout(event)}
            >
              <Image
                source={{ uri: `${route.params.img}?x-oss-process=style/p_60` }}
                style={[
                  {
                    width: plotImgContainerWidth,
                    height: plotImgContainerWidth,
                  },
                  styles.plotImg,
                  route.params.style === 1 ? styles.activityPlotImg : '',
                ]}
              />
              <View style={styles.location}>
                <BlurView
                  style={styles.locationBlur}
                  intensity={50}
                  tint="dark"
                >
                  <SvgIcon iconName="location" iconSize={12} />
                  <Text style={styles.locationText}>{route.params.name}</Text>
                </BlurView>
              </View>
              <View style={styles.coordinates}>
                <BlurView
                  style={styles.coordinatesBlur}
                  intensity={50}
                  tint="dark"
                >
                  <SvgIcon iconName="coordinates" iconSize={12} />
                  <View>
                    <Text style={styles.coordinatesText}>
                      {ddtodms(route.params.lat)}
                    </Text>
                    <Text style={styles.coordinatesText}>
                      {ddtodms(route.params.lng, true)}
                    </Text>
                  </View>
                </BlurView>
              </View>
            </View>
            <View style={styles.dataBoard}>
              <View style={styles.rectangleTextInputBorder}>
                <TextInput
                  style={styles.rectangleTextInput}
                  keyboardType="number-pad"
                  onChangeText={text => {
                    let newText = text.replace(/[^\d]+/, '')
                    const exceedMaxCost =
                      Number(newText) > route.params.maintainCost * 100
                    const exceedWallet = Number(newText) > baseInfo.energy
                    const walletNotEnough =
                      baseInfo.energy < route.params.maintainCost * 100
                    if (exceedMaxCost) {
                      newText = route.params.maintainCost * 100
                      if (walletNotEnough) {
                        newText = baseInfo.energy
                      }
                    } else {
                      if (exceedWallet) {
                        newText = baseInfo.energy
                      }
                    }
                    updateProgressText(newText)
                  }}
                  value={progressText.toString()}
                  placeholder={t(
                    'page.blazer.plotmaintain.input-enrg-amount-here',
                  )}
                  placeholderTextColor={'rgba(255,255,255,0.2)'}
                />
              </View>
              <View style={styles.energy}>
                <Text style={styles.eNGY100Text}>
                  {t('page.blazer.plotmaintain.current-engy-you-have')}:{' '}
                  {baseInfo.energy}
                </Text>
                <Button
                  size="small"
                  style={styles.buyButton}
                  onPress={() => navigation.navigate('WalletExchange')}
                >
                  {t('page.blazer.plotmaintain.buy-energy')}
                </Button>
              </View>
              <View style={styles.progressBarView}>
                <ProgressBar
                  progression={progressBar > 1 ? 1 : progressBar}
                  width={288}
                />
              </View>
              <View style={styles.groupView1}>
                <Text style={styles.text2}>
                  {t('page.blazer.plotmaintain.state')}:
                </Text>
                <Text style={styles.text}>{`${(currentState * 100).toFixed(
                  0,
                )}%`}</Text>
                <Text style={styles.text1}>{`+${(progressText
                  ? progressText / route.params.maintainCost > 100 - status
                    ? 100 - status
                    : progressText / route.params.maintainCost
                  : 0
                ).toFixed(1)}%`}</Text>
              </View>
            </View>
            <Text style={styles.tip}>
              {t(
                'page.blazer.plotmaintain.if-the-durability-brought-by-input-enrg-amount-will-exceed-the-max-durability,-the-rest-of-enrg-will-be-returned-after-durability-reaches-100%',
              )}
            </Text>

            <View style={styles.buttons}>
              <Button
                style={styles.rectanglePressable}
                type={'hollow'}
                size={'large'}
                onPress={() => {
                  navigation.navigate('BlazerManage')
                }}
              >
                {t('page.common.cancel')}
              </Button>
              <Button
                style={styles.joinTheWhitelist}
                onPress={maintainHandler}
                loading={isPlotFetching}
                disabled={progressText === 0 || !progressText}
              >
                {t('page.common.confirm')}
              </Button>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </ScrollView>
      <ModalComp
        visible={showPopUp}
        content={`Successfully maintain the plot using ${cost.toFixed(0)} ENRG`}
        confirmButton={closePopUp}
      />
      <ModalComp
        visible={nearRecycle}
        content={t(
          'page.blazer.plotmaintain.warning!-the-plot-will-be-revoked-when-its-durability-under-30%!',
        )}
        confirmButton={closePopUp}
      />
    </SafeAreaView>
  )
}

export default PlotMaintain

const styles = StyleSheet.create({
  plotImgContainer: {
    backgroundColor: '#000',
    position: 'relative',
    borderRadius: 30,
    overflow: 'hidden',
    justifyContent: 'flex-start',
  },
  plotImg: {
    borderRadius: 20,
    resizeMode: 'contain',
  },
  activityPlotImg: {
    borderRadius: 0,
  },
  location: {
    borderColor: 'rgba(255,225,255,0.6)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: 14,
    position: 'absolute',
    top: 14,
    left: 16,
    overflow: 'hidden',
  },
  locationBlur: {
    height: 24,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  locationText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 5,
  },
  coordinates: {
    borderColor: 'rgba(255,225,255,0.6)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: 20,
    position: 'absolute',
    top: 50,
    left: 16,
    overflow: 'hidden',
  },
  coordinatesBlur: {
    height: 36,
    paddingLeft: 8,
    paddingRight: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  coordinatesText: {
    color: '#fff',
    fontSize: 10,
    marginLeft: 5,
  },

  energy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyButton: {
    width: 90,
    height: 18,
    marginLeft: 15,
    bottom: 1,
  },
  tip: {
    paddingHorizontal: 10,
    color: 'rgba(255,255,255,0.2)',
    paddingTop: 4,
  },
  dataBoard: {
    position: 'relative',
    borderRadius: 20,
    backgroundColor: '#232631',
    shadowColor: '#000',
    shadowRadius: 80,
    height: 171,
    marginTop: 20,
    alignItems: 'center',
    padding: 20,
    alignContent: 'space-between',
    justifyContent: 'space-between',
  },
  eNGY100Text: {
    fontSize: 12,
    color: '#fff',
    textAlign: 'left',
    opacity: 0.4,
    alignSelf: 'flex-start',
  },
  rectangleTextInput: {
    top: -1,
    left: 12,
    width: 290,
    height: 38,
    color: 'white',
  },
  rectangleTextInputBorder: {
    position: 'relative',
    borderRadius: 12,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    height: 38,
  },
  progressBarView: {
    width: 288,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'left',
    marginHorizontal: 4,
    marginTop: 4,
    top: 1,
  },
  text1: {
    fontSize: 10,
    fontWeight: '600',
    color: '#5a8cff',
    textAlign: 'left',
  },
  text2: {
    fontSize: 12,
    color: '#fff',
    textAlign: 'left',
    opacity: 0.4,
  },
  groupView1: {
    position: 'relative',
    width: 110,
    height: 25,
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'flex-end',
  },
  rectangleIcon: {
    position: 'relative',
    borderRadius: 30,
    width: 326.44,
    height: 327,
  },
  maintainingText: {
    position: 'relative',
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  rectanglePressable: {
    width: 150,
    height: 53,
  },
  joinTheWhitelist: {
    width: 150,
    height: 53,
    borderRadius: 100,
  },
  buttons: {
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 30,
  },
})
