import type {
	Coin,
	ToSignInput,
	TransactionInfo,
	TxInput,
	UnspentOutput
} from '../../types'
import { AddressType, TransactionType } from '../../types'

import * as bitcoin from 'bitcoinjs-lib'
import { IntentionSet } from 'canister/orchestrator/service.did'
import { IntentionRecord } from 'layout/sidebar/IntentionList'
import type { Edict } from 'runelib'
import { Runestone } from 'runelib'
import { getRawTx, getTxInfo } from '../../api/chain-api'
import { NETWORK } from '../../constants'
import { getAddressType } from '../address'
import { getCoinSymbol, hexToBytes } from '../common'
import { formatNumber } from '../format-number'
import { toPsbtNetwork } from '../network'

export async function getTxScript(outpoint: string) {
	const [txid, vout] = outpoint.split(':')
	const voutNumber = Number(vout)
	const { vout: outputs } = await getTxInfo(txid)

	const { scriptpubkey, scriptpubkey_address } = outputs[voutNumber]
	return {
		scriptPk: scriptpubkey,
		address: scriptpubkey_address
	}
}

export async function getUtxoByOutpoint(
	txid: string,
	vout: number
): Promise<UnspentOutput | undefined> {
	const voutNumber = Number(vout)

	const [{ vout: outputs }, rawTx] = (await Promise.all([
		getTxInfo(txid),
		getRawTx(txid)
	])) as [
		{
			vout: {
				scriptpubkey: string
				scriptpubkey_address: string
				scriptpubkey_asm: string
				scriptpubkey_type: string
				value: number
			}[]
			status: { confirmed: boolean; block_height: number }
		},
		string
	]

	if (!outputs) {
		return
	}

	const { scriptpubkey, scriptpubkey_address, value } = outputs[voutNumber]

	const opReturn = outputs.find(
		({ scriptpubkey_type }) => scriptpubkey_type === 'op_return'
	)

	let edicts: Edict[] = []
	if (opReturn) {
		const stone = Runestone.decipher(rawTx)

		if (stone.isSome()) {
			const value = stone.value()
			edicts = value?.edicts || []
		}
	}

	const edict = edicts.find(e => e.output === voutNumber)

	return {
		txid,
		vout: voutNumber,
		satoshis: value.toString(),
		scriptPk: scriptpubkey,
		address: scriptpubkey_address,
		pubkey: '',
		addressType: getAddressType(scriptpubkey_address),
		runes: edict
			? [
					{
						id: `${edict.id.block}:${edict.id.idx}`,
						amount: edict.amount.toString()
					}
				]
			: []
	}
}

export function selectBtcUtxos(utxos: UnspentOutput[], targetAmount: bigint) {
	const selectedUtxos: UnspentOutput[] = []
	const remainingUtxos: UnspentOutput[] = []

	let totalAmount = BigInt(0)
	for (const utxo of utxos) {
		if (utxo.runes.length > 0) {
			continue
		}
		if (totalAmount < targetAmount) {
			totalAmount += BigInt(utxo.satoshis)
			selectedUtxos.push(utxo)
		} else {
			remainingUtxos.push(utxo)
		}
	}

	return {
		selectedUtxos,
		remainingUtxos
	}
}

export function selectRuneUtxos(
	utxos: UnspentOutput[],
	coin: Coin,
	targetAmount: bigint
) {
	const selectedUtxos: UnspentOutput[] = []
	const remainingUtxos: UnspentOutput[] = []

	let totalAmount = BigInt(0)
	for (const utxo of utxos) {
		if (utxo.runes.length === 0) {
			continue
		}
		const containsTargetCoinUtxoIndex = utxo.runes.findIndex(
			rune => rune.id === coin.id
		)

		if (containsTargetCoinUtxoIndex < 0) {
			continue
		}

		if (totalAmount < targetAmount) {
			totalAmount += BigInt(utxo.runes[containsTargetCoinUtxoIndex].amount)
			if (
				selectedUtxos.findIndex(
					item => item.txid === utxo.txid && item.vout === utxo.vout
				) < 0
			) {
				selectedUtxos.push(utxo)
			}
		} else {
			remainingUtxos.push(utxo)
		}
	}

	return {
		selectedUtxos,
		remainingUtxos
	}
}

