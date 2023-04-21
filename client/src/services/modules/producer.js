import { api } from '../api'

const producerApi = api.injectEndpoints({
  endpoints: builder => ({
    // 获取附近Producer列表
    getNearbyProducerList: builder.query({
      query: arg => {
        const { lat, lng, radius } = arg
        return {
          url: '/api/open/rosen/alpha/producers/search',
          method: 'GET',
          params: {
            lat: lat,
            lng: lng,
            radius: radius,
          },
        }
      },
      transformResponse: response => {
        return response.data
      },
    }),
    // 分页获取附近Producer列表
    getNearbyProducerListByPage: builder.query({
      query: arg => {
        const { lat, lng, radius, keyword, page } = arg
        return {
          url: `/api/open/rosen/alpha/producers/psearch/${page}`,
          method: 'GET',
          params: {
            lat: lat,
            lng: lng,
            radius: radius,
            keyword: keyword,
          },
        }
      },
      transformResponse: response => {
        return response.data
      },
    }),
    // mint NFT
    mint: builder.mutation({
      query: data => ({
        url: '/api/rosen/alpha/producer/mint',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, arg) => [
        'UserInfo',
        { type: 'Plot', id: arg.plotId },
      ],
      transformResponse: response => {
        return response
      },
    }),
  }),
  overrideExisting: true,
})

export const {
  useGetNearbyProducerListQuery,
  useLazyGetNearbyProducerListQuery,
  useGetNearbyProducerListByPageQuery,
  useLazyGetNearbyProducerListByPageQuery,
  useMintMutation,
} = producerApi

export default producerApi
