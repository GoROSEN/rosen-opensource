// not currently supported by solanaJS
import axios from 'axios'
import { debounce } from 'lodash'
import { useCallback } from 'react'

const fetch_NFT = walletAddress => {
  const config = {
    headers: {
      'Content-Type': 'application/json',
    },
  }
  const data = {
    jsonrpc: '2.0',
    id: 1,
    method: 'qn_fetchNFTs',
    params: {
      wallet: walletAddress,
      omitFields: ['provenance', 'traits'],
      page: 1,
      perPage: 10,
    },
  }
  axios
    .post(
      'https://cold-palpable-seed.solana-devnet.discover.quiknode.pro/2e37c4d6ef2568e887f8f503e0bd208163fc17be/',
      data,
      config,
    )
    .then(response => {
      // handle success
      // console.log('response.data')
      console.log(response.data)
    })
    .catch(err => {
      // handle error
      console.log(err)
    })
}

export default fetch_NFT
