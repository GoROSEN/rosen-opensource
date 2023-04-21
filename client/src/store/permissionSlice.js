import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  notificationPermissionAsk: false,
  notificationPushToken: null,
}

const permissionSlice = createSlice({
  name: 'permissionSlice',
  initialState,
  reducers: {
    updataNotificationPermissionAsk: (state, action) => {
      state.notificationPermissionAsk = action.payload.notificationPermissionAsk
    },
    updataNotificationPushToken: (state, action) => {
      state.notificationPushToken = action.payload.notificationPushToken
    },
    clearNotificationPermissionAsk: state => {
      state.notificationPermissionAsk = false
    },
    clearNotificationPushToken: state => {
      state.notificationPushToken = null
    },
  },
})

export const {
  updataNotificationPermissionAsk,
  updataNotificationPushToken,
  clearNotificationPermissionAsk,
  clearNotificationPushToken,
} = permissionSlice.actions
export default permissionSlice.reducer
