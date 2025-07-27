import { PoolNftList } from 'components/PoolNftList'
import { usePool } from 'hooks/usePool'
import { usePoolNfts } from 'hooks/usePoolNfts'
import { useEffect } from 'react'
import { useParams } from 'react-router-dom'

export function Pool() {
	const { address } = useParams()

	const { data: poolInfo, isLoading, error: getPoolError } = usePool(address)
	// const {data: poolNfts, isLoading: isPoolNftsLoading, error: getPoolNftsError} = usePoolNfts(address)

	if (!address) {
		return <div>Pool address not found</div>
	}

	if (getPoolError) {
		return <div>{getPoolError.message}</div>
	}

	// if (getPoolNftsError) {
	//   return <div>{getPoolNftsError.message}</div>
	// }

	if (isLoading) {
		return <div>Loading...</div>
	}

	if (!poolInfo) {
		return <div>Pool not found</div>
	}

	return (
		<div>
			<PoolNftList
				poolBasic={{
					address: address,
					name: poolInfo.name
				}}
			/>
		</div>
	)
}
