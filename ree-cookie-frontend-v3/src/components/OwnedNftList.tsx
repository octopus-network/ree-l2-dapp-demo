import { useLaserEyes } from '@omnisat/lasereyes'
import { Button, Card, List, Skeleton } from 'antd'
import { useOwnerInscriptionListWithInfiniteScrollQueryByOrdiscan } from 'api/ordiscan'
import {
	DepositNftModal,
	setInscriptionAndPoolThenOpenDepositModalAtom
} from './DepositNftModal'
import { useState } from 'react'
import { useSetAtom } from 'jotai'
import { Inscription } from 'types/inscription'
import { useConfirmedInscriptionList } from 'hooks/useInscription'
import type { UnisatInscriptionItem } from '../api/unisat'
import { inscriptionImgUrlFromUnisat } from '../api/unisat'
import { PoolInfo } from 'canister/rich_ordi/service.did'
import { InscriptionImg } from './InscriptionImg'

export function OwnedNfts({ address }: { address: string }) {
	// let {
	//   data: inscriptions,
	//   isLoading,
	//   isError,
	//   error,
	//   fetchNextPage,
	//   hasNextPage,
	//   isFetchingNextPage,
	// } = useOwnerInscriptionListWithInfiniteScrollQueryByOrdiscan(address)

	const {
		data: inscriptions,
		isLoading,
		isError,
		error,
	} = useConfirmedInscriptionList(address)

	return (
		<div>
			{isLoading ? (
				<Skeleton />
			) : (
				<div>
					{/* <NftList
						nfts={inscriptions ?? []}
					/> */}
				</div>
			)}
		</div>
	)
}

export function NftList({
	nfts,
	poolInfo
}: {
	nfts: UnisatInscriptionItem[]
	poolInfo: PoolInfo
}) {

	console.log("nft list", { nfts, poolInfo })

	const setInscriptionAndPoolThenOpenModal = useSetAtom(
		setInscriptionAndPoolThenOpenDepositModalAtom
	)

	return (
		<div>
			<List
				bordered
				size='small'
				grid={{ gutter: 4, column: 4 }}
				dataSource={nfts}
				renderItem={item => (
					<List.Item>
						<Card
							size='small'
							cover={
								<InscriptionImg
									inscriptionId={item.inscriptionId}
								/>
							}
						>
							<Card.Meta title={
								<p className='text-xs'>
									#{item.inscriptionNumber}
								</p>}
							/>
						</Card>
						<Button
							onClick={async () => {
								// setInscription(item)
								// const pool = await getTestPoolInfo()
								setInscriptionAndPoolThenOpenModal(item, poolInfo)
								// setDepositNftModalOpen(true)
							}}
						>
							Lock
						</Button>
					</List.Item>
				)}
			/>
		</div>
	)
}
