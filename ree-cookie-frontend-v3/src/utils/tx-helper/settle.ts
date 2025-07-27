import * as bitcoin from 'bitcoinjs-lib'
import { ORDI_EXCHANGE_ID, estimate_min_tx_fee, ocActor } from 'canister/orchestrator/actor'
import { Edict, RuneId, Runestone, none } from 'runelib'
import { Transaction } from 'transaction'
import type { ToSignInput, TxOutputType, UnspentOutput } from 'types'
import { AddressType } from 'types'
import { addressTypeToString, getAddressType } from 'utils/address'
import { BITCOIN } from '../../constants/coin-list'
import { UTXO_DUST } from '../../constants/common'
import { Input } from 'bitcoinjs-lib/src/cjs/transaction'
import {
	InputCoin,
	IntentionSet,
	OutputCoin
} from 'canister/orchestrator/service.did'
import { GenPsbtResult, Outpoint } from './common'
import { IntentionRecord, SettleIntention, TransactionStatus } from 'layout/sidebar/IntentionList'

export async function settlePsbt({
	runeIdStr,
	poolRuneUtxo,
	poolInscriptionUtxo,
	inscriptionId,
	userBtcUtxos,
	paymentAddress,
	poolAddress,
	poolName,
	feeRate,
	nonce,
	nftDepositId,
	depositor_share,
	depositor_address,
	fee_collector_share,
	fee_collector_address,
	startBidPrice,
	finalBidPrice
}: {
	runeIdStr: string
	poolRuneUtxo: UnspentOutput
	poolInscriptionUtxo: UnspentOutput
	inscriptionId: string
	userBtcUtxos: UnspentOutput[]
	paymentAddress: string
	poolAddress: string
	poolName: string
	feeRate: number
	nonce: bigint
	nftDepositId: string
	depositor_share: number
	depositor_address: string
	fee_collector_share: number
	fee_collector_address: string
	startBidPrice: bigint
	finalBidPrice: bigint
}): Promise<GenPsbtResult> {
	const poolRune = poolRuneUtxo.runes.find(r => r.id == runeIdStr)
	if (!poolRune) {
		throw new Error('Pool rune not found')
	}

	const inputTypes: TxOutputType[] = []
	const outputTypes: TxOutputType[] = []

	const tx = new Transaction()
	tx.setFeeRate(feeRate)
	tx.setEnableRBF(false)
	tx.setChangeAddress(paymentAddress)

	// input 0: pool inscription utxo
	tx.addInput(poolInscriptionUtxo)
	inputTypes.push(addressTypeToString(getAddressType(poolAddress)))

	// input 1: pool rune utxo
	tx.addInput(poolRuneUtxo)
	inputTypes.push(addressTypeToString(getAddressType(poolAddress)))

	// // input 2-n: user btc utxo
	// let userBtcAmount = BigInt(0)
	// for (const utxo of userBtcUtxos) {
	// 	tx.addInput(utxo)
	// 	inputTypes.push(addressTypeToString(getAddressType(utxo.address)))
	// 	userBtcAmount += BigInt(utxo.satoshis)
	// }

	// output 0: edict

	// calculate the distribution of rune first
	const revenue = finalBidPrice - startBidPrice
	const depositorReceiveRuneAmount =
		(revenue * BigInt(depositor_share)) / BigInt(100)
	const feeCollectorReceiveRuneAmount =
		(revenue * BigInt(fee_collector_share)) / BigInt(100)

	const [runeBlock, runeIndex] = runeIdStr.split(':')
	const runeId = new RuneId(Number(runeBlock), Number(runeIndex))

	const edicts = []
	if (depositorReceiveRuneAmount > 0) {
		// depositor rune
		edicts.push(
			new Edict(runeId, depositorReceiveRuneAmount, 2)
		)
	}
	if (feeCollectorReceiveRuneAmount > 0) {
		// fee collector rune
		edicts.push(
			new Edict(runeId, feeCollectorReceiveRuneAmount, 3)
		)
	}
	// pool change rune
	let poolReceiveRuneAmount = BigInt(poolRune.amount) - depositorReceiveRuneAmount - feeCollectorReceiveRuneAmount
	edicts.push(
		new Edict(
			runeId,
			poolReceiveRuneAmount,
			4
		)
	)

	const runestone = new Runestone(edicts, none(), none(), none())
	const opReturnScript = runestone.encipher()

	tx.addScriptOutput(opReturnScript, BigInt(0))

	// Output1: transfer inscription to bidder
	tx.addOutput(paymentAddress, BigInt(546))
	outputTypes.push(addressTypeToString(getAddressType(depositor_address)))

	// Output2: transfer rune to depositor
	tx.addOutput(depositor_address, BigInt(546))
	outputTypes.push(addressTypeToString(getAddressType(depositor_address)))
	// Output3: transfer rune to fee collector
	tx.addOutput(fee_collector_address, BigInt(546))
	outputTypes.push(addressTypeToString(getAddressType(fee_collector_address)))
	// Output4: change rune for pool
	tx.addOutput(poolAddress, BigInt(546))
	outputTypes.push(addressTypeToString(getAddressType(poolAddress)))
	// Output5: user btc change
	outputTypes.push(addressTypeToString(getAddressType(paymentAddress)))

	// let fee = await ocActor
	//   .estimate_min_tx_fee({
	//     input_types: inputTypes,
	//     pool_address: [poolAddress],
	//     output_types: outputTypes
	//   })
	//   .then((res: { Err: string } | { Ok: bigint }) => {
	//     if ('Err' in res) {
	//       throw new Error(res.Err)
	//     }
	//     return res.Ok
	//   })
	//   .catch(error => {
	//     console.log('invoke error', error)
	//     throw error
	//   })

	// fee += fee

	userBtcUtxos.sort((a, b) => Number(b.satoshis) - Number(a.satoshis))

	let userBtcAmount = BigInt(0)
	let fee = BigInt(0)
	for (let i = 0; i < userBtcUtxos.length && i < 10; i++) {
		const utxo = userBtcUtxos[i]
		tx.addInput(utxo)
		inputTypes.push(addressTypeToString(getAddressType(utxo.address)))
		userBtcAmount += BigInt(utxo.satoshis)
		fee = await estimate_min_tx_fee(inputTypes, [poolAddress], outputTypes)
		fee = fee + fee
		if (userBtcAmount >= fee) break
	}
	if (userBtcAmount < fee) {
		throw new Error('Insufficient UTXO(s)')
	}

	const change_amount = BigInt(userBtcAmount) - fee - BigInt(2) * UTXO_DUST

	if (change_amount < 0) {
		throw new Error('Insufficient UTXO(s)')
	} else if (change_amount <= UTXO_DUST) {
		outputTypes.pop()
	} else {
		tx.addOutput(paymentAddress, change_amount)
	}

	const inputs = tx.getInputs()
	const psbt = tx.toPsbt()
	// @ts-expect-error: todo
	const unsignedTx = psbt.__CACHE.__TX
	const toSignInputs: ToSignInput[] = []

	const toSpendUtxos = inputs
		.filter(({ utxo }, index) => {
			const isUserInput =
				utxo.address === paymentAddress || utxo.address === paymentAddress
			console.log({ utxo, isUserInput })
			const addressType = getAddressType(utxo.address)
			if (isUserInput) {
				toSignInputs.push({
					index,
					...(addressType === AddressType.P2TR
						? { address: utxo.address, disableTweakSigner: false }
						: { publicKey: utxo.pubkey, disableTweakSigner: true })
				})
			}
			return isUserInput
		})
		.map(input => input.utxo)

	const unsignedTxClone = unsignedTx.clone()

	for (const toSignInput of toSignInputs) {
		const toSignIndex = toSignInput.index
		const input = inputs[toSignIndex]
		const inputAddress = input.utxo.address
		if (!inputAddress) continue
		const { redeemScript } = psbt.data.inputs[toSignIndex]
		const addressType = getAddressType(inputAddress)

		if (redeemScript && addressType === AddressType.P2SH_P2WPKH) {
			const finalScriptSig = bitcoin.script.compile([redeemScript])
			unsignedTxClone.setInputScript(toSignIndex, finalScriptSig)
		}
	}

	const txid = unsignedTxClone.getId()

	let intentionSet: IntentionSet = {
		tx_fee_in_sats: BigInt(fee),
		initiator_address: paymentAddress,
		intentions: [
			{
				exchange_id: ORDI_EXCHANGE_ID,
				action: 'settle_bid',
				input_coins: [],
				output_coins: revenue===BigInt(0)?
				[
					{
						to: paymentAddress,
						coin: {
							id: BITCOIN.id,
							value: UTXO_DUST
						}
					}
				]: 
				[
					{
						to: paymentAddress,
						coin: {
							id: BITCOIN.id,
							value: UTXO_DUST
						}
					},
					{
						to: depositor_address,
						coin: {
							id: runeIdStr,
							value: depositorReceiveRuneAmount
						}
					},
					{
						to: fee_collector_address,
						coin: {
							id: runeIdStr,
							value: feeCollectorReceiveRuneAmount
						}
					}
				],
				pool_utxo_spent: [],
				// [
				// 	`${poolRuneUtxo.txid}:${poolRuneUtxo.vout}`,
				// 	`${poolInscriptionUtxo.txid}:${poolInscriptionUtxo.vout}`
				// ],
				pool_utxo_received: [],
				// [
				// 	`${txid}:4`
				// ],
				pool_address: poolAddress,
				action_params: nftDepositId,
				nonce
			}
		]
	}

	let record: IntentionRecord = {
		intentionActionType: 'deposit_nft',
		transactionStatus: TransactionStatus.BROADCASTED,
		timestamp: Date.now(),
		poolBasic: {
			name: poolName,
			address: poolAddress
		},
		txid: txid,
		invokeAction: intentionSet.intentions[0].action,
		fee: fee.toString(),
		feeRate: feeRate,
		initiator: intentionSet.initiator_address,
		intention: {
			runeId: runeIdStr,
			finalPrice: finalBidPrice.toString(),
			inscriptionId: inscriptionId,
			nftDepositId: nftDepositId
		} as SettleIntention
	}

	console.log("deposit tx: ", {tx})
	console.log("deposit intention set", {intentionSet})

	return {
		psbt: psbt,
		toSpendUtxos: toSpendUtxos,
		toSignInputs: toSignInputs,
		txid: txid as string,
		fee: fee,
		feeRate: feeRate,
		intentionSet: intentionSet,
		intentionRecords: [record]
	}

	// return ocActor
	// 	.invoke({
	// 		psbt_hex: signedPsbtHex,
	// 		initiator_utxo_proof: [],
	// 		intention_set: {
	// 			tx_fee_in_sats: BigInt(fee),
	// 			initiator_address: paymentAddress,
	// 			intentions: [
	// 				{
	// 					exchange_id: ORDI_EXCHANGE_ID,
	// 					action: 'settle_bid',
	// 					input_coins: [],
	// 					output_coins: [
	// 						{
	// 							to: paymentAddress,
	// 							coin: {
	// 								id: BITCOIN.id,
	// 								value: UTXO_DUST
	// 							}
	// 						},
	// 						{
	// 							to: depositor_address,
	// 							coin: {
	// 								id: runeIdStr,
	// 								value: depositorReceiveRuneAmount
	// 							}
	// 						},
	// 						{
	// 							to: fee_collector_address,
	// 							coin: {
	// 								id: runeIdStr,
	// 								value: feeCollectorReceiveRuneAmount
	// 							}
	// 						}
	// 					],
	// 					pool_utxo_spend: [
	// 						`${poolRuneUtxo.txid}:${poolRuneUtxo.vout}`,
	// 						`${poolInscriptionUtxo.txid}:${poolInscriptionUtxo.vout}`
	// 					],
	// 					pool_utxo_receive: [`${txid}:4`],
	// 					pool_address: poolAddress,
	// 					action_params: nftDepositId,
	// 					nonce
	// 				}
	// 			]
	// 		}
	// 	})
	// 	.then(res => {
	// 		if ('Err' in res) {
	// 			throw new Error(res.Err)
	// 		}
	// 		console.log('invoke success and txid', res.Ok)
	// 		return res.Ok
	// 	})
	// 	.catch(error => {
	// 		console.log('invoke error', error)
	// 		throw error
	// 	})
}

