import { api } from '../api'

const exchangeApi = api.injectEndpoints({
  endpoints: builder => ({
    getExchangeRate: builder.query({
      query: data => {
        return {
          url: '/api/rosen/member/exchangeRate',
          method: 'GET',
          params: data,
        }
      },
      transformResponse: response => {
        return response.data
      },
    }),

    exchangeRosen: builder.mutation({
      query: data => ({
        url: '/api/rosen/member/exchange',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['UserInfo'],
      transformResponse: response => {
        // return response.data
        return response
      },
    }),

    withdrawToken: builder.mutation({
      query: data => ({
        url: `/api/rosen/member/account/withdraw/${data.token}`,
        method: 'POST',
        body: { amount: data.amount },
      }),
      invalidatesTags: ['UserInfo'],
      transformResponse: response => {
        // return response.data
        return response
      },
    }),
  }),
  overrideExisting: true,
})

export const {
  useGetExchangeRateQuery,
  useExchangeRosenMutation,
  useWithdrawTokenMutation,
} = exchangeApi
export default exchangeApi
