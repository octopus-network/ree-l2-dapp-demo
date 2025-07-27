'use client'

import { useAtom, useSetAtom } from 'jotai'

import { connectWalletModalOpenAtom } from '../store/connect-wallet-modal'
import { Image, Modal, Skeleton, Typography, notification } from 'antd'
import { cn } from '../utils/common'
import type { ProviderType } from '@omnisat/lasereyes'
import {
	MAGIC_EDEN,
	OKX,
	PHANTOM,
	UNISAT,
	XVERSE,
	useLaserEyes
} from '@omnisat/lasereyes'
import { useCallback, useMemo, useState } from 'react'
import { WALLETS } from '../constants/wallet'

const { Text, Link } = Typography

// import { connectWalletModalOpenAtom } from "@/store/connect-wallet-modal";

// import { connectWalletModalOpenAtom } from "@/store/connect-wallet-modal-open";
// import { WALLETS } from "@/lib/constants/wallet";

export function ConnectWalletModal() {
	const [connectWalletModalOpen, setConnectWalletModalOpen] = useAtom(
		connectWalletModalOpenAtom
	)

	return (
		<Modal
			title='Connect a Wallet'
			open={connectWalletModalOpen}
			className='max-w-md'
			onClose={() => setConnectWalletModalOpen(false)}
			onCancel={() => setConnectWalletModalOpen(false)}
		>
			<div className='p-5 pt-0'>
				<div className='text-lg font-semibold'>Supported Wallets</div>
				<div className='mt-3 flex flex-col gap-1'>
					{Object.keys(WALLETS).map(wallet => (
						<WalletRow wallet={wallet as ProviderType} key={wallet} />
					))}
				</div>
				<div className='text-muted-foreground mt-4 flex items-center text-xs'>
					<Text type='warning'>
						To use RichOrdi, you need to connect a wallet
					</Text>
				</div>
			</div>
		</Modal>
	)
}

function WalletRow({ wallet }: { wallet: ProviderType }) {
	const {
		connect,
		isConnecting,
		hasOkx,
		hasUnisat,
		hasPhantom,
		hasXverse,
		hasMagicEden
	} = useLaserEyes()


	const [connectingWallet, setConnectingWallet] = useState<string>()
	const setConnectWalletModalOpen = useSetAtom(connectWalletModalOpenAtom)

	const installed = useMemo(() => {
		const hasInstalled: Record<string, boolean> = {
			[UNISAT]: hasUnisat,
			[OKX]: hasOkx,
			[PHANTOM]: hasPhantom,
			[MAGIC_EDEN]: hasMagicEden,
			[XVERSE]: hasXverse
		}

		return hasInstalled[wallet]
	}, [wallet, hasXverse, hasOkx, hasUnisat, hasPhantom, hasMagicEden])

	const onConnectWallet = useCallback(async () => {
		// if (!installed) {
		//   window.open(WALLETS[wallet].url, "_blank");
		//   return;
		// }
		setConnectingWallet(wallet)

		try {
			console.log({ wallet })
			await connect(wallet)
			setConnectWalletModalOpen(false)
			setConnectingWallet(undefined)
		} catch (error) {
			console.log(error)
			setConnectingWallet(undefined)
		}
	}, [
		setConnectingWallet,
		setConnectWalletModalOpen,
		connect,
		wallet,
		installed
	])

	return (
		<div
			className={cn(
				'bg-secondary/70 hover:bg-secondary flex cursor-pointer items-center justify-between px-3 py-2 first:rounded-t-lg last:rounded-b-lg',
				isConnecting &&
					connectingWallet !== wallet &&
					'pointer-events-none opacity-50'
			)}
			onClick={onConnectWallet}
		>
			<div className='flex items-center'>
				<div className='flex size-10 items-center justify-center'>
					{connectingWallet === wallet ? (
						<Skeleton />
					) : (
						<Image
							src={WALLETS[wallet].icon}
							className='size-4 rounded-lg'
							alt={WALLETS[wallet].name}
						/>
					)}
				</div>
				<span className='ml-2 text-lg font-semibold'>
					{WALLETS[wallet].name}
				</span>
			</div>
			{installed ? (
				<span className='text-muted-foreground/80 text-xs'>Detected</span>
			) : null}
		</div>
	)
}
