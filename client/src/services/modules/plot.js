import { api } from '../api'

const plotApi = api.injectEndpoints({
  endpoints: builder => ({
    // 获取地块详细信息
    getPlotById: builder.query({
      query: id => ({
        url: `/api/open/rosen/alpha/plot/${id}`,
        method: 'GET',
      }),
      providesTags: (result, error, arg) => [{ type: 'Plot', id: arg.id }],
      transformResponse: response => {
        return response.data
      },
    }),
    // 获取地块列表
    getPlotList: builder.query({
      query: id => {
        return {
          url: `/api/rosen/alpha/blazer/plots/${id}`,
          method: 'GET',
        }
      },
      providesTags: ['PlotList'],
      transformResponse: response => {
        return response.data
      },
    }),
    // 获取地块排行榜
    getPlotRanking: builder.query({
      query: type => {
        return {
          url: '/api/open/rosen/alpha/ranking/plots',
          method: 'GET',
          params: {
            type: type,
          },
        }
      },
      transformResponse: response => {
        return response.data
      },
    }),
    // 获取附近地块
    getNearbyPlotList: builder.query({
      query: arg => {
        const { lat, lng, radius, keyword, continent, vacant } = arg
        return {
          url: '/api/open/rosen/alpha/plots/search',
          method: 'GET',
          params: {
            lat: lat,
            lng: lng,
            radius: radius,
            vacant: vacant,
            continent: continent,
            keyword: keyword,
          },
        }
      },
      providesTags: ['NearbyPlotList'],
      transformResponse: response => {
        return response.data
      },
    }),
    getNearbyPlotListByPage: builder.query({
      query: arg => {
        const { lat, lng, radius, keyword, continent, vacant, sort, page } = arg
        return {
          url: `/api/open/rosen/alpha/plots/psearch/${page}`,
          method: 'GET',
          params: {
            lat: lat,
            lng: lng,
            radius: radius,
            vacant: vacant,
            continent: continent,
            keyword: keyword,
            sort: sort,
          },
        }
      },
      providesTags: ['NearbyPlotList'],
      transformResponse: response => {
        return response.data
      },
    }),
    // 占领地块
    occupy: builder.mutation({
      query: id => ({
        url: `/api/rosen/alpha/blazer/occupy/${id}`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, arg) =>
        result.code === 20000 ? ['UserInfo', { type: 'Plot', id: arg.id }] : [],
      transformResponse: response => {
        return response
      },
    }),
  }),
  overrideExisting: true,
})

export const {
  useGetPlotByIdQuery,
  useLazyGetPlotByIdQuery,
  useGetPlotListQuery,
  useLazyGetPlotListQuery,
  useGetNearbyPlotListQuery,
  useLazyGetNearbyPlotListQuery,
  useGetNearbyPlotListByPageQuery,
  useLazyGetNearbyPlotListByPageQuery,
  useOccupyMutation,
  useGetPlotRankingQuery,
  useLazyGetPlotRankingQuery,
} = plotApi

export default plotApi
