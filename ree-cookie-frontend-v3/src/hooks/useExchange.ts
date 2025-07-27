import { useQuery } from '@tanstack/react-query'
import { richOrdiActor } from 'canister/rich_ordi/actor'
import type { ExchangeCfg } from 'canister/rich_ordi/service.did'

export function useExchangeConfig() {
	return useQuery<ExchangeCfg>({
		queryKey: ['get_config'],
		queryFn: async () => richOrdiActor.get_config(),
		retry: 3,
		refetchInterval: 10 * 60 * 1000 // Refetch every 10 minute
	})
}
