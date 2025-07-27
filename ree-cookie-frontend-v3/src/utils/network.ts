import * as bitcoin from 'bitcoinjs-lib'
import type { NetworkType } from '@omnisat/lasereyes'

export function toPsbtNetwork(network: NetworkType) {
	if (network === 'mainnet') {
		return bitcoin.networks.bitcoin
	}
	return bitcoin.networks.testnet
}
