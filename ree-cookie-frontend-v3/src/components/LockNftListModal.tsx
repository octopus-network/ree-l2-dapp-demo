import { useLaserEyes } from '@omnisat/lasereyes'
import { Modal, Skeleton, Spin } from 'antd'
import { useConfirmedInscriptionList, useInscriptionCollectionList } from 'hooks/useInscription'
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai'
import { NftList } from './OwnedNftList'
import { PoolInfo } from 'canister/rich_ordi/service.did'
import { useMemo } from 'react'
import { parsePoolName } from 'utils'

const lockNftListModalPoolAtom = atom<PoolInfo>()
const locNftListModalOpenAtom = atom(false)
const closeLockNftListModalAtom = atom(null, (get, set) => {
	set(locNftListModalOpenAtom, false)
})

export const useCloseLockNftListModal = () => {
	const closeStakeModal = useSetAtom(closeLockNftListModalAtom)
	return closeStakeModal
}

export const setPoolInfoThenOpenLockNftListModalAtom = atom(
	null,
	(get, set, pool: PoolInfo) => {
		console.log('set pool', pool)
		set(lockNftListModalPoolAtom, pool)
		set(locNftListModalOpenAtom, true)
	}
)

export function LockNftListModal() {
	const [stakeModalOpen, setStakeModalOpen] = useAtom(locNftListModalOpenAtom)
	const poolInfo = useAtomValue(lockNftListModalPoolAtom)

	const collection = useMemo(() => {
		if (!poolInfo) {
			return undefined
		}
		return JSON.parse(poolInfo.attributes)?.collection_name
	}, [poolInfo])

	const { publicKey, paymentPublicKey, paymentAddress, address, signPsbt } =
		useLaserEyes()

	const {
		data: inscriptions,
		isLoading,
		isError,
		error,
	} = useConfirmedInscriptionList(address)

	const { data: inscriptionList } = useInscriptionCollectionList(collection)

	const filteredInscriptions = useMemo(() => {
		console.log('filteredInscriptions', { inscriptions, inscriptionList, poolInfo, collection })
		// if doge pool not filter
		if (poolInfo && poolInfo.name === '78831:50|dogs') {
			console.log('not filter')
			return inscriptions
		}
		// return (inscriptions ?? []).filter((inscription) => {
		// 	return (inscriptionList?.some((inscriptionId) => {
		// 		return inscriptionId === inscription.inscriptionId
		// 	})) ?? false
		// })
		return inscriptions ?? []
	}, [inscriptions, inscriptionList, poolInfo])

	const content = () => {
		console.log({ paymentAddress })
		if (paymentAddress === '' || paymentAddress === undefined) {
			return <div className='m-4 text-red-500 font-bold'>Please Login First</div>
		}
		if (isLoading) {
			return <Spin />
		}
		if (error) {
			return <div>{error.message}</div>
		}
		if (inscriptions === undefined || inscriptions.length === 0) {
			return <NoNft />
		}
		if (poolInfo === undefined) {
			return <Skeleton />
		}

		return (
			<NftList poolInfo={poolInfo} nfts={filteredInscriptions || []} />
		)
	}

	return (
		<Modal
			title='Select You Inscription'
			open={stakeModalOpen}
			onClose={() => setStakeModalOpen(false)}
			onCancel={() => setStakeModalOpen(false)}
			footer={null}
		>
			<div className='flex'>Your Inscriptions in <p className='px-2 font-semibold text-orange-500'>{collection}</p></div>
			{content()}
		</Modal>
	)
}

function NoNft() {
	return <div>No NFTs found</div>
}
