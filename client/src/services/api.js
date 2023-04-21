import { createApi, fetchBaseQuery, retry } from '@reduxjs/toolkit/query/react'
import NavigationService from '@/navigation/NavigationService'
import Constants from 'expo-constants'

const baseQuery = retry(
  fetchBaseQuery({
    baseUrl: Constants.expoConfig.extra.apiUrl,
    timeout: 10000,
    prepareHeaders: (headers, { getState }) => {
      const userInfo = getState().authUser.userInfo
      if (userInfo && userInfo.token) {
        headers.set('X-Token', userInfo.token)
      }
      console.log('\x1b[36m', 'X-Token:', userInfo?.token)
      return headers
    },
  }),
  {
    maxRetries: 3,
  },
)

// 拦截器
const baseQueryWithInterceptor = async (args, api, extraOptions) => {
  console.log('\x1b[34m', 'Request:', new Date(), args)
  try {
    const result = await baseQuery(args, api, extraOptions)
    console.log('')
    console.log('\x1b[32m', 'Response:', new Date(), args)
    console.log('\x1b[37m', result.data)
    const { code, msg } = result.data
    if (code !== 20000) {
      console.log('\x1b[33m', new Date(), code, msg)
      // 50018-登录过期，跳转到登录页
      if (code === 50018) {
        const state = NavigationService.getRootState()
        // 通过route name判断是否已经跳转
        // 防止多次跳转
        if (state.routes[0].name !== 'Login') {
          NavigationService.reset({
            index: 0,
            routes: [
              {
                name: 'Login',
              },
            ],
          })
        }
      }
      return result
    } else {
      return result
    }
  } catch (err) {
    console.error('\x1b[31m', err.message)
    console.error('\x1b[31m', err.stack)
    return { error: { status: 500, data: err.message } }
  }
}

export const api = createApi({
  baseQuery: baseQueryWithInterceptor,
  tagTypes: [
    'Plot',
    'NearbyPlotList',
    'PlotList',
    'GalleryList',
    'UserInfo',
    'ProducerBaseInfo',
    'Equipment',
    'listedPlot',
    'FollowerList',
    'FollowingList',
  ],
  endpoints: () => ({}),
})

export const apiSolana = createApi({
  reducerPath: 'apiSolana',
  baseQuery: fetchBaseQuery({
    baseUrl: 'https://cold-palpable-seed.solana-devnet.discover.quiknode.pro',
  }),
  endpoints: () => ({}),
})
