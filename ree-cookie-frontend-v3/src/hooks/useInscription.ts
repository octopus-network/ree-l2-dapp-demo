import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import type { PaginatedResponse } from '../types'
import type { UnisatInscriptionItem } from '../api/unisat'
import {
	GetInscriptionListData,
	UnisatApiResponse,
	getFirst200InscriptionList,
	getInscriptionList
} from '../api/unisat'
import { getLatestBlockHeight } from 'api/chain-api'
import { getBtcLatestHeight } from 'api/mempool'
import { getInscriptionListOf } from 'api/magicEden'

export function useInscriptionCollectionList(
	collection: string | undefined
) {
	return useQuery({
		queryKey: ["inscription-collection-list", collection],
		queryFn: async () => {
			if (!collection) {
				return []
			}
			return await getInscriptionListOf(collection)
		},
		refetchInterval: 60 * 1000, // Refetch every 60 s
	})
}

export function useConfirmedInscriptionList(
	address: string | undefined,
) {

	return useQuery<UnisatInscriptionItem[]>({
		enabled: !!address,
		queryKey: [
			"confirmed_inscription_list", address
		],
		queryFn: async () => {
			const latestHeight = await getBtcLatestHeight()
			return (await getFirst200InscriptionList(address!))
				.filter(item => item.height <= latestHeight)
		},
		refetchInterval: 15 * 1000, // Refetch every 30 s
	})
}

export function useInscriptionListWithInfiniteScrollQueryByUnisat(
	address: string | undefined
) {
	return useInfiniteQuery<PaginatedResponse<UnisatInscriptionItem>>({
		enabled: !!address,
		initialPageParam: 0,
		queryKey: [
			`${import.meta.env.VITE_UNISAT_OPEN_API_URL}/v1/indexer/address/${address}/inscription-data`
		],
		queryFn: async ({ pageParam }) => {
			const r = await getInscriptionList(address!, pageParam as number, 100)
			return {
				items: r.data.inscription,
				page: pageParam as number,
				pageSize: r.data.inscription.length,
				nextPage: r.data.cursor + 1,
				total: r.data.total,
				hasMore: r.data.inscription.length == 100
			}
		},
		getNextPageParam: (lastPage, allPages) => lastPage.nextPage
	})
}
