import type { ActorSubclass, Identity } from '@dfinity/agent'
import { Actor, HttpAgent } from '@dfinity/agent'
import { ICP_HOST } from '../../constants/common'
import type { _SERVICE as RichOrdiService } from './service.did'
import { idlFactory } from './service.did'

const RICH_ORDI_CANISTER_ID = 'ix77r-oyaaa-aaaao-qkbwa-cai'

export type NftStatusName = 'EndAuction' | 'PreAuction' | 'Settled' | 'UnderAuction'

export const richOrdiActor = Actor.createActor<RichOrdiService>(idlFactory, {
	agent: HttpAgent.createSync({
		host: ICP_HOST
	}),
	canisterId: RICH_ORDI_CANISTER_ID
})

export function cookieActorWithIdentity(
	identity: Identity
): ActorSubclass<RichOrdiService> {
	return Actor.createActor<RichOrdiService>(idlFactory, {
		agent: HttpAgent.createSync({
			host: ICP_HOST,
			identity
		}),
		canisterId: RICH_ORDI_CANISTER_ID
	})
}

// export async function getTestPool(): Promise<RichOrdiPoolInfo> {
// 	const states = await richOrdiActor.get_states()
// 	const last_state = states.at(-1)
// 	const pools = await richOrdiActor.get_pool_list()
// 	const last_pool = pools.at(-1)
// 	return {
// 		pool_basic: last_pool!,
// 		rune_id: '78831:50',
// 		nft_collection: '',
// 		last_state: last_state!
// 	}
// }

// export async function getTestPoolInfo(): Promise<PoolInfo> {
// 	const pool_info_opt = await richOrdiActor.get_pool_info({
// 		pool_address:
// 			'tb1ptw2fuxe02rt3l3gs57jfgdgjn93hwuqqfpuu0sm8dr5v5gr8gwts8wkwvc'
// 	})
// 	if (pool_info_opt.length === 0) {
// 		throw new Error('Pool not found')
// 	}
// 	return pool_info_opt[0]
// }
