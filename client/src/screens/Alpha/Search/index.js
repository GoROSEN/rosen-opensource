import React from 'react'
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { globalStyles } from '@/constants'
import Header from '@/components/Header'
import Plot from './Plot'
import User from './User'
import { useTranslation } from 'react-i18next'

const Search = ({ route }) => {
  const { t } = useTranslation()
  const [searchType, setSearchType] = React.useState(1)

  const toggleSearchType = React.useCallback(type => {
    setSearchType(type)
  }, [])

  return (
    <SafeAreaView
      style={[globalStyles.container, globalStyles.containerPadding]}
    >
      <Header />
      <View style={styles.switch}>
        <TouchableOpacity
          style={[
            styles.switchItem,
            searchType === 1 ? styles.switchItemActive : '',
          ]}
          onPress={() => {
            toggleSearchType(1)
          }}
        >
          <Text
            style={[
              styles.switchItemText,
              searchType === 1 ? styles.switchItemTextActive : '',
            ]}
          >
            {t('page.search.index.plot')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.switchItem,
            searchType === 2 ? styles.switchItemActive : '',
          ]}
          onPress={() => {
            toggleSearchType(2)
          }}
        >
          <Text
            style={[
              styles.switchItemText,
              searchType === 2 ? styles.switchItemTextActive : '',
            ]}
          >
            {t('page.search.index.user')}
          </Text>
        </TouchableOpacity>
      </View>
      {searchType === 1 && (
        <Plot searchVacantParams={route.params?.searchVacantParams} />
      )}
      {searchType === 2 && <User />}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  header: {
    position: 'absolute',
    top: 30,
    left: 0,
    right: 0,
    backgroundColor: '#000',
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  switch: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 12,
    padding: 7,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  switchItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 46,
    borderRadius: 8,
  },
  switchItemActive: {
    backgroundColor: '#000',
  },
  switchItemText: {
    color: 'rgba(255,255,255,0.1)',
    fontSize: 20,
    fontWeight: '400',
  },
  switchItemTextActive: {
    color: '#fff',
  },
})

export default React.memo(Search)
