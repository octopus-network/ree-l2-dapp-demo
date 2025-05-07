import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface AddLiquidityInfo {
  'btc_amount_for_add_liquidity' : bigint,
  'rune_amount_for_add_liquidity' : bigint,
}
export interface CoinBalance { 'id' : string, 'value' : bigint }
export type ExchangeError = { 'InvalidSignPsbtArgs' : string } |
  { 'InvalidNumeric' : null } |
  { 'ParseUtxoRuneBalanceError' : string } |
  { 'Overflow' : null } |
  { 'InvalidInput' : null } |
  { 'PoolAddressNotFound' : null } |
  { 'NatConvertError' : bigint } |
  { 'CookieBalanceInsufficient' : bigint } |
  { 'GameEnd' : null } |
  { 'ReorgError' : ReorgError } |
  { 'GamerAlreadyExist' : string } |
  { 'DuplicateBlock' : [number, string] } |
  { 'PoolStateExpired' : bigint } |
  { 'GamerNotFound' : string } |
  { 'GameNotEnd' : null } |
  { 'TooSmallFunds' : null } |
  { 'Unrecoverable' : null } |
  { 'LastStateNotFound' : null } |
  { 'InvalidRuneId' : null } |
  { 'InvalidPool' : null } |
  { 'InvalidPsbt' : string } |
  { 'PoolAlreadyExists' : null } |
  { 'GamerCoolingDown' : [string, bigint] } |
  { 'InvalidTxid' : string } |
  { 'InvalidLiquidity' : null } |
  { 'DepositRuneBalanceIncorrect' : [string, string] } |
  { 'EmptyPool' : null } |
  { 'RuneIndexerResultError' : string } |
  { 'LpNotFound' : null } |
  { 'ChainKeyError' : null } |
  { 'FetchRuneIndexerError' : [RejectionCode, string] } |
  { 'CustomError' : string } |
  { 'InvalidState' : string } |
  { 'Recoverable' : [number, number] } |
  { 'InsufficientFunds' : null } |
  { 'GamerWithdrawRepeatedly' : string } |
  { 'RuneIdNotMatch' : [string, string] };
export interface ExchangeState {
  'key' : [] | [string],
  'states' : Array<PoolState>,
  'game' : Game,
  'richswap_pool_address' : string,
  'rune_name' : string,
  'etching_key' : [] | [string],
  'orchestrator' : Principal,
  'game_status' : GameStatus,
  'btc_customs_principle' : Principal,
  'address' : [] | [string],
  'ii_canister' : Principal,
  'key_path' : string,
  'rune_id' : [] | [string],
}
export interface ExecuteTxArgs {
  'zero_confirmed_tx_queue_length' : number,
  'txid' : string,
  'intention_set' : IntentionSet,
  'intention_index' : number,
  'psbt_hex' : string,
}
export interface Game {
  'claimed_cookies' : bigint,
  'cookie_amount_per_claim' : bigint,
  'is_end' : boolean,
  'start_time' : bigint,
  'already_add_liquidity' : boolean,
  'claim_cooling_down' : bigint,
  'gamer_register_fee' : bigint,
}
export interface GameAndGamer {
  'claimed_cookies' : bigint,
  'cookie_amount_per_claim' : bigint,
  'is_end' : boolean,
  'gamer' : [] | [Gamer],
  'claim_cooling_down' : bigint,
  'gamer_register_fee' : bigint,
}
export type GameStatus = { 'AddLiquidity' : null } |
  { 'InitUtxo' : null } |
  { 'Play' : null } |
  { 'Withdrawable' : null } |
  { 'InitKey' : null };
export interface Gamer {
  'is_withdrawn' : boolean,
  'last_click_time' : bigint,
  'address' : string,
  'cookies' : bigint,
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
export interface PoolState {
  'id' : [] | [string],
  'utxo' : Utxo,
  'user_action' : UserAction,
  'nonce' : bigint,
}
export interface RegisterInfo {
  'tweaked_key' : string,
  'utxo' : Utxo,
  'untweaked_key' : string,
  'address' : string,
  'nonce' : bigint,
  'register_fee' : bigint,
}
export type RejectionCode = { 'NoError' : null } |
  { 'CanisterError' : null } |
  { 'SysTransient' : null } |
  { 'DestinationInvalid' : null } |
  { 'Unknown' : null } |
  { 'SysFatal' : null } |
  { 'CanisterReject' : null };
export type ReorgError = {
    'DuplicateBlock' : { 'height' : number, 'hash' : string }
  } |
  { 'BlockNotFoundInState' : { 'height' : number } } |
  { 'Unrecoverable' : null } |
  { 'Recoverable' : { 'height' : number, 'depth' : number } };
export type Result = { 'Ok' : bigint } |
  { 'Err' : ExchangeError };
export type Result_1 = { 'Ok' : string } |
  { 'Err' : string };
export type Result_2 = { 'Ok' : string } |
  { 'Err' : ExchangeError };
export type Result_3 = { 'Ok' : null } |
  { 'Err' : ExchangeError };
export type Result_4 = { 'Ok' : null } |
  { 'Err' : string };
export interface RollbackTxArgs { 'txid' : string }
export type UserAction = { 'Withdraw' : string } |
  { 'AddLiquidity' : null } |
  { 'Init' : null } |
  { 'Register' : string };
export interface Utxo {
  'maybe_rune' : [] | [CoinBalance],
  'sats' : bigint,
  'txid' : string,
  'vout' : number,
}
export interface _SERVICE {
  'claim' : ActorMethod<[], Result>,
  'end_game' : ActorMethod<[], undefined>,
  'etch_rune' : ActorMethod<[], Result_1>,
  'execute_tx' : ActorMethod<[ExecuteTxArgs], Result_1>,
  'get_chain_key_btc_address' : ActorMethod<[], [] | [string]>,
  'get_exchange_state' : ActorMethod<[], ExchangeState>,
  'get_game_and_gamer_infos' : ActorMethod<[string], GameAndGamer>,
  'get_minimal_tx_value' : ActorMethod<[GetMinimalTxValueArgs], bigint>,
  'get_pool_info' : ActorMethod<[GetPoolInfoArgs], [] | [PoolInfo]>,
  'get_pool_list' : ActorMethod<[], Array<PoolBasic>>,
  'get_pool_states' : ActorMethod<[], Array<PoolState>>,
  'get_register_info' : ActorMethod<[], RegisterInfo>,
  'init_key' : ActorMethod<[], Result_2>,
  'init_utxo' : ActorMethod<[Utxo], Result_3>,
  'new_block' : ActorMethod<[NewBlockInfo], Result_4>,
  'query_add_liquidity_info' : ActorMethod<[], AddLiquidityInfo>,
  'reset_blocks' : ActorMethod<[], undefined>,
  'rollback_tx' : ActorMethod<[RollbackTxArgs], Result_4>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
