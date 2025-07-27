import { useQuery } from '@tanstack/react-query'
import { getBtcLatestHeight } from 'api/mempool'

export function useLatestBlock() {
	return useQuery({
		queryKey: ['mempool', '/api/blocks/tip/height'],
		queryFn: async () => getBtcLatestHeight(),
    refetchInterval: 60 * 1000, // Refetch every minutes
	})
}
