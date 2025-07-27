import { OKX, useLaserEyes } from '@omnisat/lasereyes'
import { Button, InputNumber, Modal, Spin, notification } from 'antd'
import { convertUnisatRuneUtxo, convertUnisatUtxo } from 'api/unisat'
import { ocActor } from 'canister/orchestrator/actor'
import type { OrchestratorStatus } from 'canister/orchestrator/service.did'
import {
	NftStatusName,
	richOrdiActor
} from 'canister/rich_ordi/actor'
import type { GetNftsResp, PoolInfo } from 'canister/rich_ordi/service.did'
import { useExchangeConfig } from 'hooks/useExchange'
import { useLoginUserBtcUtxo, useLoginUserRuneUtxo } from 'hooks/useUtxo'
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai'
import { useAddIntentions } from 'layout/sidebar/IntentionList'
import { useMemo, useState } from 'react'
import { Minus, Plus } from 'react-feather'
import { useAddSpentUtxos } from 'store/spent-utxos'
import { convertPoolUtxo, getErrorMessage, parsePoolName } from 'utils'
import { auctionPsbt } from 'utils/tx-helper/auction'
import { InscriptionImg } from './InscriptionImg'
import {
	invokeErrorMessageAtom,
	invokeModalOpenAtom,
	invokeModalTitleAtom,
	invokeStepAtom,
	invokeTxidAtom
} from './InvokeModal'

const auctionModalOpenAtom = atom(false)
const auctionModalNftAtom = atom<GetNftsResp | undefined>()
const auctionModalPoolAtom = atom<PoolInfo>()

// const closeAuctionModalAtom = atom(null, (get, set) => {
// 	set(auctionModalOpenAtom, false)
// })

export const setNftAndPoolThenOpenAuctionModalAtom = atom(
	null,
	(get, set, nft: GetNftsResp, pool: PoolInfo) => {
		console.log("setNftAndPoolThenOpenAuctionModalAtom", { nft, pool })
		set(auctionModalNftAtom, nft)
		set(auctionModalPoolAtom, pool)
		set(auctionModalOpenAtom, true)
	}
)

