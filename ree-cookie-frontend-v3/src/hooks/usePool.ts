import { useQuery } from '@tanstack/react-query'
import { richOrdiActor } from 'canister/rich_ordi/actor'
import type { PoolBasic, PoolInfo } from 'canister/rich_ordi/service.did'

export function usePool(pool_address: string | undefined) {
	return useQuery<PoolInfo>({
		enabled: !!pool_address,
		queryKey: ['pool', pool_address],
		queryFn: async () =>
			richOrdiActor
				.get_pool_info({
					pool_address: pool_address!
				})
				.then(res => {
					if (res.length === 0) {
						throw new Error('Pool not found')
					}
					return res[0]
				}),
		retry: 3,
		refetchInterval: 5 * 60 * 1000 // Refetch every 5 minute
	})
}

export function usePoolList() {
	return useQuery<PoolBasic[]>({
		queryKey: ['pool_list'],
		queryFn: async () => richOrdiActor.get_pool_list(),
		retry: 3,
		refetchInterval: 5 * 60 * 1000 // Refetch every 5 minute
	})
}

// should add pool address param
export function usePoolInfo(pool_address: string | undefined) {
	return useQuery<PoolInfo>({
		enabled: !!pool_address,
		queryKey: ['pool_info', pool_address],
		queryFn: async () => {
			// getTestPoolInfo()
			const pool_info_opt = await richOrdiActor.get_pool_info({
				pool_address: pool_address!
			})
			if (pool_info_opt.length === 0) {
				throw new Error('Pool not found')
			}
			return pool_info_opt[0]
		},
		retry: 3,
		refetchInterval: 5 * 60 * 1000 // Refetch every 5 minute
	})
}
