import axios from 'axios'

export const mempoolTxDetailLink = (txid: string) =>
	`${import.meta.env.VITE_MEMPOOL_BASE_URL}/tx/${txid}`

const mempoolApi = axios.create({
	baseURL: `${import.meta.env.VITE_MEMPOOL_BASE_URL}/api`,
	headers: {
		'Content-Type': 'application/json'
	}
})

export const getBtcLatestHeight = async () => {
	return await mempoolApi
	.get<number>('/blocks/tip/height')
	.then(res => res.data)
}


export async function getTransactionFromMempool(txid: string): Promise<MempoolTransaction|undefined> {
	return await mempoolApi
	.get<MempoolTransaction>('/tx/'+txid)
	.then(res => {
		console.log({res})
		if (res.status!==200) {
			return undefined
		}
		return res.data
	})
} 

export async function getAddressUtxo(address: string) {
	return await mempoolApi
	.get<MempoolUtxo[]>('/address/'+address+'/utxo')
	.then(res => {
		console.log({res})
		if (res.status!==200) {
			return undefined
		}
		return res.data
	})
}




/*
{
  txid: "eefbafa4006e77099db059eebe14687965813283e5754d317431d9984554735d",
  version: 2,
  locktime: 2091198,
  vin: [],
  vout: [],
  size: 222,
  weight: 561,
  fee: 16332,
  status: {
    confirmed: true,
    block_height: 2091199,
    block_hash: "000000000000004d36632fda8180ff16855d606e5515aab0750d9d4fe55fe7d6",
    block_time: 1630648992
  }
}
*/
export type MempoolTransaction = {
	txid: string
	version: number
	locktime: number
	vin: any[]
	vout: any[]
	size: number
	weight: number
	fee: number
	status: {
		confirmed: boolean
		block_height: number
		block_hash: string
		block_time: number
	}
}

export type MempoolUtxo = {
	/*
	 {
    txid: "c404bc4ba89e9423ff772cb45268ba6fba8b713f809484c1216f1a657aafa088",
    vout: 1,
    status: {
      confirmed: true,
      block_height: 2086944,
      block_hash: "000000000000039a27007892b0f3ac646afa4eb3ef3d4a4e75e8bdf636b4d006",
      block_time: 1630159123
    },
    value: 1973787
  }
	*/
	txid: string,
	vout: number,
	status: {
		confirmed: boolean
		block_height: number | undefined
		block_hash: string | undefined
		block_time: number | undefined
	},
	value: number
}