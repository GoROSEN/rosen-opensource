import React from 'react'
import { StyleSheet, View, Text, Image } from 'react-native'
import Button from '@/components/Button'
import Header from '@/components/Header'
import { useTranslation } from 'react-i18next'

const NFTDetails = props => {
  const { t, i18n } = useTranslation()
  const item = props.route.params.item
  return (
    <View style={styles.container}>
      <Header title={t('page.market.nftdetails.item')} />
      <View style={styles.infoContainer}>
        <Image
          source={props.route.params.image}
          style={styles.NFTimg}
          resizeMode="contain"
        />
        <View style={styles.textContainer}>
          <View style={styles.itemAlign}>
            <Text style={styles.itemName}>
              {t('page.market.nftdetails.attribute')}{' '}
            </Text>
            <Text style={styles.itemNumber}>{item.name}</Text>
          </View>
          <View style={styles.itemAlign}>
            <Text style={styles.itemName}>
              {t('page.market.nftdetails.m2e-performance')}
            </Text>
            <Text style={styles.itemNumber}>{0}</Text>
          </View>
          <View style={styles.itemAlign}>
            <Text style={styles.itemName}>
              {t('page.market.nftdetails.time-limit')}
            </Text>
            <Text style={styles.itemNumber}>{0}</Text>
          </View>
        </View>
      </View>
      <View style={styles.infoWrapper}>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>{item.price}</Text>
          <Text style={styles.coin}>USDT</Text>
        </View>
        <Button disabled={true}>{t('page.common.purchase')}</Button>
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
  price: {
    color: 'white',
    fontWeight: '700',
    fontSize: 36,
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
    paddingHorizontal: 24,
    flex: 1,
    bottom: 117,
  },
  container: {
    padding: 110,
    flex: 1,
    backgroundColor: 'black',
    alignItems: 'center',
  },
  NFTimg: {
    width: 327,
    bottom: 77,
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

export default NFTDetails
