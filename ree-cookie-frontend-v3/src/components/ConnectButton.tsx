import { useState } from 'react'
import { Button } from 'antd'
import { ConnectWalletModal } from './ConnetWalletModal'
import { useAtom } from 'jotai'
import { connectWalletModalOpenAtom } from '../store/connect-wallet-modal'

export default function ConnectButton() {
	const [connectWalletModalOpen, setConnectWalletModalOpen] = useAtom(
		connectWalletModalOpenAtom
	)

	const handleClick = async () => {
		// if (isConnecting) return;
		setConnectWalletModalOpen(true)
	}

	const buttonText = 'Connect Wallet'

	return (
		<>
			<button
				className='px-4 py-2 mr-4 text-sm font-medium rounded-sm bg-gradient-to-r from-orange-400 to-orange-500 text-black hover:-translate-y-1'
				onClick={handleClick}
			// loading={isConnecting}
			>
				{buttonText}
			</button>
			<ConnectWalletModal />
		</>
	)
}
