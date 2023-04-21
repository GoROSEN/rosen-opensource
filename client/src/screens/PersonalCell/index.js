import React, { useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useSelector } from 'react-redux'

import PersonalCellComponent from './PersonalCell'
import ProducerCellComponent from './ProducerCell'

const PersonalCell = ({ route }) => {
  const { params = {} } = route
  const userInfo = useSelector(state => state.authUser.userInfo)

  const children = () => {
    if (params.id !== undefined) {
      if (params.id === userInfo.member.id) {
        return <PersonalCellComponent />
      } else {
        return <ProducerCellComponent id={params.id} />
      }
    } else {
      return <PersonalCellComponent />
    }
  }

  return <View style={styles.container}>{children()}</View>
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})

export default PersonalCell
