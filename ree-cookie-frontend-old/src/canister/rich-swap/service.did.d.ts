import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface CoinBalance { 'id' : string, 'value' : bigint }
export type ExchangeError = { 'InvalidSignPsbtArgs' : string } |
  { 'InvalidNumeric' : null } |
  { 'Overflow' : null } |
  { 'InvalidInput' : null } |
  { 'PoolAddressNotFound' : null } |
  { 'PoolStateExpired' : bigint } |
  { 'TooSmallFunds' : null } |
  { 'InvalidRuneId' : null } |
  { 'InvalidPool' : null } |
  { 'InvalidPsbt' : string } |
  { 'PoolAlreadyExists' : null } |
  { 'InvalidTxid' : null } |
  { 'InvalidLiquidity' : null } |
  { 'EmptyPool' : null } |
  { 'LpNotFound' : null } |
  { 'ChainKeyError' : null } |
  { 'FetchRuneIndexerError' : null } |
  { 'InvalidState' : string } |
  { 'InsufficientFunds' : null };
export interface ExecuteTxArgs {
  'zero_confirmed_tx_queue_length' : number,
  'txid' : string,
  'intention_set' : IntentionSet,
  'intention_index' : number,
  'psbt_hex' : string,
}
export interface ExtractFeeOffer {
  'output' : CoinBalance,
  'nonce' : bigint,
  'input' : Utxo,
}
export interface GetMinimalTxValueArgs {
  'zero_confirmed_tx_queue_length' : number,
  'pool_address' : string,
}
export interface GetPoolInfoArgs { 'pool_address' : string }
export interface InputCoin { 'coin' : CoinBalance, 'from' : string }
export interface Intention {
  'input_coins' : Array<InputCoin>,
  'output_coins' : Array<OutputCoin>,
  'action' : string,
  'exchange_id' : string,
  'pool_utxo_spend' : Array<string>,
  'action_params' : string,
  'nonce' : bigint,
  'pool_utxo_receive' : Array<string>,
  'pool_address' : string,
}
export interface IntentionSet {
  'tx_fee_in_sats' : bigint,
  'initiator_address' : string,
  'intentions' : Array<Intention>,
}
export interface Liquidity {
  'total_share' : bigint,
  'user_share' : bigint,
  'user_incomes' : bigint,
}
export interface LiquidityOffer {
  'output' : CoinBalance,
  'inputs' : [] | [Utxo],
  'nonce' : bigint,
}
export interface NewBlockInfo {
  'block_hash' : string,
  'confirmed_txids' : Array<string>,
  'block_timestamp' : bigint,
  'block_height' : number,
}
export interface OutputCoin { 'to' : string, 'coin' : CoinBalance }
export interface PoolBasic { 'name' : string, 'address' : string }
export interface PoolInfo {
  'key' : string,
  'name' : string,
  'btc_reserved' : bigint,
  'key_derivation_path' : Array<Uint8Array | number[]>,
  'coin_reserved' : Array<CoinBalance>,
  'attributes' : string,
  'address' : string,
  'nonce' : bigint,
  'utxos' : Array<Utxo>,
}
export type Result = { 'Ok' : string } |
  { 'Err' : ExchangeError };
export type Result_1 = { 'Ok' : string } |
  { 'Err' : string };
export type Result_2 = { 'Ok' : Liquidity } |
  { 'Err' : ExchangeError };
export type Result_3 = { 'Ok' : null } |
  { 'Err' : string };
export type Result_4 = { 'Ok' : LiquidityOffer } |
  { 'Err' : ExchangeError };
export type Result_5 = { 'Ok' : ExtractFeeOffer } |
  { 'Err' : ExchangeError };
export type Result_6 = { 'Ok' : SwapOffer } |
  { 'Err' : ExchangeError };
export type Result_7 = { 'Ok' : WithdrawalOffer } |
  { 'Err' : ExchangeError };
export interface RollbackTxArgs { 'txid' : string }
export interface SwapOffer {
  'output' : CoinBalance,
  'nonce' : bigint,
  'input' : Utxo,
}
export interface Utxo {
  'maybe_rune' : [] | [CoinBalance],
  'sats' : bigint,
  'txid' : string,
  'vout' : number,
}
export interface WithdrawalOffer {
  'nonce' : bigint,
  'input' : Utxo,
  'user_outputs' : Array<CoinBalance>,
}
export interface _SERVICE {
  'create' : ActorMethod<[string], Result>,
  'execute_tx' : ActorMethod<[ExecuteTxArgs], Result_1>,
  'get_fee_collector' : ActorMethod<[], string>,
  'get_lp' : ActorMethod<[string, string], Result_2>,
  'get_minimal_tx_value' : ActorMethod<[GetMinimalTxValueArgs], bigint>,
  'get_pool_info' : ActorMethod<[GetPoolInfoArgs], [] | [PoolInfo]>,
  'get_pool_list' : ActorMethod<[], Array<PoolBasic>>,
  'list_pools' : ActorMethod<[[] | [string], bigint], Array<PoolInfo>>,
  'new_block' : ActorMethod<[NewBlockInfo], Result_3>,
  'pre_add_liquidity' : ActorMethod<[string, CoinBalance], Result_4>,
  'pre_extract_fee' : ActorMethod<[string], Result_5>,
  'pre_swap' : ActorMethod<[string, CoinBalance], Result_6>,
  'pre_withdraw_liquidity' : ActorMethod<[string, string, bigint], Result_7>,
  'rollback_tx' : ActorMethod<[RollbackTxArgs], Result_3>,
  'set_fee_collector' : ActorMethod<[string], undefined>,
  'set_orchestrator' : ActorMethod<[Principal], undefined>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
