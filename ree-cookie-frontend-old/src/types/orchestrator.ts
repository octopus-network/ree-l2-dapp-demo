import { CoinBalance } from "./coin";

export type InputCoin = {
  coin: CoinBalance;
  from: string;
};

export type OutputCoin = {
  coin: CoinBalance;
  to: string;
};

export type Intention = {
  input_coins: InputCoin[];
  output_coins: OutputCoin[];
  action: string;
  exchange_id: string;
  action_params: string;
  pool_utxo_spend: string[];
  nonce: bigint;
  pool_utxo_receive: string[];
  pool_address: string;
};

export type IntentionSet = {
  initiator_address: string;
  intentions: Intention[];
};

export type InvokeArgs = {
  intention_set: IntentionSet;
  psbt_hex: string;
};

export type TxOutputType =
  | { P2WPKH: null }
  | { P2TR: null }
  | { P2SH: null }
  | { OpReturn: bigint };

export type EstimateMinTxFeeArgs = {
  input_types: TxOutputType[];
  pool_address: string;
  output_types: TxOutputType[];
};

export type OutpointWithValue = {
  maybe_rune: [CoinBalance];
  value: bigint;
  script_pubkey_hex: string;
  outpoint: string;
};
