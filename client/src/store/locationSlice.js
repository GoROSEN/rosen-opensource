import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  coordinates: {
    latitude: 48.8582602,
    longitude: 2.2944991,
  },
}

const locationSlice = createSlice({
  name: 'authSlice',
  initialState,
  reducers: {
    updataCoordinates: (state, action) => {
      state.coordinates = action.payload
    },
  },
})

export const { updataCoordinates } = locationSlice.actions
export default locationSlice.reducer
