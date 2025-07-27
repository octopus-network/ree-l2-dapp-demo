import type { CoinBalance } from './coin'

export interface InputCoin {
	coin: CoinBalance
	from: string
}

export interface OutputCoin {
	coin: CoinBalance
	to: string
}

export interface Intention {
	input_coins: InputCoin[]
	output_coins: OutputCoin[]
	action: string
	exchange_id: string
	action_params: string
	pool_utxo_spend: string[]
	nonce: bigint
	pool_utxo_receive: string[]
	pool_address: string
}

export interface IntentionSet {
	tx_fee_in_sats: bigint
	initiator_address: string
	intentions: Intention[]
}

export interface InvokeArguments {
	intention_set: IntentionSet
	psbt_hex: string
}

export type TxOutputType =
	| { OpReturn: bigint }
	| { P2SH: null }
	| { P2TR: null }
	| { P2WPKH: null }

export interface EstimateMinTxFeeArguments {
	input_types: TxOutputType[]
	pool_address: string[]
	output_types: TxOutputType[]
}

export interface OutpointWithValue {
	maybe_rune: [CoinBalance]
	value: bigint
	script_pubkey_hex: string
	outpoint: string
}

export interface OrchestratorStatus {
	mempool_tx_fee_rate: {
		low: bigint
		high: bigint
		update_time: string
		medium: bigint
	}
}
