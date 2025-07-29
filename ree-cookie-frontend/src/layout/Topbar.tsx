import { UNISAT, useLaserEyes } from '@omnisat/lasereyes'
// import { AccountButton } from "../account-button";
import { useEffect, useState } from 'react'
// import { MenuButton } from "./menu-button";
import { AccountButton } from '../components/AccountButton'
import ConnectButton from '../components/ConnectButton'
import { Button, Skeleton } from 'antd'
import { Link } from 'react-router-dom'
import { useSiwbIdentity } from 'ic-siwb-lasereyes-connector'

export function Topbar() {
	const { address } = useLaserEyes()

	const { identityAddress } = useSiwbIdentity()

	return (
		<div 
		className='mb-4 mt-8 px-2 flex w-full justify-between'
		>
			<Link to='/'>
			<p
				className='text-2xl font-bold text-orange-500 hover:text-orange-600 transition-colors'
			>Ree Cookie</p>
				{/* <img src='/logo.png' alt='Logo' className='mx-6 h-20' /> */}
			</Link>

			<div className='mr-2'>
				{address ? (
					<AccountButton />
				) : (
					<ConnectButton />
				)}
			</div>
		</div>
	)
}
