export interface UnspentOutput {
	txid: string
	vout: number
	satoshis: string
	scriptPk: string
	pubkey: string
	addressType: AddressType
	address: string
	runes: {
		id: string
		amount: string
	}[]
	rawtx?: string
	timestamp?: number
}

export enum AddressType {
	P2PKH,
	P2WPKH,
	P2TR,
	P2SH_P2WPKH,
	M44_P2WPKH, // deprecated
	M44_P2TR, // deprecated
	P2WSH,
	P2SH,
	UNKNOWN
}

export interface TxInput {
	data: {
		hash: string
		index: number
		witnessUtxo?: { value: bigint; script: Uint8Array }
		tapInternalKey?: Uint8Array
		nonWitnessUtxo?: Uint8Array
	}
	utxo: UnspentOutput
}

export interface TxOutput {
	address?: string
	script?: Uint8Array
	value: bigint
}
