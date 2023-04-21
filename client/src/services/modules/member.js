import { api } from '../api'

const memberApi = api.injectEndpoints({
  endpoints: builder => ({
    // 获取验证码
    getVerifyCode: builder.query({
      query: data => ({
        url: `/api/open/member/code/${data.type}`,
        method: 'GET',
        params: data,
      }),
      transformResponse: response => {
        // return response.data
        return {}
      },
    }),
    // 注册
    signup: builder.mutation({
      query: data => ({
        url: '/api/open/rosen/member/signup',
        method: 'POST',
        body: data,
      }),
      transformResponse: response => {
        return response
      },
    }),
    // 修改密码
    resetPassword: builder.mutation({
      query: data => ({
        url: '/api/open/member/resetPassword',
        method: 'POST',
        body: data,
      }),
      transformResponse: response => {
        return response
      },
    }),
    //第三方登录
    signupFacebook: builder.mutation({
      query: data => ({
        url: '/api/open/rosen/member/signin-tp',
        method: 'POST',
        body: data,
      }),
      transformResponse: response => {
        return response
      },
    }),
    // 登录
    signin: builder.mutation({
      query: data => ({
        url: '/api/open/member/auth',
        method: 'POST',
        body: data,
      }),
      transformResponse: response => {
        return response
      },
    }),
    // 修改个人信息
    modifyBasicInfo: builder.mutation({
      query: data => ({
        url: '/api/rosen/member/basic',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['UserInfo'],
      transformResponse: response => {
        return response
      },
    }),
    // 上传头像
    postAvatar: builder.mutation({
      query: data => ({
        url: '/api/member/avatar',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['UserInfo'],
      transformResponse: response => {
        return response
      },
    }),
    // 获取个人信息
    getUserBasic: builder.query({
      query: () => ({
        url: '/api/rosen/member/basic',
        method: 'GET',
      }),
      providesTags: ['UserInfo'],
      transformResponse: response => {
        return response.data
      },
    }),
    // 获取其他人个人信息
    getProducerBasic: builder.query({
      query: id => ({
        url: `/api/rosen/alpha/member/${id}/info`,
        method: 'GET',
      }),
      providesTags: ['ProducerBaseInfo'],
      transformResponse: response => {
        return response.data
      },
    }),
    // 获取其他人占领地块
    getProducerPlotList: builder.query({
      query: id => {
        return {
          url: `/api/rosen/alpha/member/${id}/plots`,
          method: 'GET',
        }
      },
      transformResponse: response => {
        return response.data
      },
    }),
    // 获取Gallery列表
    getGalleryList: builder.query({
      query: params => {
        return {
          url: `/api/rosen/member/gallery/list/${params.page}`,
          method: 'GET',
          params: {
            pageSize: params.pageSize || 10,
          },
        }
      },
      providesTags: ['GalleryList'],
      transformResponse: response => {
        return response.data
      },
    }),
    // 获取Gallery详情
    getGalleryById: builder.query({
      query: id => {
        return {
          url: `/api/rosen/member/gallery/detail/${id}`,
          method: 'GET',
        }
      },
      transformResponse: response => {
        return response.data
      },
    }),
    // 获取其他人Gallery
    getProducerGalleryList: builder.query({
      query: id => {
        return {
          url: `/api/rosen/alpha/member/${id}/galleries`,
          method: 'GET',
        }
      },
      transformResponse: response => {
        return response.data
      },
    }),
    // gallery 赠送
    assetsTransfer: builder.mutation({
      query: data => {
        return {
          url: `/api/rosen/member/assets/transfer/${data.id}`,
          method: 'POST',
          body: { to: data.receiverId },
        }
      },
      invalidatesTags: ['GalleryList'],
      transformResponse: response => {
        return response
      },
    }),
    // 绑定设备
    deviceBind: builder.mutation({
      query: data => ({
        url: `/api/message/member/bind/device/${data.devType}`,
        method: 'POST',
        body: {
          token: data.token,
        },
      }),
    }),
    // 解绑设备
    deviceUnbind: builder.mutation({
      query: data => ({
        url: `/api/message/member/unbind/device/${data.devType}`,
        method: 'POST',
        body: {
          token: data.token,
        },
      }),
    }),
    // 测试推送
    pushNotifyTest: builder.mutation({
      query: data => ({
        url: '/api/message/member/test/device/expo',
        method: 'POST',
      }),
    }),
    // 获取消息列表
    getNotificationList: builder.query({
      query: params => {
        return {
          url: `/api/message/member/list/${params.page}`,
          method: 'GET',
          params: {
            pageSize: params.pageSize || 10,
          },
        }
      },
      transformResponse: response => {
        return response.data
        // return {
        //   items: [
        //     {
        //       id: 123,
        //       time: new Date(),
        //       title: 'Notification',
        //       content: 'this is a push notifition from Rosen',
        //     },
        //     {
        //       id: 234,
        //       time: new Date(),
        //       title: 'Notification',
        //       content: 'this is a push notifition from Rosen',
        //     },
        //   ],
        //   pager: {
        //     pageCount: 1,
        //   },
        // }
      },
    }),
  }),
  overrideExisting: true,
})

export const {
  useLazyGetVerifyCodeQuery,
  useResetPasswordMutation,
  useSignupMutation,
  useSigninMutation,
  useGetUserBasicQuery,
  useLazyGetUserBasicQuery,
  useGetProducerBasicQuery,
  useLazyGetProducerBasicQuery,
  useGetProducerPlotListQuery,
  useGetProducerGalleryListQuery,
  useModifyBasicInfoMutation,
  usePostAvatarMutation,
  useGetGalleryListQuery,
  useLazyGetGalleryListQuery,
  useGetGalleryByIdQuery,
  useAssetsTransferMutation,
  useSignupFacebookMutation,
  useDeviceBindMutation,
  useDeviceUnbindMutation,
  usePushNotifyTestMutation,
  useLazyGetNotificationListQuery,
} = memberApi

export default memberApi
