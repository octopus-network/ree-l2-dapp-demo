import { UNISAT, useLaserEyes } from '@omnisat/lasereyes'
// import { AccountButton } from "../account-button";
import { useEffect, useState } from 'react'
// import { MenuButton } from "./menu-button";
import { AccountButton } from '../components/AccountButton'
import ConnectButton from '../components/ConnectButton'
import { Button, Skeleton } from 'antd'
import { Link } from 'react-router-dom'

export function Topbar() {
	const { address, connect, signMessage } = useLaserEyes()

	return (
		<div className='mb-4 mt-8 px-2 flex w-full justify-between'>
			<Link to='/'>
				<img src='/logo.png' alt='Logo' className='mx-6 h-20' />
			</Link>

			<div className='mr-2'>
				{address ? (
					// <Button
					//   className="rounded-lg border-2 border-blue-500 bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 hover:border-blue-600 transition-colors"
					//   onClick={() => connect(UNISAT)}
					// >
					//   Connect wallet
					// </Button>
					<AccountButton />
				) : (
					<ConnectButton />
				)}
			</div>
		</div>
	)
}
