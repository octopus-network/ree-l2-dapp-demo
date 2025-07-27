import * as bitcoin from 'bitcoinjs-lib'
import { ORDI_EXCHANGE_ID, estimate_min_tx_fee, ocActor } from 'canister/orchestrator/actor'
import { Edict, RuneId, Runestone, none } from 'runelib'
import { Transaction } from 'transaction'
import type { ToSignInput, TxOutputType } from 'types'
import type { UnspentOutput } from 'types/utxo'
import { AddressType } from 'types/utxo'
import { addressTypeToString, getAddressType } from 'utils/address'
import { BITCOIN } from '../../constants/coin-list'
import { UTXO_DUST } from '../../constants/common'
import { GenPsbtResult } from './common'
import {
	IntentionRecord,
	ReclaimNftIntention,
  TransactionStatus
} from 'layout/sidebar/IntentionList'
import { IntentionSet } from 'canister/orchestrator/service.did'

export async function reclaimPsbt({
	runeIdStr,
	userRuneUtxo,
	poolRuneUtxo,
	inscriptionId,
	poolInscriptionUtxo,
	userBtcUtxos,
	userAddress: paymentAddress,
	poolAddress,
	poolName,
	userPayRuneAmount,
	feeRate,
	nonce,
	nftDepositId
}: {
	runeIdStr: string
	userRuneUtxo: UnspentOutput[]
	poolRuneUtxo: UnspentOutput
	inscriptionId: string
	poolInscriptionUtxo: UnspentOutput
	userBtcUtxos: UnspentOutput[]
	userAddress: string
	poolAddress: string
	poolName: string
	userPayRuneAmount: bigint
	feeRate: number
	nonce: bigint
	nftDepositId: string
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

	// input 2-n: user rune utxo
	let totalTakeUserRuneAmount = BigInt(0)
	let userRuneUtxoCount = 0
	for (const utxo of userRuneUtxo) {
		userRuneUtxoCount += 1
		tx.addInput(utxo)
		inputTypes.push(addressTypeToString(getAddressType(paymentAddress)))
		console.log({ utxo })
		totalTakeUserRuneAmount += BigInt(
			utxo.runes
				.filter(r => r.id === runeIdStr)
				.map(e => BigInt(e.amount))
				.reduce(
					(previousValue, currentValue) => previousValue + currentValue,
					BigInt(0)
				)
		)

		if (totalTakeUserRuneAmount >= userPayRuneAmount) {
			break
		}
	}

	if (totalTakeUserRuneAmount < userPayRuneAmount) {
		throw `Not enough user rune, expect ${userPayRuneAmount}, found: ${totalTakeUserRuneAmount}`
	}
	const isUserRuneNeedChange = totalTakeUserRuneAmount > userPayRuneAmount

	// output 0: edict
	const [runeBlock, runeIndex] = runeIdStr.split(':')
	const runeId = new RuneId(Number(runeBlock), Number(runeIndex))
	const edicts = isUserRuneNeedChange
		? [
				new Edict(
					runeId,
					BigInt(BigInt(poolRune.amount) + userPayRuneAmount),
					2
				),
				new Edict(
					runeId,
					BigInt(totalTakeUserRuneAmount - userPayRuneAmount),
					3
				)
			]
		: [
				new Edict(
					runeId,
					BigInt(BigInt(poolRune.amount) + userPayRuneAmount),
					2
				)
			]

	const runestone = new Runestone(edicts, none(), none(), none())
	const opReturnScript = runestone.encipher()

	tx.addScriptOutput(opReturnScript, BigInt(0))

	// Output1: user receive inscription
	tx.addOutput(paymentAddress, UTXO_DUST)

	// Output2: rune for pool
	tx.addOutput(poolAddress, UTXO_DUST)
	outputTypes.push(addressTypeToString(getAddressType(poolAddress)))
	// Output3: change rune for user
	if (isUserRuneNeedChange) {
		tx.addOutput(paymentAddress, UTXO_DUST)
		outputTypes.push(addressTypeToString(getAddressType(paymentAddress)))
	}

	// Output4: user btc change
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

	const change_amount =
		BigInt(userBtcAmount) -
		fee +
		BigInt(userRuneUtxoCount) * UTXO_DUST -
		(isUserRuneNeedChange ? UTXO_DUST : BigInt(0))

	if (change_amount < 0) {
		throw new Error('Inssuficient UTXO(s)')
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
				action: 'reclaim_nft',
				input_coins: [
					{
						from: paymentAddress,
						coin: {
							id: runeIdStr,
							value: userPayRuneAmount
						}
					}
				],
				output_coins: [
					{
						to: paymentAddress,
						coin: {
							id: BITCOIN.id,
							value: UTXO_DUST
						}
					}
				],
				pool_utxo_spent: [],
				// [
				// 	`${poolRuneUtxo.txid}:${poolRuneUtxo.vout}`,
				// 	`${poolInscriptionUtxo.txid}:${poolInscriptionUtxo.vout}`
				// ],
				pool_utxo_received: [], // [`${txid}:2`],
				pool_address: poolAddress,
				action_params: nftDepositId,
				nonce
			}
		]
	}

	let record: IntentionRecord = {
		intentionActionType: 'reclaim_nft',
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
			inscriptionId: inscriptionId,
			sendRuneAmount: userPayRuneAmount.toString(),
			nftDepositId: nftDepositId
		} as ReclaimNftIntention
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
	//   .invoke({
	//     psbt_hex: signedPsbtHex,
	//     initiator_utxo_proof: [],
	//     intention_set: {
	//       tx_fee_in_sats: BigInt(fee),
	//       initiator_address: paymentAddress,
	//       intentions: [
	//         {
	//           exchange_id: ORDI_EXCHANGE_ID,
	//           action: 'reclaim_nft',
	//           input_coins: [
	//             {
	//               from: paymentAddress,
	//               coin: {
	//                 id: runeIdStr,
	//                 value: userPayRuneAmount
	//               }
	//             }
	//           ],
	//           output_coins: [
	//             {
	//               to: paymentAddress,
	//               coin: {
	//                 id: BITCOIN.id,
	//                 value: UTXO_DUST
	//               }
	//             },
	//           ],
	//           pool_utxo_spend: [
	//             `${poolRuneUtxo.txid}:${poolRuneUtxo.vout}`,
	//             `${poolInscriptionUtxo.txid}:${poolInscriptionUtxo.vout}`,
	//           ],
	//           pool_utxo_receive: [`${txid}:2`],
	//           pool_address: poolAddress,
	//           action_params: nftDepositId,
	//           nonce
	//         }
	//       ]
	//     }
	//   })
	//   .then(res => {
	//     if ('Err' in res) {
	//       throw new Error(res.Err)
	//     }
	//     console.log('invoke success and txid', res.Ok)
	//     return res.Ok
	//   })
	//   .catch(error => {
	//     console.log('invoke error', error)
	//     throw error
	//   })
}