// export async function invokeSettleBidWithSaveUtxo() {
// 	ocActor
// 	.invoke({
// 		psbt_hex: signedPsbtHex,
// 		initiator_utxo_proof: [],
// 		intention_set: {
// 		}
// 		})

// }

export async function invokeRecordTransaction(
	signedPsbtHex: string,
	fee: bigint,
	intentionSet: IntentionSet,

	toSpendUtxos: UnspentOutput[],
	savedSpendUtxo: (toSpendUtxos: UnspentOutput[]) => void
) {
	ocActor
		.invoke({
			psbt_hex: signedPsbtHex,
			initiator_utxo_proof: [],
			intention_set: intentionSet
		})
		.then(res => {
			if ('Err' in res) {
				throw new Error(res.Err)
			}
			console.log('invoke success and txid', res.Ok)
			return res.Ok
		})
}

// export async function invokeSettleBid(
// 	signedPsbtHex: string,
// 	fee: bigint,
// 	inputCoins: InputCoin[],
// 	outputCoins: OutputCoin[],
// 	paymentAddress: string,
// 	depositor_address: string,
// 	pool_utxo_spend: Outpoint[],
// 	pool_utxo_receive: Outpoint[]
// ) {
// 	ocActor
// 	.invoke({
// 		psbt_hex: signedPsbtHex,
// 		initiator_utxo_proof: [],
// 		intention_set: {
// 			tx_fee_in_sats: BigInt(fee),
// 			initiator_address: paymentAddress,
// 			intentions: [
// 				{
// 					exchange_id: ORDI_EXCHANGE_ID,
// 					action: 'settle_bid',
// 					input_coins: inputCoins,
// 					output_coins: outputCoins,
// 					// [
// 					// 	{
// 					// 		to: paymentAddress,
// 					// 		coin: {
// 					// 			id: BITCOIN.id,
// 					// 			value: UTXO_DUST
// 					// 		}
// 					// 	},
// 					// 	{
// 					// 		to: depositor_address,
// 					// 		coin: {
// 					// 			id: runeIdStr,
// 					// 			value: depositorReceiveRuneAmount
// 					// 		}
// 					// 	},
// 					// 	{
// 					// 		to: fee_collector_address,
// 					// 		coin: {
// 					// 			id: runeIdStr,
// 					// 			value: feeCollectorReceiveRuneAmount
// 					// 		}
// 					// 	}
// 					// ],
// 					pool_utxo_spend: pool_utxo_spend,
// 					// [
// 					// 	`${poolRuneUtxo.txid}:${poolRuneUtxo.vout}`,
// 					// 	`${poolInscriptionUtxo.txid}:${poolInscriptionUtxo.vout}`
// 					// ],
// 					pool_utxo_receive: pool_utxo_receive,
// 					// [`${txid}:4`],
// 					pool_address: ,
// 					action_params: nftDepositId,
// 					nonce
// 				}
// 			]
// 		}
// 	})
// }
