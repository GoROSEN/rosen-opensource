import React, { useState } from 'react'
import { StyleSheet, View, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import { SafeAreaView } from 'react-native-safe-area-context'
import { globalStyles } from '@/constants'
import Header from '@/components/Header'
import Switch from '@/components/Switch'

const Setting = () => {
  const { t } = useTranslation()
  const [isMatchingEnabled, setIsMatchingEnabled] = useState(false)
  const [isAvatarEnabled, setIsAvatarEnabled] = useState(false)

  const toggleMatchingSwitch = () =>
    setIsMatchingEnabled(previousState => !previousState)

  const toggleAvatarSwitch = () =>
    setIsAvatarEnabled(previousState => !previousState)

  return (
    <SafeAreaView
      style={[globalStyles.container, globalStyles.containerPadding]}
    >
      <Header
        title={t('page.games.rock-paper-scissors.setting')}
        bgColor="transparent"
      />

      <View style={styles.settingItem}>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Whether to enable matching</Text>
          <Switch
            activeTrackColor="#81b0ff"
            inActiveTrackColor="#4F515A"
            onValueChange={toggleMatchingSwitch}
            value={isMatchingEnabled}
          />
        </View>
        <Text style={styles.settingDescription}>
          After turning on Matching, you will receive random
          matching.Interacting with other users in mini-games, the winner will
          be rewarded with coins; Once you turn off Matching, you will no longer
          accept this gameplay match; Accepting doesn't cost ENGY; Users without
          any plot cannot accept challeges initiated by others;
        </Text>
      </View>
      <View style={styles.settingItem}>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>
            Whether to use Avatar to participate
          </Text>
          <Switch
            activeTrackColor="#81b0ff"
            inActiveTrackColor="#4F515A"
            onValueChange={toggleAvatarSwitch}
            value={isAvatarEnabled}
          />
        </View>
        <Text style={styles.settingDescription}>
          Once your Avatar is enabled, it can help you complete battle games
          with other players when you are unresponsive; Avatar needs to be worn
          in the Metaverse - M2E interface to take effect; When you are unable
          to respond to matching and are not wearing an Avatar, we suggest you
          to turn off matching to prevent you from losing coins. Matching will
          automatically close when your coin balance is less than 0.
        </Text>
      </View>
    </SafeAreaView>
  )
}

export default React.memo(Setting)

const styles = StyleSheet.create({
  settingItem: {
    backgroundColor: '#232631',
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  settingDescription: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 18,
  },
})
