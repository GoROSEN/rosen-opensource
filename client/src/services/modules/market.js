import { api } from '../api'

const marketApi = api.injectEndpoints({
  endpoints: builder => ({
    // 获取内购商城NFTlist
    getNFTMarketList: builder.query({
      query: arg => {
        const { id, page } = arg
        return {
          url: `/api/open/mall/goods/list/${id}/${page}`,
          method: 'GET',
        }
      },
      transformResponse: response => {
        return response.data
      },
    }),
    getPlotMarketList: builder.query({
      query: arg => {
        const { page } = arg
        return {
          url: `/api/rosen/alpha/producer/listing-plots/${page}`,
          method: 'GET',
        }
      },
      providesTags: ['listedPlot'],
      transformResponse: response => {
        return response.data
      },
    }),
    listPlotOnMarket: builder.mutation({
      query: data => {
        const { plotId, price, currency } = data
        return {
          url: `/api/rosen/alpha/blazer/listing/${plotId}`,
          method: 'POST',
          body: { price: price, currency: currency },
        }
      },
      invalidatesTags: (result, error, arg) => {
        return result.code === 20000 ? ['listedPlot', 'PlotList', 'Plot'] : []
      },
      transformResponse: response => {
        return response
      },
    }),
    unListPlotOnMarket: builder.mutation({
      query: ({ listingId }) => {
        return {
          url: `/api/rosen/alpha/blazer/unlisting/${listingId}`,
          method: 'POST',
        }
      },
      invalidatesTags: (result, error, arg) => {
        return result.code === 20000 ? ['listedPlot', 'PlotList', 'Plot'] : []
      },
      transformResponse: response => {
        return response
      },
    }),
    buyListedPlot: builder.mutation({
      query: data => {
        const { listingId } = data
        return {
          url: `/api/rosen/alpha/blazer/buy/${listingId}`,
          method: 'POST',
        }
      },
      invalidatesTags: ['listedPlot', 'PlotList', 'UserInfo'],
      transformResponse: response => {
        return response
        // return {}
      },
    }),
  }),
  overrideExisting: true,
})

export const {
  useGetNFTMarketListQuery,
  useGetPlotMarketListQuery,
  useLazyGetNFTMarketListQuery,
  useLazyGetPlotMarketListQuery,
  useBuyListedPlotMutation,
  useListPlotOnMarketMutation,
  useUnListPlotOnMarketMutation,
} = marketApi

export default marketApi