export function getAddedVirtualSize(addressType: AddressType) {
	if (
		addressType === AddressType.P2WPKH ||
		addressType === AddressType.M44_P2WPKH
	) {
		return 41 + (1 + 1 + 72 + 1 + 33) / 4
	}
	if (
		addressType === AddressType.P2TR ||
		addressType === AddressType.M44_P2TR
	) {
		return 41 + (1 + 1 + 64) / 4
	}
	if (addressType === AddressType.P2PKH) {
		return 41 + 1 + 1 + 72 + 1 + 33
	}
	if (addressType === AddressType.P2SH_P2WPKH) {
		return 41 + 24 + (1 + 1 + 72 + 1 + 33) / 4
	}
	throw new Error('unknown address type')
}

export function getTxTitleAndDescription(transaction: TransactionInfo): {
	title: string
	description: string
} {
	const { type, coinA, coinB, coinAAmount, coinBAmount } = transaction
	let title = ''
	let description = ''
	switch (type) {
		case TransactionType.ADD_LIQUIDITY: {
			title = `Add Liquidity to ${getCoinSymbol(coinB)} pool`
			description = `Deposit ${formatNumber(coinAAmount)} ${getCoinSymbol(
				coinA
			)} and ${formatNumber(coinBAmount)} ${getCoinSymbol(
				coinB
			)} to ${getCoinSymbol(coinB)} pool`

			break
		}
		case TransactionType.SWAP: {
			title = `Swap ${getCoinSymbol(coinA)} to ${getCoinSymbol(coinB)}`
			description = `Convert ${formatNumber(coinAAmount)} ${getCoinSymbol(
				coinA
			)} to ${formatNumber(coinBAmount)} ${getCoinSymbol(coinB)}`

			break
		}
		case TransactionType.WITHDRAW_LIQUIDITY: {
			title = `Withdraw Liquidity from ${getCoinSymbol(coinB)} pool`
			description = `Widthdraw ${formatNumber(coinAAmount)} ${getCoinSymbol(
				coinA
			)} and ${formatNumber(coinBAmount)} ${getCoinSymbol(
				coinB
			)} from ${getCoinSymbol(coinB)} pool`

			break
		}
		// No default
	}

	return {
		title,
		description
	}
}

export function utxoToInput(utxo: UnspentOutput, estimate?: boolean): TxInput {
	let data: any = {
		hash: utxo.txid,
		index: utxo.vout,
		witnessUtxo: {
			value: BigInt(utxo.satoshis),
			script: hexToBytes(utxo.scriptPk)
		}
	}
	if (
		(utxo.addressType === AddressType.P2TR ||
			utxo.addressType === AddressType.M44_P2TR) &&
		utxo.pubkey
	) {
		const pubkey =
			utxo.pubkey.length === 66 ? utxo.pubkey.slice(2) : utxo.pubkey
		data = {
			hash: utxo.txid,
			index: utxo.vout,
			witnessUtxo: {
				value: BigInt(utxo.satoshis),
				script: hexToBytes(utxo.scriptPk)
			},
			tapInternalKey: hexToBytes(pubkey)
		}
	} else if (utxo.addressType === AddressType.P2PKH) {
		if (!utxo.rawtx || estimate) {
			const data = {
				hash: utxo.txid,
				index: utxo.vout,
				witnessUtxo: {
					value: BigInt(utxo.satoshis),
					script: hexToBytes(utxo.scriptPk)
				}
			}
			return {
				data,
				utxo
			}
		}
	} else if (utxo.addressType === AddressType.P2SH_P2WPKH && utxo.pubkey) {
		const redeemData = bitcoin.payments.p2wpkh({
			pubkey: hexToBytes(utxo.pubkey),
			network: toPsbtNetwork(NETWORK)
		})

		data = {
			hash: utxo.txid,
			index: utxo.vout,
			witnessUtxo: {
				value: BigInt(utxo.satoshis),
				script: hexToBytes(utxo.scriptPk)
			},
			redeemScript: redeemData.output
		}
	}

	return {
		data,
		utxo
	}
}

export type Outpoint = string

export type GenPsbtResult = {
	psbt: bitcoin.Psbt
	toSpendUtxos: UnspentOutput[]
	toSignInputs: ToSignInput[]
	txid: string
	fee: bigint
	feeRate: number
	// inputCoins: InputCoin[],
	// outputCoins: OutputCoin[]
	// poolSpendUtxoOutpoints: Outpoint[]
	// poolReceiveUtxos: Outpoint[]
	intentionSet: IntentionSet
	intentionRecords: IntentionRecord[]
}

// export function invokeProcess(
// 	genPsbt: ()=>Promise<GenPsbtResult>,
// 	setStepIndex: (step: number) => void,
// 	addSpentUtxos: (utxos: UnspentOutput[]) => void,
// ) {

// }
