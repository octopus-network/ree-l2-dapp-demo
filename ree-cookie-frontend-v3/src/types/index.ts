import type { PoolBasic, PoolState } from 'canister/rich_ordi/service.did'

export * from './coin'
export * from './utxo'
export * from './exchange'
export * from './transaction'
export * from './orchestrator'

export interface PaginatedResponse<T> {
	items: T[]
	page: number
	pageSize: number
	nextPage: number | undefined
	total: number | undefined
	hasMore: boolean
}

export interface RichOrdiPoolInfo {
	pool_basic: PoolBasic
	rune_id: string
	nft_collection: string
	last_state: PoolState
}
