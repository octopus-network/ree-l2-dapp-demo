import { useQuery } from '@tanstack/react-query'
import type { UnisatRuneInfoData } from 'api/unisat'
import { UnisatApiResponse, getRunesInfoByUnisat } from 'api/unisat'
import { PoolInfo } from 'canister/rich_ordi/service.did'
import { parsePoolName } from 'utils/common'

export function useRunesInfo(runeId: string | undefined) {
	return useQuery<UnisatRuneInfoData>({
		enabled: !!runeId,
		queryKey: ['rune_info', runeId],
		queryFn: async () => getRunesInfoByUnisat(runeId!),
		refetchInterval: 24 * 60 * 60 * 1000 // Needn't refetch
	})
}
