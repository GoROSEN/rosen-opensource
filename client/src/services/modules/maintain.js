import { api } from '../api'

const maintainApi = api.injectEndpoints({
  endpoints: builder => ({
    // 维护地块
    plotMaintain: builder.mutation({
      query: ({ id, energy }) => ({
        url: '/api/rosen/alpha/blazer/maintain-plot',
        method: 'POST',
        body: { id, energy },
      }),
      invalidatesTags: (result, error, arg) => [
        'UserInfo',
        'PlotList',
        { type: 'Plot', id: arg.id },
      ],
      transformResponse: response => {
        return response
      },
    }),
  }),
  overrideExisting: true,
})

export const { usePlotMaintainMutation } = maintainApi

export default maintainApi
