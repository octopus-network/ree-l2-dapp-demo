import { InfiniteData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { Ordiscan } from 'ordiscan'
import type { PaginatedResponse } from 'types'
import type { Inscription } from 'types/inscription'

const ordiscan = new Ordiscan('425ee266-4f5b-4c35-a2a4-d020f50f0ca0')

export function useOwnerInscriptionListWithInfiniteScrollQueryByUnisat() {}

export function useOwnerInscriptionListWithInfiniteScrollQueryByOrdiscan(
	address: string | undefined
) {
	return useInfiniteQuery<PaginatedResponse<Inscription>>({
		enabled: !!address,
		initialPageParam: 1,
		queryKey: ['ordiscan', 'list', address],
		queryFn: async ({ pageParam: pageParameter = 1 }) => {
			const r: Inscription[] = await ordiscan.address.getInscriptions({
				address: address!,
				page: pageParameter as number
			})
			return {
				items: r,
				page: pageParameter as number,
				pageSize: r.length,
				nextPage: r.length == 100 ? (pageParameter as number) + 1 : undefined,
				total: undefined,
				hasMore: r.length == 100
			}
		},
		getNextPageParam: (lastPage, allPages) => lastPage.nextPage,
		refetchInterval: 5 * 60 * 1000 // Refetch every minute
	})
}
