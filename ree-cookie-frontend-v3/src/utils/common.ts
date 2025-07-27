import * as ecc from '@bitcoinerlab/secp256k1'
import * as bitcoin from 'bitcoinjs-lib'
import type { Utxo } from 'canister/rich_ordi/service.did'
import { clsx, type ClassValue } from 'clsx'
import Decimal from 'decimal.js'
import { twMerge } from 'tailwind-merge'
import { BITCOIN, NETWORK } from '../constants'
import type { Coin, UnspentOutput } from '../types'
import { AddressType } from '../types'
import { toPsbtNetwork } from './network'
// import {  } from "bitcoinjs-lib"
bitcoin.Psbt

bitcoin.initEccLib(ecc)

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export function ellipseMiddle(
	target: string | null,
	charsStart = 5,
	charsEnd = 5
): string {
	if (!target) {
		return ''
	}
	return `${target.slice(0, charsStart)}...${target.slice(
		target.length - charsEnd
	)}`
}

export function bytesToHex(bytes: Uint8Array) {
	const hexes = Array.from({ length: 256 }, (_, index) =>
		index.toString(16).padStart(2, '0')
	)
	// pre-caching improves the speed 6x
	let hex = ''
	for (const byte of bytes) {
		hex += hexes[byte]
	}
	return hex
}

export function hexToBytes(hex: string) {
	const cleanHex = hex.replace(/^0x/, '').replaceAll(/\s/g, '')
	if (cleanHex.length % 2 !== 0) {
		throw new Error(`Invalid hex string length: ${cleanHex.length}`)
	}
	const bytes = new Uint8Array(cleanHex.length / 2)
	for (let index = 0; index < bytes.length; index++) {
		const byte = Number.parseInt(cleanHex.slice(index * 2, index * 2 + 2), 16)
		if (isNaN(byte)) {
			throw new TypeError(`Invalid hex string at position ${index * 2}`)
		}
		bytes[index] = byte
	}
	return bytes
}

export function getP2trAddressAndScript(pubkey: string) {
	console.log({ pubkey })
	const { address, output } = bitcoin.payments.p2tr({
		internalPubkey: hexToBytes(pubkey),
		network: toPsbtNetwork(NETWORK)
	})

	return { address, output: output ? bytesToHex(output) : '' }
}

export function getCoinSymbol(coin: Coin | null | undefined) {
	return coin ? (coin.id === BITCOIN.id ? coin.symbol! : coin.name) : ''
}

export function getCoinName(coin: Coin | null | undefined) {
	return coin ? (coin.id === BITCOIN.id ? coin.name : coin.id) : ''
}

export function getRunePriceInSats(btcAmount: string, runeAmount: string) {
	return Number(btcAmount) && Number(runeAmount)
		? new Decimal(btcAmount)
				.mul(10 ** 8)
				.div(runeAmount)
				.toFixed(3)
		: undefined
}

export function isNumber(value: string) {
	const reg = /^\d+\.?\d*$/
	return reg.test(value)
}

export function convertPoolUtxo(
	utxo: Utxo,
	untweaked_key: string
): UnspentOutput {
	const { address: poolAddress, output } =
		getP2trAddressAndScript(untweaked_key)
	return {
		txid: utxo.txid,
		vout: utxo.vout,
		satoshis: utxo.sats.toString(),
		scriptPk: output,
		pubkey: '',
		addressType: AddressType.P2TR,
		address: poolAddress!,
		// runes: {
		//   id: utxo.maybe_rune;
		//   amount: string;
		// }[];
		runes: utxo.coins
		.filter(e=>e.id!==BITCOIN.id)
		.map(rune => ({
			id: rune.id,
			amount: rune.value.toString()
		}))
	}
}

export function parsePoolName(poolName: string): RuneIdAndCollection {
	// poolName eg: 78831:50|dogs (runeId + | + collection)
	const res = poolName.split('|')
	if (res.length !== 2) {
		throw new Error(`pool name is not valid${poolName}`)
	}
	return {
		runeId: res[0],
		collection: res[1]
	}
}

export interface RuneIdAndCollection {
	runeId: string
	collection: string
}

export function getErrorMessage(error: any) {
  // handle undefined or null
  if (error === null || error ===undefined) {
    return 'Unknown error';
  }

  // handle Error
  if (error instanceof Error) {
    return error.message || error.toString();
  }

  // handle object contain message field
  if (typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }

  // handle JSON.stringify object
  if (typeof error === 'object') {
    try {
      return JSON.stringify(error);
    } catch (e) {
      return 'Invalid error object';
    }
  }

  // else
  return String(error);
}