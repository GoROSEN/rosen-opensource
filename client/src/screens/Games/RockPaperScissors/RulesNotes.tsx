import React from 'react'
import { StyleSheet, Text, ImageBackground, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { SafeAreaView } from 'react-native-safe-area-context'
import { globalStyles } from '@/constants'
import Header from '@/components/Header'

const RulesNotes = () => {
  const { t } = useTranslation()

  return (
    <ImageBackground
      source={require('@/assets/images/games/rps/page_bg.jpg')}
      style={styles.containerBg}
    >
      <SafeAreaView style={[styles.container, globalStyles.containerPadding]}>
        <Header
          title={t('page.games.rock-paper-scissors.rules-notes')}
          bgColor="transparent"
        />

        <ScrollView>
          <Text style={styles.rulesNotesDetail}>
            {t('page.games.rock-paper-scissors.rules-notes-detail')}
          </Text>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  )
}

export default React.memo(RulesNotes)

const styles = StyleSheet.create({
  containerBg: {
    position: 'relative',
    flex: 1,
  },
  container: {
    flex: 1,
  },
  rulesNotesDetail: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 28,
  },
})
