import React, { useCallback } from 'react'
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native'
import Header from '@/components/Header'
import List from './List'
import { useTranslation } from 'react-i18next'

const Rankingboard = props => {
  const { t, i18n } = useTranslation()
  const [rankingType, setRankingType] = React.useState(1)
  const togglerankingType = useCallback(type => {
    setRankingType(type)
  }, [])
  //1 store 2 token 3 property

  return (
    <View style={styles.container}>
      <Header title={t('page.common.ranking-board')} />
      <View style={styles.switch}>
        <TouchableOpacity
          style={[
            styles.switchItem,
            rankingType === 1 ? styles.switchItemActive : '',
          ]}
          onPress={() => {
            togglerankingType(1)
          }}
        >
          <Text
            style={[
              styles.switchItemText,
              rankingType === 1 ? styles.switchItemTextActive : '',
            ]}
          >
            {t('page.rankingboard.index.overall')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.switchItem,
            rankingType === 2 ? styles.switchItemActive : '',
          ]}
          onPress={() => {
            togglerankingType(2)
          }}
        >
          <Text
            style={[
              styles.switchItemText,
              rankingType === 2 ? styles.switchItemTextActive : '',
            ]}
          >
            {t('page.rankingboard.index.monthly')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.switchItem,
            rankingType === 3 ? styles.switchItemActive : '',
          ]}
          onPress={() => {
            togglerankingType(3)
          }}
        >
          <Text
            style={[
              styles.switchItemText,
              rankingType === 3 ? styles.switchItemTextActive : '',
            ]}
          >
            {t('page.rankingboard.index.daily')}
          </Text>
        </TouchableOpacity>
      </View>

      <List
        rankingType={rankingType}
        onChange={props.onChange}
        onPress={props.onPress}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
  },
  alignBtn: {
    flex: 1,
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
    paddingVertical: 32,
  },
  btn: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  itemAlign: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 5,
  },
  moreContainer: {
    paddingVertical: 5,
  },
  textInputView: {
    height: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 32,
    justifyContent: 'center',
    paddingLeft: 12,
    marginVertical: 5,
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
  moreText: {
    color: 'rgba(255, 255, 255, 0.3)',
    alignSelf: 'center',
  },
  exchangeBoard: {
    width: 327,
    backgroundColor: 'rgba(35, 38, 49, 0.5)',
    justifyContent: 'space-between',
    flexDirection: 'column',
    borderRadius: 20,
    padding: 24,
  },
  switchToken: {
    height: 100,
    backgroundColor: 'red',
  },
  buyTokenView: { flex: 1, flexDirection: 'column' },
  assets: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 50,
    flex: 1,
    bottom: 20,
  },
  assetsItem: {
    alignItems: 'center',
  },
  assetsCount: {
    fontSize: 20,
    color: '#fff',
    marginBottom: 5,
    fontWeight: '700',
  },
  assetsLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
  },
  tokenAlign: {
    flexDirection: 'row',
  },
  iconWraper: {
    alignItems: 'center',
    bottom: 25,
  },
  tokenboard: {
    backgroundColor: '#232631',
    width: 327,
    height: 86,
    borderRadius: 20,
    marginTop: 145,
  },
  verticalView: { flexDirection: 'column', flex: 1 },
  icon: { width: 50, height: 50, borderRadius: 50 },
  switch: {
    borderRadius: 12,
    padding: 7,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'flex-end',
    marginBottom: 20,
    height: 50,
    width: '100%',
    marginVertical: 10,
    marginTop: 100,
  },
  switchItem: {
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#232631',
    minWidth: 100,
  },
  switchItemActive: {
    backgroundColor: '#5A8CFF',
  },
  switchItemText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '400',
  },
  switchItemTextActive: {
    color: '#fff',
  },
})

export default Rankingboard
