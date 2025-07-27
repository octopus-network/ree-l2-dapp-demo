import { useQuery } from '@tanstack/react-query'
import { ocActor } from 'canister/orchestrator/actor'
import type { OrchestratorStatus } from 'canister/orchestrator/service.did'

export function useFeeRate() {
	return useQuery<bigint>({
		queryKey: ['o_fee_rate'],
		queryFn: async () =>
			ocActor
				.get_status()
				.then((res: OrchestratorStatus) => res.mempool_tx_fee_rate.medium),
		retry: 3,
		refetchInterval: 60 * 1000 // Refetch every 1 minute
	})
}

export function useOrchestratorStatus() {
	return useQuery<OrchestratorStatus>({
		queryKey: ['orchestrator_status'],
		queryFn: async () => ocActor.get_status(),
		retry: 3,
		refetchInterval: 60 * 1000 // Refetch every 1 minute
	})
}