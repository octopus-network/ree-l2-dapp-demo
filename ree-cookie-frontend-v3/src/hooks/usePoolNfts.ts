import { useQuery } from '@tanstack/react-query'
import { richOrdiActor } from 'canister/rich_ordi/actor'
import type { GetNftsResp } from 'canister/rich_ordi/service.did'
import { PoolInfo } from 'canister/rich_ordi/service.did'

export function usePoolNfts(pool_address: string | undefined) {
	return useQuery<GetNftsResp[]>({
		enabled: !!pool_address,
		queryKey: ['pool_nfts', pool_address],
		queryFn: async () => {
			return richOrdiActor
				.get_nfts({
					pool_address: [pool_address!],
					status: [],
					start: [BigInt(0)],
					length: [BigInt(100)],
					depositor: [],
					bidder: []
				})
				.then(res => {
					if ('Ok' in res) {
						return res.Ok
					}
					throw new Error(`get nfts from ${pool_address} error: ${res.Err}`)
				})
		},
		retry: 3,
		refetchInterval: 5 * 60 * 1000 // Refetch every 5 minute
	})
}
