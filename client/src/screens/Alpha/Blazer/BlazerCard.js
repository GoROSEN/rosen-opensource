import * as React from 'react'
import {
  View,
  StyleSheet,
  Image,
  Pressable,
  Text,
  ImageBackground,
  ScrollView,
} from 'react-native'
import ProgressBar from '@/components/ProgressBar'
import { useNavigation } from '@react-navigation/native'
import Button from '@/components/Button'
import CountDownComponent from '@/components/CountDownComponent'
import { useTranslation } from 'react-i18next'

function BlazerCard({
  img,
  progression,
  hasplot,
  level,
  maxlimit,
  currentmint,
  lat,
  lng,
  name,
  id,
  style,
  maintainCost,
  listing,
  unListTriggerHandler,
  isUnListFetching,
}) {
  const { t, i18n } = useTranslation()
  const navigation = useNavigation()
  const handleUnlisting = React.useCallback(() => {
    unListTriggerHandler({ listingId: listing?.id, plotId: id })
  }, [id, listing?.id, unListTriggerHandler])
  const emptyplot = (
    <Pressable
      style={styles.groupPressable}
      onPress={() =>
        navigation.navigate('Search', { searchVacantParams: true })
      }
    >
      <Image
        style={styles.icon}
        resizeMode="cover"
        source={require('../../../assets/images/plus.png')}
      />
      <View>
        <Text style={styles.text16}>
          {t('page.blazer.blazercard.please-add-a-plot')}
        </Text>
      </View>
    </Pressable>
  )
  if (hasplot) {
    return (
      <View style={styles.CardView}>
        <View style={styles.Card}>
          <View style={styles.topPart}>
            <View style={styles.plotImgContainer}>
              {style === 0 && (
                <Image
                  source={{ uri: `${img}?x-oss-process=style/p_30` }}
                  style={styles.plotImg}
                />
              )}
              {style === 1 && (
                <View style={styles.activityPlotImgContainer}>
                  <Image
                    source={{ uri: `${img}?x-oss-process=style/p_30` }}
                    style={styles.activityPlotImg}
                  />
                </View>
              )}
              {!!listing && (
                <View style={styles.countDownView}>
                  <CountDownComponent
                    until={parseInt(listing.sellAt - Date.now() / 1000)}
                    textStyle={styles.CountDownText}
                  />
                </View>
              )}
            </View>
            <View style={styles.plotInfo}>
              <ScrollView
                horizontal={true}
                style={{ flexDirection: 'row', height: 0 }}
                showsHorizontalScrollIndicator={false}
              >
                <Text style={styles.eiffelTowerText}>{name}</Text>
              </ScrollView>
              <View style={styles.subInfo}>
                <Text style={styles.level1Text}>
                  {t('page.blazer.blazercard.level')} {level}
                </Text>
                <View style={styles.maxView}>
                  <Text style={styles.maxText}>
                    {t('page.blazer.blazercard.max')} {maxlimit}{' '}
                    {t('page.blazer.blazercard.pcs')}
                  </Text>
                </View>
              </View>

              <View style={styles.groupView8}>
                <View style={styles.groupView7}>
                  <Text style={styles.text3}>{currentmint}</Text>
                  <Text style={styles.mintText}>
                    {t("page.blazer.blazercard.today's-mints")}
                  </Text>
                </View>

                <View style={styles.groupView10}>
                  <Text style={styles.text4}>
                    {(progression * maxlimit).toFixed(0)}
                  </Text>
                  <Text style={styles.text7}>
                    <Text style={styles.text5}>
                      {t('page.blazer.blazercard.current-limit')}
                    </Text>
                    <Text style={styles.text6}>
                      {t('page.blazer.blazercard.daily')}
                    </Text>
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.bottomPart}>
            <View style={styles.progressPart}>
              <Text style={styles.text2}>
                {t('page.blazer.blazercard.durability')}
              </Text>
              <View style={styles.rectangleView2}>
                <ProgressBar progression={progression} width={300} />
              </View>
              <View style={styles.percentage}>
                <Text style={styles.text1}>60%</Text>
                <Text style={styles.text}>100%</Text>
              </View>
            </View>
          </View>
          <View style={styles.buttons}>
            {!listing && (
              <Button
                style={styles.Button}
                type={'hollow'}
                disabled={style !== 0}
                onPress={() => {
                  navigation.navigate('Listing', {
                    img,
                    name,
                    id,
                    style,
                  })
                }}
              >
                {t('page.common.listing')}
              </Button>
            )}
            {!!listing && (
              <Button
                style={styles.Button}
                type={'hollow'}
                disabled={style !== 0}
                onPress={handleUnlisting}
                loading={isUnListFetching}
              >
                {t('page.blazer.blazercard.cancel-listing')}
              </Button>
            )}
            <Button
              style={styles.Button}
              // disabled={style !== 0}
              onPress={() => {
                navigation.navigate('PlotMaintain', {
                  progression,
                  lat,
                  lng,
                  img,
                  name,
                  id,
                  style,
                  maintainCost,
                })
              }}
            >
              {t('page.common.maintain')}
            </Button>
          </View>
        </View>
      </View>
    )
  } else {
    return emptyplot
  }
}

