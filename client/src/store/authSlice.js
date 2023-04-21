import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  userInfo: null,
}

const authSlice = createSlice({
  name: 'authSlice',
  initialState,
  reducers: {
    userInfo: (state, action) => {
      state.userInfo = action.payload
    },
    clearUserInfo: state => {
      state.userInfo = null
    },
    updataUserInfo: (state, action) => {
      if (action.payload.avatar) {
        state.userInfo.member.avatar = action.payload.avatar
      }
      if (action.payload.displayName) {
        state.userInfo.member.displayName = action.payload.displayName
      }
      if (action.payload.bio) {
        state.userInfo.member.bio = action.payload.bio
      }
      if (action.payload.email) {
        state.userInfo.member.email = action.payload.email
      }
    },
  },
})

export const { userInfo, clearUserInfo, updataUserInfo } = authSlice.actions
export default authSlice.reducer
