import { api } from '../api'

const m2eApi = api.injectEndpoints({
  endpoints: builder => ({
    startM2E: builder.mutation({
      query: data => ({
        url: '/api/rosen/alpha/producer/start-mte',
        method: 'POST',
        body: data,
      }),
      transformResponse: response => {
        // return response.data
        return response
      },
    }),
    endM2E: builder.mutation({
      query: data => ({
        url: '/api/rosen/alpha/producer/stop-mte',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['UserInfo', 'Equipment'],
      transformResponse: response => {
        // return response.data
        return response
      },
    }),
    beatsM2E: builder.mutation({
      query: data => ({
        url: '/api/rosen/alpha/producer/keep-mte',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Equipment'],
      transformResponse: response => {
        return response
        // return {}
      },
    }),
  }),
  overrideExisting: true,
})

export const { useBeatsM2EMutation, useEndM2EMutation, useStartM2EMutation } =
  m2eApi

export default m2eApi
