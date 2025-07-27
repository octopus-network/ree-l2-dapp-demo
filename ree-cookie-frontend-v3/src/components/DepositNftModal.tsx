import { OKX, useLaserEyes } from '@omnisat/lasereyes'
import { Button, Modal, Skeleton, Typography, notification } from 'antd'
import type { UnisatInscriptionItem } from 'api/unisat'
import { convertUnisatUtxo, inscriptionImgUrlFromUnisat } from 'api/unisat'
import { ocActor } from 'canister/orchestrator/actor'
import type { OrchestratorStatus } from 'canister/orchestrator/service.did'
import { richOrdiActor } from 'canister/rich_ordi/actor'
import type { PoolInfo } from 'canister/rich_ordi/service.did'
import { useExchangeConfig } from 'hooks/useExchange'
import { useRunesInfo } from 'hooks/useRunes'
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai'
import { useAddIntentions } from 'layout/sidebar/IntentionList'
import { useAddSpentUtxos } from 'store/spent-utxos'
import type { UnspentOutput } from 'types'
import { AddressType } from 'types'
import { convertPoolUtxo, depositPsbt, getErrorMessage, parsePoolName } from 'utils'
import {
	invokeErrorMessageAtom,
	invokeModalOpenAtom,
	invokeModalTitleAtom,
	invokeStepAtom,
	invokeTxidAtom
} from './InvokeModal'
import { useCloseLockNftListModal } from './LockNftListModal'
import { InscriptionImg } from './InscriptionImg'
import { useLoginUserBtcUtxo } from 'hooks/useUtxo'

const { Link } = Typography

const depositNftModalOpenAtom = atom(false)
const depositModalInscriptionAtom = atom<UnisatInscriptionItem>()
const depositModalPoolAtom = atom<PoolInfo>()

const closeDepositModalAtom = atom(null, (get, set) => {
	set(depositNftModalOpenAtom, false)
})

export const setInscriptionAndPoolThenOpenDepositModalAtom = atom(
	null,
	(get, set, inscription: UnisatInscriptionItem, pool: PoolInfo) => {
		set(depositModalInscriptionAtom, inscription)
		set(depositModalPoolAtom, pool)
		set(depositNftModalOpenAtom, true)
	}
)