export function AuctionModal() {
	const [bidValue, setBidValue] = useState<string | number | null>(-1)
	const [api, contextHolder] = notification.useNotification()
	const [auctionModalOpen, setAuctionModalOpen] = useAtom(auctionModalOpenAtom)
	const auctionModalNft = useAtomValue(auctionModalNftAtom)!
	const poolInfo = useAtomValue(auctionModalPoolAtom)
	const runeId = useMemo(() => {
		if (!poolInfo) {
			return undefined
		}
		return parsePoolName(poolInfo.name).runeId
	}, [poolInfo])

	// invoke modal atom
	const setInvokeModalOpen = useSetAtom(invokeModalOpenAtom)
	const [stepIndex, setStepIndex] = useAtom(invokeStepAtom)
	const setInvokeModalTitle = useSetAtom(invokeModalTitleAtom)
	const setInvokeTxid = useSetAtom(invokeTxidAtom)
	const setInvokeErrorMessage = useSetAtom(invokeErrorMessageAtom)
	const addSpentUtxos = useAddSpentUtxos()
	const addIntentions = useAddIntentions()

	const {
		publicKey,
		paymentPublicKey,
		paymentAddress,
		address,
		signPsbt,
		provider
	} = useLaserEyes()
	const { data: userBtcUtxos } = useLoginUserBtcUtxo()

	const { data: exchangeConfig, isLoading: isLoadingExchangeConfig } =
		useExchangeConfig()

	const { data: userRuneUtxos } = useLoginUserRuneUtxo(runeId)


	const {
		nftStatus,
		currentAuction,
		currentTopBidder,
		currentTopBidPrice,
		minBidValue
	} = useMemo(() => {
		if (!exchangeConfig || !auctionModalNft) {
			return {
				nftStatus: undefined,
				currentAuction: undefined,
				currentTopBidder: undefined,
				currentTopBidPrice: undefined,
				minBidValue: undefined
			}
		}
		const nftStatus: NftStatusName = Object.keys(
			auctionModalNft.status
		)[0] as NftStatusName

		let currentAuction = undefined
		let currentTopBidder: string | undefined = undefined
		let currentTopBidPrice = undefined
		if (auctionModalNft.nft.auction.length > 0) {
			currentAuction = auctionModalNft.nft.auction[0]
			currentTopBidder = currentAuction!.top_bidder!
			currentTopBidPrice = currentAuction?.bidders.find(
				e => e[0] === currentTopBidder
			)![1]!.amount!
		}

		const minBidValue =
			(currentTopBidPrice ?? BigInt(0)) + exchangeConfig.bid_increment
		setBidValue(Number(minBidValue))
		return {
			nftStatus,
			currentAuction,
			currentTopBidder,
			currentTopBidPrice,
			minBidValue
		}
	}, [exchangeConfig, auctionModalNft])

	if (!auctionModalNft || !exchangeConfig || !poolInfo) {
		return null
	}

	const bidButtonOnclick = async (userPayRuneAmount: bigint) => {
		{
			const exchange_config = await richOrdiActor.get_config()
			const recommendedFeeRate = await ocActor
				.get_status()
				.then((res: OrchestratorStatus) => res.mempool_tx_fee_rate.medium)
				.catch(error => {
					throw error
				})

			const runeId = poolInfo.coin_reserved[0].id
	

			const poolRuneUtxo = poolInfo!.utxos.find(
				u => u.coins.length > 0 && 
				!!u.coins.find(coin=>coin.id===runeId) 
			)!
			
			if (poolRuneUtxo === undefined) {
				// throw new Error('Pool Rune utxo not found')
				api.error({
					message: 'Error',
					description: 'Pool Rune utxo not found',
					placement: 'topRight',
					duration: 0
				})
				return
			}

			if (userRuneUtxos === undefined) {
				api.error({
					message: 'Error',
					description: 'Fetch User Rune Utxo Error',
					placement: 'topRight',
					duration: 0
				})
				return
			}

			try {
				setAuctionModalOpen(false)
				setInvokeModalTitle('Auction')
				setStepIndex(0)
				setInvokeModalOpen(true)
				let genPsbtRes = await auctionPsbt({
					runeIdStr: runeId,
					inscriptionId: auctionModalNft.nft.inscription_id,
					userRuneUtxo: userRuneUtxos!,
					poolRuneUtxo: convertPoolUtxo(poolRuneUtxo, poolInfo.key),
					userBtcUtxos: (userBtcUtxos ?? []).map(e => convertUnisatUtxo(e, paymentPublicKey)),
					paymentAddress,
					poolAddress: poolInfo.address,
					poolName: poolInfo.name,
					userPayRuneAmount: userPayRuneAmount,
					feeRate: Number(recommendedFeeRate.toString()),
					nonce: poolInfo.nonce,
					nftDepositId: auctionModalNft.deposit_id
				})

				setStepIndex(2)

				// 2. user sign psbt
				let signedPsbtHex = undefined
				if (provider === OKX) {
					const psbtHex = genPsbtRes.psbt.toHex()

					signedPsbtHex = await window.okxwallet.bitcoin.signPsbt(psbtHex, {
						toSignInputs: genPsbtRes.toSignInputs,
						autoFinalized: false
					})
				} else {
					const psbtBase64 = genPsbtRes.psbt.toBase64()
					const res = await signPsbt(psbtBase64)
					signedPsbtHex = res?.signedPsbtHex
				}

				if (signedPsbtHex === undefined) {
					throw new Error('Signed Psbt is undefined')
				}

				setStepIndex(2)

				// 3. invoke
				await ocActor
					.invoke({
						intention_set: genPsbtRes.intentionSet,
						initiator_utxo_proof: [],
						psbt_hex: signedPsbtHex
					})
					.then(res => {
						if ('Err' in res) {
							throw new Error(res.Err)
						}
						return res.Ok
					})
					.then(txid => {
						addIntentions(genPsbtRes.intentionRecords)
						addSpentUtxos(genPsbtRes.toSpendUtxos)
						setInvokeTxid(txid)
						setStepIndex(3)
					})

			} catch (e: any) {
				console.log("invoke error: ", e)
				setInvokeErrorMessage(getErrorMessage(e))
			}
		}
	}

	return <Modal
		title='Auction Confirm'
		open={auctionModalOpen}
		className='max-w-md'
		onClose={() => setAuctionModalOpen(false)}
		onCancel={() => setAuctionModalOpen(false)}
		footer={null}
	>
		<div className='flex flex-col items-center'>
			<div className='my-2 p-4'>
				<InscriptionImg
					inscriptionId={auctionModalNft.nft.inscription_id}
				// className='my-2 p-4'
				/>
			</div>


			{userBtcUtxos === undefined || userRuneUtxos === undefined ? (
				<Spin />
			) : nftStatus === 'PreAuction' ? (
				<button
					className='w-2/3 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 font-medium text-white shadow-md transition-all duration-200 hover:from-amber-400 hover:to-amber-500'
					onClick={() => bidButtonOnclick(exchangeConfig.starting_bid)}
				>
					Bid
				</button>
			) : (
				<div>
					<div className='flex flex-col items-center'>
						<p className='m-2 text-2xl text-blue-800'>
							Current Best Bid Price: {currentTopBidPrice?.toString()}
						</p>

						<InputNumber
							value={bidValue}
							onChange={setBidValue}
							status={
								Number(bidValue) < Number(minBidValue) ? 'error' : undefined
							}
							addonBefore={
								<Minus
									color='black'
									onClick={() =>
										setBidValue(
											Number(bidValue) - Number(exchangeConfig.bid_increment)
										)
									}
								/>
							}
							addonAfter={
								<Plus
									color='black'
									onClick={() =>
										setBidValue(
											Number(bidValue) + Number(exchangeConfig.bid_increment)
										)
									}
								/>
							}
							defaultValue={Number(minBidValue)}
							step={Number(exchangeConfig.bid_increment)}
						/>
						{Number(bidValue) < Number(minBidValue) && (
							<p className='text-md text-red-600'>
								The minimum bid value is {minBidValue!.toString()}
							</p>
						)}

						<Button
							className='w-2/3 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 font-medium text-white shadow-md transition-all duration-200 hover:from-amber-400 hover:to-amber-500'
							disabled={Number(bidValue) < Number(minBidValue)}
							onClick={() => {
								let loginAddressBid = currentAuction!.bidders.find(
									e => e[0] === address
								)?.[1]
								let lastPrice = loginAddressBid?.amount
								bidButtonOnclick(BigInt(bidValue!) - BigInt(lastPrice ?? 0))
							}}
						>
							Place Bid
						</Button>
					</div>
				</div>
			)}
		</div>

	</Modal>

}
