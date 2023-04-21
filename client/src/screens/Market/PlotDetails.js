import React, { useCallback } from 'react'
import { StyleSheet, View, Text, Image, ImageBackground } from 'react-native'
import Button from '@/components/Button'
import Header from '@/components/Header'
import CountDownComponent from '@/components/CountDownComponent'
import { useBuyListedPlotMutation } from '@/services/modules/market'
import ModalComp from '@/components/Popup'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'

const PlotDetails = props => {
  const { t, i18n } = useTranslation()
  const item = props.route.params.item
  const [buyPlotTrigger, { isLoading: isBuyFetching }] =
    useBuyListedPlotMutation()
  const [popupVis, setpopupVis] = React.useState(false)
  const [popupContent, setPopupContent] = React.useState('')
  const [goback, setGoback] = React.useState(false)
  const [confirm, setConfirm] = React.useState(false)
  const navigation = useNavigation()
  const showPopUp = data => {
    setPopupContent(data.content)
    setpopupVis(true)
  }

  const closePopUp = useCallback(() => {
    setpopupVis(false)
    if (goback) {
      navigation.navigate('Market')
    }
  }, [goback, navigation])
  const handleBuy = React.useCallback(
    (id, price) => {
      buyPlotTrigger({ listingId: id }).then(result => {
        if (result.data.code !== 20000) {
          console.log(result.data.msg)
          setConfirm(false)
          showPopUp({
            content: t(result.data.msg, {
              fail: 'Purchase failed',
              item: 'plot',
            }),
          })
        } else {
          setConfirm(false)
          showPopUp({
            content: t('message.buy-plot.success', {
              amount: price,
              token: 'USDT',
            }),
          })
        }
      })
    },
    [buyPlotTrigger, t],
  )
  return (
    <View style={styles.container}>
      <Header title={item.plot.name} />
      <ModalComp
        visible={popupVis}
        content={popupContent}
        confirmButton={
          confirm
            ? () => {
                handleBuy(item.id, item.price)
              }
            : closePopUp
        }
        cancelButton={confirm ? closePopUp : false}
        isLoading={isBuyFetching}
      />
      <View style={styles.infoContainer}>
        <ImageBackground
          source={{ uri: `${item.plot.logo}?x-oss-process=style/p_80` }}
          imageStyle={styles.NFTimg}
          style={styles.NFTimg}
          resizeMode="contain"
        >
          <View style={styles.countDownView}>
            <CountDownComponent
              until={parseInt(item.sellAt - Date.now() / 1000)}
              textStyle={styles.CountDownText}
            />
          </View>
        </ImageBackground>
        <View style={styles.textContainer}>
          <View style={styles.itemAlign}>
            <Text style={styles.itemName}>{t('page.common.name')}</Text>
            <Text style={styles.itemNumber}>{item.plot.name}</Text>
          </View>
          <View style={styles.itemAlign}>
            <Text style={styles.itemName}>
              {t('page.market.plotdetails.current-blazer')}
            </Text>
            <View style={styles.blazer}>
              <Image
                source={{
                  uri: `${item.plot.blazer.avatar}?x-oss-process=style/p_10`,
                }}
                style={styles.avatarStyle}
              />
              <Text style={styles.itemNumber}>{item.plot.blazer.name}</Text>
            </View>
          </View>
          <View style={styles.itemAlign}>
            <Text style={styles.itemName}> {t('page.common.mint-counts')}</Text>
            <Text style={styles.itemNumber}>{item.plot.mintCount}</Text>
          </View>
          <View style={styles.itemAlign}>
            <Text style={styles.itemName}>{t('page.common.views')}</Text>
            <Text style={styles.itemNumber}>{item.plot.accessCount}</Text>
          </View>
          <View style={styles.itemAlign}>
            <Text style={styles.itemName}>{t('page.common.continent')}</Text>
            <Text style={styles.itemNumber}>{item.plot.continent}</Text>
          </View>
        </View>
      </View>
      <View style={styles.infoWrapper}>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>{item.price}</Text>
          <Text style={styles.coin}>USDT</Text>
        </View>
        {item.sellAt - Date.now() < 0 && (
          <Button
            onPress={() => {
              setConfirm(true)
              showPopUp({ content: 'Do you confirm?' })
            }}
          >
            {t('page.common.purchase')}
          </Button>
        )}
        {item.sellAt - Date.now() >= 0 && (
          <View>
            <Button
              onPress={() => {
                showPopUp({ content: 'Please wait for sale open' })
              }}
              loading={isBuyFetching}
            >
              {t('page.common.purchase')}
            </Button>
            <View style={styles.cover} />
          </View>
        )}
      </View>
    </View>
  )
}
const styles = StyleSheet.create({
  infoContainer: {
    position: 'relative',
    width: 327,
    height: 580,
    backgroundColor: 'rgba(35, 38, 49, 0.5)',
    borderRadius: 40,
  },
  cover: {
    backgroundColor: 'rgba(35, 38, 49, 0.7)',
    borderRadius: 20,
    position: 'absolute',
    width: 145,
    height: 40,
  },
  countDownView: {
    height: 20,
    backgroundColor: 'rgba(1, 0, 0, 0.55)',
    margin: 24,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  CountDownText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '700',
  },
  blazer: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  price: {
    color: 'white',
    fontWeight: '700',
    fontSize: 36,
  },
  avatarStyle: {
    height: 15,
    width: 15,
    borderRadius: 8,
    marginRight: 3,
  },
  coin: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.4)',
    alignSelf: 'flex-end',
    bottom: 4,
    marginLeft: 3,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 320,
    marginTop: 32,
  },
  textContainer: {
    padding: 24,
    flex: 1,
  },
  container: {
    padding: 110,
    flex: 1,
    backgroundColor: 'black',
    alignItems: 'center',
  },
  NFTimg: {
    width: 327,
    height: 327,
    borderRadius: 40,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  itemAlign: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
  },
  itemNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
})

export default PlotDetails
