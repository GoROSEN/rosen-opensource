import AsyncStorage from '@react-native-async-storage/async-storage'
import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'
import {
  persistReducer,
  persistStore,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist'
import { api, apiSolana } from '@/services/api'
import authReducer from './authSlice'
import blockchainAuth from './blockchainAuth'
import locationReducer from './locationSlice'
import permissionReducer from './permissionSlice'

const reducers = combineReducers({
  api: api.reducer,
  [apiSolana.reducerPath]: apiSolana.reducer,
  authUser: authReducer,
  authPubKey: blockchainAuth,
  location: locationReducer,
  permission: permissionReducer,
})

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
}

const persistedReducer = persistReducer(persistConfig, reducers)

const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware => {
    const middlewares = getDefaultMiddleware({
      // serializableCheck: {
      //   ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      // },
      serializableCheck: false,
      immutableCheck: false,
    }).concat([api.middleware, apiSolana.middleware])

    return middlewares
  },
})

const persistor = persistStore(store)

setupListeners(store.dispatch)

export { store, persistor }