export default React.memo(BlazerCard)

const styles = StyleSheet.create({
  percentage: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    width: 300,
    top: 5,
  },
  plotImgContainer: {
    position: 'relative',
  },
  countDownView: {
    position: 'absolute',
    alignItems: 'center',
    backgroundColor: 'rgba(1, 0, 0, 0.55)',
    marginTop: 81,
    width: 100,
  },
  plotImg: {
    alignItems: 'center',
    overflow: 'hidden',
    width: 100,
    height: 100,
    borderRadius: 20,
    resizeMode: 'contain',
  },
  activityPlotImgContainer: {
    width: 100,
    height: 100,
    borderRadius: 20,
    overflow: 'hidden',
  },
  activityPlotImg: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  CountDownText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  buttons: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  progressPart: {
    // flexDirection: 'colunm',
    justifyContent: 'center',
  },
  bottomPart: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'flex-start',
    marginTop: 60,
  },
  topPart: { flexDirection: 'row', flex: 1 },
  plotInfo: {
    flexDirection: 'column',
    height: 100,
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 5,
    alignItems: 'flex-start',
  },
  subInfo: {
    flexDirection: 'row',
    height: 24,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    flex: 1,
  },
  groupPressable: {
    borderRadius: 30,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    // width: 331,
    height: 256,
    marginVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text16: {
    fontSize: 10,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.2,
    marginTop: 3,
  },
  Card: {
    borderRadius: 20,
    backgroundColor: '#232631',
    // width: 331,
    height: 256,
    flexDirection: 'column',
    padding: 13,
  },
  // groupIcon3: {
  //   position: 'relative',
  //   width: 100,
  //   height: 100,
  //   borderRadius: 20,
  // },
  eiffelTowerText: {
    position: 'relative',
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'left',
    height: 20,
  },
  level1Text: {
    fontSize: 10,
    color: '#fff',
    textAlign: 'left',
    height: 15,
  },
  maxView: {
    fontSize: 9,
    color: '#fff',
    textAlign: 'center',
    height: 15,
    backgroundColor: '#5A8CFF',
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    bottom: 1,
    marginLeft: 6,
    paddingHorizontal: 3,
  },
  maxText: {
    position: 'relative',
    fontSize: 9,
    color: '#fff',
    textAlign: 'center',
    borderRadius: 100,
  },
  text: {
    fontSize: 10,
    color: '#fff',
    textAlign: 'right',
    width: 46,
    height: 18,
    opacity: 0.4,
    marginLeft: 70,
  },
  text1: {
    fontSize: 10,
    color: '#fff',
    textAlign: 'left',
    width: 26,
    height: 18,
    opacity: 0.4,
  },
  text2: {
    fontSize: 10,
    color: '#fff',
    textAlign: 'left',
    width: 60,
    height: 18,
  },
  rectangleView2: {
    borderRadius: 100,
    width: 211,
    height: 13,
    // ImageBackground: 'white',
  },
  text3: {
    fontSize: 20,
    color: '#fff',
    textAlign: 'center',
  },
  mintText: {
    fontSize: 10,
    color: '#fff',
    textAlign: 'center',
    width: 76,
    opacity: 0.4,
  },
  groupView7: {
    width: 76,
    height: 40,
  },
  groupView8: {
    width: 180,
    flexDirection: 'row',
    justifyContent: 'space-between',
    flex: 1,
    alignItems: 'flex-end',
    top: 5,
  },
  text4: {
    fontSize: 20,
    color: '#fff',
    textAlign: 'center',
  },
  text5: {
    fontSize: 10,
  },
  text6: {
    fontSize: 8,
  },
  text7: {
    color: '#fff',
    textAlign: 'center',
    width: 88,
    height: 12,
    opacity: 0.4,
  },
  groupView10: {
    width: 88,
    height: 40,
  },
  Button: {
    width: 132,
    height: 40,
    alignSelf: 'center',
  },
  CardView: {
    // width: 331,
    height: 256,
    marginVertical: 10,
  },
})
