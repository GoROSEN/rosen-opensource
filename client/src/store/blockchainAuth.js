import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  algo: null,
  near: null,
  sol: null,
}

const blockchainAuth = createSlice({
  name: 'blockchainAuth',
  initialState,
  reducers: {
    connectPublicKey: (state, action) => {
      switch (action.payload.chain) {
        case 'sol':
          console.log('connecting')
          console.log(state.sol)
          state.sol = action.payload.publicKey
          break
        case 'algo':
          state.algo = action.payload.publicKey
          break
        case 'near':
          state.near = action.payload.publicKey
          break
      }
    },
    disconnectPublicKey: (state, action) => {
      switch (action.payload.chain) {
        case 'sol':
          state.sol = null
          break
        case 'algo':
          state.algo = null
          break
        case 'near':
          state.near = null
          break
      }
    },
  },
})

export const { connectPublicKey, disconnectPublicKey } = blockchainAuth.actions
export default blockchainAuth.reducer
