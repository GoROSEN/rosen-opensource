import { apiSolana } from '../api'

const assetsApi = apiSolana.injectEndpoints({
  endpoints: builder => ({
    // 获取assets列表
    getAssetsList: builder.query({
      query: data => {
        return {
          url: '/2e37c4d6ef2568e887f8f503e0bd208163fc17be',
          method: 'POST',
          body: {
            jsonrpc: '2.0',
            id: 1,
            method: 'qn_fetchNFTs',
            params: {
              wallet: data.walletAddress,
              omitFields: [
                'provenance',
                'traits',
                'collectionName',
                'creators',
                'description',
              ],
              page: data.page,
              perPage: data.pageSize || 10,
            },
          },
        }
      },
      transformResponse: response => {
        return response.result
      },
    }),
  }),
  overrideExisting: true,
})

export const { useGetAssetsListQuery, useLazyGetAssetsListQuery } = assetsApi

export default assetsApi
