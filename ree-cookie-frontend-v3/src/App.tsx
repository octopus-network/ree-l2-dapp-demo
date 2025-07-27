import { AuctionModal } from 'components/AuctionModal'
import { DepositNftModal } from 'components/DepositNftModal'
import { InvokeModal } from 'components/InvokeModal'
import LoadingOrError from 'components/LoadingOrError'
import { LockNftListModal } from 'components/LockNftListModal'
import { useAtom } from 'jotai'
import { Topbar } from 'layout/Topbar'
import { IntentionUpdater, intentionsAtom } from 'layout/sidebar/IntentionList'
import moment from 'moment'
import { Debug } from 'pages/Debug'
import { Home } from 'pages/Home'
import { Pool } from 'pages/Pool'
import { Pools } from 'pages/Pools'
import { Profile } from 'pages/Profile'
import type { ReactElement } from 'react'
import { Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

moment.locale('en');

export default function App(): ReactElement {
	// const [invokeModalOpen, setInvokeModalOpen] = useAtom(invokeModalOpenAtom)

	const [intentions, setIntentions] = useAtom(intentionsAtom)

	return (
		<div className='flex flex-col'>
			<BrowserRouter>
				<Suspense fallback={<LoadingOrError />}>
					<Topbar />
					<Routes>
						<Route path='/' element={<Home />} />
						<Route path='/pools' element={<Pools />} />
						<Route path='/profile/:address' element={<Profile />} />
						<Route path='/debug/:address' element={<Debug />} />
						{/* <Route path='/pool/:address' element={<Pool />} /> */}
						{/* <Route path=':fruitName' element={<Details />} /> */}
					</Routes>
				</Suspense>
			</BrowserRouter>
			<LockNftListModal />
			<AuctionModal />
			<DepositNftModal />
			<InvokeModal />
			<IntentionUpdater />
		</div>
	)
}
