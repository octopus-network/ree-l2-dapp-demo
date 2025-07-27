import * as bitcoin from 'bitcoinjs-lib'
import { ORDI_EXCHANGE_ID, estimate_min_tx_fee } from 'canister/orchestrator/actor'
import { DepositIntention, IntentionRecord, TransactionStatus } from 'layout/sidebar/IntentionList'
import { Edict, RuneId, Runestone, none } from 'runelib'
import { Transaction } from 'transaction'
import type { ToSignInput, TxOutputType } from 'types'
import type { UnspentOutput } from 'types/utxo'
import { AddressType } from 'types/utxo'
import { addressTypeToString, getAddressType } from 'utils/address'
import { BITCOIN } from '../../constants'
import { UTXO_DUST } from '../../constants/common'
import { GenPsbtResult } from './common'
import { IntentionSet } from 'canister/orchestrator/service.did'

export async function depositPsbt({
	runeIdStr,
	nftUtxo,
	poolUtxo,
	userBtcUtxos,
	userAddress,
	paymentAddress,
	poolName,
	poolAddress,
	userReceiveRuneAmount,
	feeRate,
	nonce,
	inscriptionId
}: {
	runeIdStr: string
	nftUtxo: UnspentOutput
	poolUtxo: UnspentOutput
	userBtcUtxos: UnspentOutput[]
	userAddress: string
	paymentAddress: string
	poolName: string
	poolAddress: string
	userReceiveRuneAmount: bigint
	feeRate: number
	nonce: bigint
	inscriptionId: string
}): Promise<GenPsbtResult> {
	const poolRune = poolUtxo.runes.find(r => r.id == runeIdStr)
	if (!poolRune) {
		throw new Error('Pool rune not found')
	}

	if (BigInt(poolRune.amount) < userReceiveRuneAmount) {
		throw new Error('Not enough pool rune')
	}
	const poolRuneChange = BigInt(poolRune.amount) - userReceiveRuneAmount

	const inputTypes: TxOutputType[] = []
	const outputTypes: TxOutputType[] = []

	const tx = new Transaction()

	tx.setFeeRate(feeRate)
	tx.setEnableRBF(false)
	tx.setChangeAddress(paymentAddress)

	// Input 0: nft utxo
	tx.addInput(nftUtxo)
	inputTypes.push(addressTypeToString(getAddressType(userAddress)))

	// Input 1: pool rune utxo
	tx.addInput(poolUtxo)
	inputTypes.push(addressTypeToString(getAddressType(poolAddress)))

	// Input 2-n: user utxo
	// let userBtcAmount = BigInt(0)
	// for (const utxo of userBtcUtxos) {
	// 	if (utxo.txid === nftUtxo.txid && utxo.vout === nftUtxo.vout) {
	// 		continue
	// 	}
	// 	tx.addInput(utxo)
	// 	inputTypes.push(addressTypeToString(getAddressType(utxo.address)))
	// 	userBtcAmount += BigInt(utxo.satoshis)
	// }

	// Output 0:  edict
	const [runeBlock, runeIndex] = runeIdStr.split(':')
	const runeId = new RuneId(Number(runeBlock), Number(runeIndex))
	const edicts =
		poolRuneChange > 0
			? [
					new Edict(runeId, BigInt(userReceiveRuneAmount), 2),
					new Edict(runeId, poolRuneChange, 3)
				]
			: [new Edict(runeId, BigInt(userReceiveRuneAmount), 2)]

	const runestone = new Runestone(edicts, none(), none(), none())
	const opReturnScript = runestone.encipher()
	tx.addScriptOutput(opReturnScript, BigInt(0))

	// Output 1: pool utxo for inscription
	tx.addOutput(poolAddress, BigInt(546))
	outputTypes.push(addressTypeToString(getAddressType(poolAddress)))

	// Output 2: User 546 Utxo for rune
	tx.addOutput(paymentAddress, BigInt(546))
	outputTypes.push(addressTypeToString(getAddressType(userAddress)))

	// Output 3: Pool change rune utxo
	tx.addOutput(poolAddress, BigInt(546))
	outputTypes.push(addressTypeToString(getAddressType(poolAddress)))

	// Output 4: User change btc utxo

	// add output types to estimate tx fee
	outputTypes.push(addressTypeToString(getAddressType(paymentAddress)))

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
	// const psbtBase64 = psbt.toBase64()
	// const signedPsbtHex = res?.signedPsbtHex

	// console.log({ signedPsbtHex })

	let intentionSet: IntentionSet = {
		tx_fee_in_sats: BigInt(fee),
		initiator_address: paymentAddress,
		intentions: [
			{
				exchange_id: ORDI_EXCHANGE_ID,
				action: 'deposit_nft',
				input_coins: [
					{
						from: paymentAddress,
						coin: {
							id: BITCOIN.id,
							value: UTXO_DUST
						}
					}
				],
				output_coins: [
					{
						to: paymentAddress,
						coin: {
							id: runeIdStr,
							value: userReceiveRuneAmount
						}
					}
				],
				pool_utxo_spent: [], // [`${poolUtxo.txid}:${poolUtxo.vout}`],
				pool_utxo_received: [], // [`${txid}:1`, `${txid}:3`],
				pool_address: poolAddress,
				action_params: inscriptionId,
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
			inscriptionId: inscriptionId,
			receiveRuneAmount: userReceiveRuneAmount.toString()
		} as DepositIntention
	}

	console.log("deposit tx: ", {tx})
	console.log("edicts: ", {edicts})
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
	// 		intention_set: intentionSet
	// 	})
	// 	.then(async res => {
	// 		if ('Err' in res) {
	// 			throw new Error(res.Err)
	// 		}
	// 		console.log('invoke success and txid', res.Ok)

	// 		return richOrdiActor
	// 			.set_nft_inscription_id(poolAddress, txid, inscriptionId)
	// 			.then(() => res.Ok)
	// 	})
	// 	.catch(error => {
	// 		console.log('invoke error', error)
	// 		throw error
	// 	})
}
