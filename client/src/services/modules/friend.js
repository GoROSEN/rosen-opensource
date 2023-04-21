import { api } from '../api'

const friendApi = api.injectEndpoints({
  endpoints: builder => ({
    // 获取粉丝列表
    getFollowerList: builder.query({
      query: arg => {
        const { page, keyword } = arg
        return {
          url: `/api/member/followers/${page}`,
          method: 'GET',
          params: {
            keyword,
          },
        }
      },
      providesTags: ['FollowerList'],
      transformResponse: response => {
        return response.data
      },
    }),
    // 获取粉丝列表
    getFollowingList: builder.query({
      query: arg => {
        const { page, keyword } = arg
        return {
          url: `/api/member/following/${page}`,
          method: 'GET',
          params: {
            keyword,
          },
        }
      },
      providesTags: ['FollowingList'],
      transformResponse: response => {
        return response.data
      },
    }),
    // 关注好友
    follow: builder.mutation({
      query: id => ({
        url: '/api/member/follow',
        method: 'POST',
        body: { followingId: id },
      }),
      invalidatesTags: ['ProducerBaseInfo', 'FollowingList'],
      transformResponse: response => {
        return response
      },
    }),
    // 取消关注好友
    unFollow: builder.mutation({
      query: id => ({
        url: '/api/member/unfollow',
        method: 'POST',
        body: { followingId: id },
      }),
      invalidatesTags: ['ProducerBaseInfo', 'FollowingList'],
      transformResponse: response => {
        return response
      },
    }),
  }),
  overrideExisting: true,
})

export const {
  useLazyGetFollowerListQuery,
  useLazyGetFollowingListQuery,
  useFollowMutation,
  useUnFollowMutation,
} = friendApi

export default friendApi
