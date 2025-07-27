import { useState } from 'react'
import { Button } from 'antd'
import { useAtom } from 'jotai'
import { useSiwbIdentity } from 'ic-siwb-lasereyes-connector';
import { UNISAT, useLaserEyes } from '@omnisat/lasereyes';
import { connectWalletModalOpenAtom } from './ConnectDialog';

export default function ConnectButton() {
// 	const p = useLaserEyes();

//   const {
//     prepareLogin,
//     isPrepareLoginIdle,
//     prepareLoginError,
//     loginError,
//     setLaserEyes,
//     login,
//     getAddress,
//     getPublicKey,
//     connectedBtcAddress,
//     identity,
//     identityPublicKey,
//   } = useSiwbIdentity();
	const [connectWalletModalOpen, setConnectWalletModalOpen] = useAtom(
		connectWalletModalOpenAtom
	)

	const handleClick = async () => {
		// if (isConnecting) return;
		setConnectWalletModalOpen(true)

		// ts ignore
		// @ts-ignore
		// await setLaserEyes(p, UNISAT);
		
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
		</>
	)
}
