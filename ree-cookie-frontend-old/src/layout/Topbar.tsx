import { useLaserEyes } from '@omnisat/lasereyes'
// import { AccountButton } from "../account-button";
// import { MenuButton } from "./menu-button";
import { AccountButton } from '../components/AccountButton'
import ConnectButton from '../components/ConnectButton'
import { Link } from 'react-router-dom'

export function Topbar() {
	const { address } = useLaserEyes()

	return (
		<div 
		className='mb-4 mt-8 px-2 flex w-full justify-between'
		>
			<Link to='/'>
			<p
				className='text-2xl font-bold text-orange-500 hover:text-orange-600 transition-colors'
			>Ree Cookie</p>
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
