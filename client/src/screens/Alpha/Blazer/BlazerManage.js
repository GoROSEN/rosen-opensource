import * as React from 'react'
import { View, StyleSheet, Image, Text, FlatList } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { globalStyles } from '@/constants'
import BlazerCard from './BlazerCard'
import Header from '@/components/Header'
import { useGetPlotListQuery } from '@/services/modules/plot'
import { useSelector } from 'react-redux'
import { useUnListPlotOnMarketMutation } from '@/services/modules/market'
import ModalComp from '@/components/Popup'
import { useTranslation } from 'react-i18next'

const Property = () => {
  const { t, i18n } = useTranslation()
  const { data: plotlist = {} } = useGetPlotListQuery(1, {
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  })
  const [showPopUp, setShowPopUp] = React.useState(false)
  const [unListTrigger, { isLoading: isUnListFetching }] =
    useUnListPlotOnMarketMutation()
  const userInfo = useSelector(state => state.authUser.userInfo)

  const unListTriggerHandler = React.useCallback(
    data => {
      unListTrigger({ listingId: data.listingId, plotId: data.plotId }).then(
        () => setShowPopUp(true),
      )
    },
    [unListTrigger],
  )
  const closePopUp = React.useCallback(() => {
    setShowPopUp(false)
  }, [])
  return (
    <SafeAreaView
      style={[
        globalStyles.container,
        globalStyles.containerPadding,
        styles.propertyView,
      ]}
    >
      <Header title={t('page.blazer.blazermanage.property')} />
      <ModalComp
        visible={showPopUp}
        content={t('message.listing-plot.cancel')}
        confirmButton={closePopUp}
      />
      <View style={styles.blazerView}>
        <Image
          style={styles.maskGroupIcon}
          resizeMode="cover"
          source={{
            uri: `${userInfo?.member.avatar}?x-oss-process=style/p_10`,
          }}
        />
        <Text style={styles.nameText}>{userInfo.member.displayName}</Text>
      </View>
      <FlatList
        style={styles.flatlistView}
        keyExtractor={(item, index) => 'key' + index}
        data={plotlist.items}
        scrollEnabled={true}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={<BlazerCard hasplot={false} />}
        renderItem={({ item }) => (
          <BlazerCard
            progression={item.durability > 1 ? 1 : item.durability}
            hasplot={true}
            img={item.logo}
            maxlimit={item.mintLimitOD}
            level={item.level}
            currentmint={item.mintCountOD}
            lat={item.lat}
            lng={item.lng}
            name={item.name}
            id={item.id}
            style={item.style}
            maintainCost={item.maintainCost}
            listing={item.listing}
            unListTriggerHandler={unListTriggerHandler}
            isUnListFetching={isUnListFetching}
          />
        )}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  maskGroupIcon: {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: 40,
  },
  nameText: {
    position: 'relative',
    fontSize: 18,
    color: '#fff',
    textAlign: 'left',
    marginLeft: 5,
  },
  blazerView: {
    position: 'relative',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  flatlistView: {
    position: 'relative',
  },
  propertyView: {
    position: 'relative',
    // alignItems: 'center',
  },
})

export default Property
