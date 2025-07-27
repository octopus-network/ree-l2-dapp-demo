import * as bitcoin from 'bitcoinjs-lib'
import type { TxOutputType } from '../types'
import { AddressType } from '../types'
import { toPsbtNetwork } from './network'

import { NETWORK } from '../constants'

export function addressToScriptPk(address: string) {
	const network = toPsbtNetwork(NETWORK)
	return bitcoin.address.toOutputScript(address, network)
}

export function getEstimateAddress(
	pubkey: Uint8Array,
	addressType: AddressType
) {
	const network = toPsbtNetwork(NETWORK)

	const defaultAddress =
		'bc1py6wpspaygpcgzts8se00cufvrz0acf3yklxc7gx3trj0wxag8n5sm2ysdc'

	if (addressType === AddressType.P2PKH) {
		const { address } = bitcoin.payments.p2pkh({
			pubkey,
			network
		})
		return address ?? defaultAddress
	}
	if (
		addressType === AddressType.P2SH_P2WPKH ||
		addressType === AddressType.P2WPKH
	) {
		const { address } = bitcoin.payments.p2wpkh({
			pubkey,
			network
		})
		return address ?? defaultAddress
	}
	if (addressType === AddressType.P2TR) {
		const { address } = bitcoin.payments.p2tr({
			internalPubkey: pubkey.slice(1),
			network
		})

		return address ?? defaultAddress
	}

	return defaultAddress
}

export function decodeAddress(address: string) {
	const mainnet = bitcoin.networks.bitcoin
	const { testnet } = bitcoin.networks
	const { regtest } = bitcoin.networks
	let decodeBase58: bitcoin.address.Base58CheckResult
	let decodeBech32: bitcoin.address.Bech32Result

	let addressType: AddressType
	if (
		address.startsWith('bc1') ||
		address.startsWith('tb1') ||
		address.startsWith('bcrt1')
	) {
		try {
			decodeBech32 = bitcoin.address.fromBech32(address)

			if (decodeBech32.version === 0) {
				addressType =
					decodeBech32.data.length === 20
						? AddressType.P2WPKH
						: AddressType.P2WSH
			} else {
				addressType = AddressType.P2TR
			}
			return {
				addressType
			}
		} catch {}
	} else {
		try {
			decodeBase58 = bitcoin.address.fromBase58Check(address)
			switch (decodeBase58.version) {
				case mainnet.pubKeyHash: {
					addressType = AddressType.P2PKH

					break
				}
				case testnet.pubKeyHash: {
					addressType = AddressType.P2PKH

					break
				}
				case regtest.pubKeyHash: {
					// do not work

					addressType = AddressType.P2PKH

					break
				}
				case mainnet.scriptHash: {
					addressType = AddressType.P2SH_P2WPKH

					break
				}
				case testnet.scriptHash: {
					addressType = AddressType.P2SH_P2WPKH

					break
				}
				default: {
					// do not work

					addressType = AddressType.P2SH_P2WPKH
				}
			}
			return {
				addressType
			}
		} catch {}
	}

	return {
		addressType: AddressType.UNKNOWN,
		dust: 546
	}
}

export function getAddressType(address: string): AddressType {
	return decodeAddress(address).addressType
}

export function addressTypeToString(addressType: AddressType): TxOutputType {
	if (addressType === AddressType.P2WPKH) {
		return { P2WPKH: null }
	}
	if (addressType === AddressType.P2SH_P2WPKH) {
		return { P2SH: null }
	}
	return { P2TR: null }
}