export function DepositNftModal() {
	const {
		publicKey,
		paymentPublicKey,
		paymentAddress,
		address,
		signPsbt,
		provider
	} = useLaserEyes()
	const {data: userBtcUtxos} = useLoginUserBtcUtxo()
	const [api, contextHolder] = notification.useNotification()
	const inscription = useAtomValue(depositModalInscriptionAtom)
	const poolInfo = useAtomValue(depositModalPoolAtom)
	const closeModal = useSetAtom(closeDepositModalAtom)
	const closeStakeModal = useCloseLockNftListModal()
	const depositNftModalOpen = useAtomValue(depositNftModalOpenAtom)

	const setInvokeModalOpen = useSetAtom(invokeModalOpenAtom)
	const [stepIndex, setStepIndex] = useAtom(invokeStepAtom)
	const setInvokeModalTitle = useSetAtom(invokeModalTitleAtom)
	const setInvokeTxid = useSetAtom(invokeTxidAtom)
	const setInvokeErrorMessage = useSetAtom(invokeErrorMessageAtom)
	const addSpentUtxos = useAddSpentUtxos()
	const addIntentions = useAddIntentions()

	// todo: add loading state
	const {
		data: exchangeConfig,
		isLoading: isLoadingExchangeConfig,
		error: errorOfExchangeConfig
	} = useExchangeConfig()
	const {
		data: runeInfo,
		isLoading: isLoadingRuneInfo,
		error: errorOfRuneInfo
	} = useRunesInfo(poolInfo ? parsePoolName(poolInfo.name).runeId : undefined)

	// const [depositNftModalOpen, setDepositNftModalOpen] = useAtom(
	//   depositNftModalOpenAtom
	// );

	const modalContent = () => {
		if (inscription === undefined) {
			return 'No inscription data found'
		}

		if (isLoadingExchangeConfig || isLoadingRuneInfo) {
			return <Skeleton />
		}

		if (errorOfExchangeConfig) {
			return <div>{errorOfExchangeConfig.message}</div>
		}

		if (errorOfRuneInfo) {
			return <div>{errorOfRuneInfo.message}</div>
		}

		if (exchangeConfig === undefined) {
			return <div>Exchange Config Not Found</div>
		}

		if (runeInfo === undefined) {
			return <div>Rune Info Not Found</div>
		}

		return (
			<div>
				{contextHolder}
				<h2>
					Stake #{inscription.inscriptionNumber} in {poolInfo?.name} to earn{' '}
					{exchangeConfig.rune_offering.toString()}
					{runeInfo.symbol} {runeInfo.spacedRune}
				</h2>

				<InscriptionImg
					inscriptionId={inscription.inscriptionId}
				/>

				<Button
					disabled={poolInfo === undefined}
					onClick={async () => {
				
						const exchange_config = await richOrdiActor.get_config()
						const recommendedFeeRate = await ocActor
							.get_status()
							.then((res: OrchestratorStatus) => res.mempool_tx_fee_rate.medium)
							.catch(error => {
								console.log('get recommendedFeeRate error', error)
								throw error
							})

						const runeId = poolInfo!.coin_reserved[0].id

						const inscriptionTxid = inscription.utxo.txid
						const inscriptionVout = inscription.utxo.vout

						try {
							closeStakeModal()
							closeModal()
							setInvokeModalTitle('Deposit NFT')
							setStepIndex(0)
							setInvokeModalOpen(true)

							if(userBtcUtxos===undefined || userBtcUtxos.length === 0) {
								throw new Error('No user BTC UTXOs found')
							}

							let genPsbtRes = await depositPsbt({
								runeIdStr: runeId,
								nftUtxo: {
									txid: inscriptionTxid,
									vout: inscriptionVout,
									satoshis: inscription.utxo.satoshi.toString(),
									scriptPk: inscription.utxo.scriptPk,
									pubkey: '',
									addressType: AddressType.P2TR,
									address: inscription.utxo.address,
									runes: []
								} as UnspentOutput,
								poolUtxo: convertPoolUtxo(poolInfo!.utxos[0], poolInfo!.key),
								userBtcUtxos: (userBtcUtxos??[]).map(e=>convertUnisatUtxo(e, paymentPublicKey)),
								userAddress: address,
								paymentAddress,
								poolName: poolInfo!.name,
								poolAddress: poolInfo!.address,
								userReceiveRuneAmount: exchange_config.rune_offering,
								feeRate: Number(recommendedFeeRate.toString()),
								nonce: poolInfo!.nonce,
								inscriptionId: inscription.inscriptionId
							})

							setStepIndex(1)

							console.log({ stepIndex })

							// 2. user sign psbt
							let signedPsbtHex = undefined
							if (provider === OKX) {
								// console.log("is okx wallet", toSignInputs, toSpendUtxos);
								const psbtHex = genPsbtRes.psbt.toHex()

								signedPsbtHex = await window.okxwallet.bitcoin.signPsbt(psbtHex, {
									toSignInputs: genPsbtRes.toSignInputs,
									autoFinalized: false
								})
								console.log(signedPsbtHex)
							} else {
								const psbtBase64 = genPsbtRes.psbt.toBase64()
								const res = await signPsbt(psbtBase64)
								signedPsbtHex = res?.signedPsbtHex
							}

							if (signedPsbtHex === undefined) {
								throw new Error('Failed to sign psbt')
							}

							setStepIndex(2)

							// 3. invoke
							await ocActor
								.invoke({
									intention_set: genPsbtRes.intentionSet,
									initiator_utxo_proof: [],
									psbt_hex: signedPsbtHex
								})
								.then(async res => {
									if ('Err' in res) {
										throw new Error(res.Err)
									}
									return res.Ok
								})
								.then((txid: string) => {
									addIntentions(genPsbtRes.intentionRecords)
									addSpentUtxos(genPsbtRes.toSpendUtxos)
									setInvokeTxid(txid)
									setStepIndex(3)
								})
						} catch (e: any) {
							console.log("invoke error: ", e)
							setInvokeErrorMessage(getErrorMessage(e))
						}

					}}
				>
					Confirm
				</Button>
			</div>
		)
	}

	console.log({ inscription })

	return (
		<Modal
			title='Stake Confirm'
			open={depositNftModalOpen}
			onClose={() => closeModal()}
			onCancel={() => closeModal()}
			footer={null}
		>
			{modalContent()}
		</Modal>
	)
}
