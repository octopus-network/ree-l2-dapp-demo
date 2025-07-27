import type { NetworkType } from '@omnisat/lasereyes'

export const UTXO_DUST = BigInt(546)
export const ICP_HOST = 'https://ic0.app'

export const NETWORK = (process.env.NEXT_PUBLIC_NETWORK ??
	'testnet4') as NetworkType

export const MEMPOOL_URL =
	process.env.NEXT_PUBLIC_MEMPOOL_URL ?? 'https://mempool.space'

export const RUNESCAN_URL =
	process.env.NEXT_PUBLIC_RUNESCAN_URL ?? 'https://testnet.runescan.net'

export const REE_INDEXER_URL =
	process.env.NEXT_PUBLIC_REE_INDEXER_URL ??
	'https://ree-hasura-testnet.omnity.network/v1/graphql'
