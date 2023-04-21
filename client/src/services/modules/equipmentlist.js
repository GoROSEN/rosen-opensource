import { api } from '../api'

const equipmentListApi = api.injectEndpoints({
  endpoints: builder => ({
    // 获取装备列表
    getEquipmentList: builder.query({
      query: page => {
        return {
          url: `/api/rosen/member/assets/producer-equips/${page}`,
          method: 'GET',
        }
      },
      transformResponse: response => {
        return response.data
      },
    }),

    getCurrentEquipment: builder.query({
      query: page => {
        return {
          url: '/api/rosen/member/assets/producer-current-equip',
          method: 'GET',
        }
      },
      providesTags: ['Equipment'],
      transformResponse: response => {
        return response.data
      },
    }),
    switchEquiment: builder.mutation({
      query: id => ({
        url: `/api/rosen/member/assets/producer-equip/activate/${id}`,
        method: 'POST',
        body: {},
      }),
      invalidatesTags: ['Equipment'],
      transformResponse: response => {
        // return response.data
        return response
      },
    }),
  }),
  overrideExisting: true,
})

export const {
  useGetEquipmentListQuery,
  useLazyGetEquipmentListQuery,
  useGetCurrentEquipmentQuery,
  useLazyGetCurrentEquipmentQuery,
  useSwitchEquimentMutation,
} = equipmentListApi
export default equipmentListApi
