import React, { useState, useCallback } from 'react'
import { View, Image, StyleSheet } from 'react-native'
import { Marker } from 'react-native-maps'
import { globalStyles } from '@/constants'
import PlotAvatar from './PlotAvatar'

function PlotMarker(props) {
  const [tracks, setTracks] = useState(true)

  const handleImageLoad = useCallback(() => {
    setTracks(false)
  }, [])

  return (
    <Marker
      key={`key_${props.id}`}
      coordinate={props.coordinate}
      tracksViewChanges={tracks}
      onPress={event => props.onPress({ event: event, plotId: props.id })}
    >
      {props.style === 0 && (
        <>
          <Image
            source={{ uri: `${props.logo}?x-oss-process=style/p_10` }}
            onLoad={handleImageLoad}
            style={styles.placeholder}
          />
          <PlotAvatar image={`${props.logo}?x-oss-process=style/p_10`} />
        </>
      )}
      {props.style === 1 && (
        <View style={styles.activityPlotContainer}>
          <Image
            defaultSource={globalStyles.defaultImageSmall}
            source={{ uri: `${props.logo}?x-oss-process=style/p_30` }}
            onLoad={handleImageLoad}
            style={styles.activityPlot}
          />
        </View>
      )}
    </Marker>
  )
}

const styles = StyleSheet.create({
  placeholder: {
    width: 0,
    height: 0,
    overflow: 'hidden',
  },
  activityPlotContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    overflow: 'hidden',
  },
  activityPlot: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
})

export default React.memo(PlotMarker)
