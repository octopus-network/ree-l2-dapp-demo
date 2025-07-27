import * as bitcoin from 'bitcoinjs-lib'
import { ORDI_EXCHANGE_ID, estimate_min_tx_fee, ocActor } from 'canister/orchestrator/actor'
import {
	ClaimBidIntention,
	IntentionRecord,
	TransactionStatus
} from 'layout/sidebar/IntentionList'
import { Edict, RuneId, Runestone, none } from 'runelib'
import { Transaction } from 'transaction'
import type { ToSignInput, TxOutputType } from 'types'
import type { UnspentOutput } from 'types/utxo'
import { AddressType } from 'types/utxo'
import { addressTypeToString, getAddressType } from 'utils/address'
import { UTXO_DUST } from '../../constants/common'
import { GenPsbtResult } from './common'
import { IntentionSet } from 'canister/orchestrator/service.did'

export async function claimPsbt({
	runeIdStr,
	poolRuneUtxo,
	inscriptionId,
	userBtcUtxos,
	paymentAddress,
	poolAddress,
	poolName,
	userClaimRuneAmount,
	feeRate,
	nonce,
	nftDepositId
}: {
	runeIdStr: string
	poolRuneUtxo: UnspentOutput
	inscriptionId: string
	userBtcUtxos: UnspentOutput[]
	paymentAddress: string
	poolAddress: string
	poolName: string
	userClaimRuneAmount: bigint
	feeRate: number
	nonce: bigint
	nftDepositId: string
}): Promise<GenPsbtResult> {
	const poolRune = poolRuneUtxo.runes.find(r => r.id == runeIdStr)
	if (!poolRune) {
		throw new Error('Pool rune not found')
	}
	const poolRuneAmount = BigInt(poolRune.amount)
	if (poolRuneAmount < userClaimRuneAmount) {
		throw new Error('Pool rune amount is less than user claim amount')
	}

	const inputTypes: TxOutputType[] = []
	const outputTypes: TxOutputType[] = []

	const tx = new Transaction()
	tx.setFeeRate(feeRate)
	tx.setEnableRBF(false)
	tx.setChangeAddress(paymentAddress)

	// input 0: pool rune utxo
	tx.addInput(poolRuneUtxo)
	inputTypes.push(addressTypeToString(getAddressType(poolAddress)))

	// // input 1-n: user btc utxo
	// let userBtcAmount = BigInt(0)
	// for (const utxo of userBtcUtxos) {
	// 	tx.addInput(utxo)
	// 	inputTypes.push(addressTypeToString(getAddressType(utxo.address)))
	// 	userBtcAmount += BigInt(utxo.satoshis)
	// }

	// output 0: edict

	const isPoolRuneNeedChange = poolRuneAmount > userClaimRuneAmount
	const [runeBlock, runeIndex] = runeIdStr.split(':')
	const runeId = new RuneId(Number(runeBlock), Number(runeIndex))
	const edicts = isPoolRuneNeedChange
		? [
				new Edict(runeId, userClaimRuneAmount, 1),
				new Edict(runeId, poolRuneAmount - userClaimRuneAmount, 2)
			]
		: [new Edict(runeId, userClaimRuneAmount, 1)]

	const runestone = new Runestone(edicts, none(), none(), none())
	const opReturnScript = runestone.encipher()

	tx.addScriptOutput(opReturnScript, BigInt(0))

	// Output1: change rune for user
	tx.addOutput(paymentAddress, BigInt(546))
	outputTypes.push(addressTypeToString(getAddressType(paymentAddress)))

	// Output2: change rune for pool
	if (isPoolRuneNeedChange) {
		tx.addOutput(poolAddress, BigInt(546))
		outputTypes.push(addressTypeToString(getAddressType(poolAddress)))
	}

	// Output3: user btc change
	outputTypes.push(addressTypeToString(getAddressType(paymentAddress)))

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

	// let fee = await ocActor
	// 	.estimate_min_tx_fee({
	// 		input_types: inputTypes,
	// 		pool_address: [poolAddress],
	// 		output_types: outputTypes
	// 	})
	// 	.then((res: { Err: string } | { Ok: bigint }) => {
	// 		if ('Err' in res) {
	// 			throw new Error(res.Err)
	// 		}
	// 		return res.Ok
	// 	})
	// 	.catch(error => {
	// 		console.log('invoke error', error)
	// 		throw error
	// 	})

	// fee += fee

	const change_amount = BigInt(userBtcAmount) - fee - UTXO_DUST

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
				action: 'claim_bid',
				input_coins: [],
				output_coins: [
					{
						to: paymentAddress,
						coin: {
							id: runeIdStr,
							value: userClaimRuneAmount
						}
					}
				],
				pool_utxo_spent: [], // [`${poolRuneUtxo.txid}:${poolRuneUtxo.vout}`],
				pool_utxo_received: [], // [`${txid}:2`],
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
			receiveRuneAmount: userClaimRuneAmount.toString(),
			inscriptionId: inscriptionId,
			nftDepositId: nftDepositId
		} as ClaimBidIntention
	}

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

	// await ocActor
	// 	.invoke({
	// 		psbt_hex: signedPsbtHex,
	// 		initiator_utxo_proof: [],
	// 		intention_set: {
	// 			tx_fee_in_sats: BigInt(fee),
	// 			initiator_address: paymentAddress,
	// 			intentions: [
	// 				{
	// 					exchange_id: ORDI_EXCHANGE_ID,
	// 					action: 'claim_bid',
	// 					input_coins: [],
	// 					output_coins: [
	// 						{
	// 							to: paymentAddress,
	// 							coin: {
	// 								id: runeIdStr,
	// 								value: userClaimRuneAmount
	// 							}
	// 						}
	// 					],
	// 					pool_utxo_spend: [`${poolRuneUtxo.txid}:${poolRuneUtxo.vout}`],
	// 					pool_utxo_receive: [`${txid}:2`],
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
