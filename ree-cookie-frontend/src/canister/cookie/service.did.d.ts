import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface AddLiquidityInfo {
  'btc_amount_for_add_liquidity' : bigint,
  'rune_amount_for_add_liquidity' : bigint,
}
export interface CoinBalance { 'id' : string, 'value' : bigint }
export interface CookiePoolState {
  'txid' : string,
  'utxo' : Utxo,
  'user_action' : UserAction,
  'nonce' : bigint,
}
export interface CreateGameArgs {
  'rune_premine_amount' : bigint,
  'create_address' : string,
  'claim_amount_per_click' : bigint,
  'game_name' : string,
  'claim_cooling_down' : bigint,
  'gamer_register_fee' : bigint,
}
export interface EtchingArgs {
  'terms' : [] | [OrdinalsTerms],
  'turbo' : boolean,
  'premine' : [] | [bigint],
  'logo' : [] | [LogoParams],
  'rune_name' : string,
  'divisibility' : [] | [number],
  'premine_receiver' : string,
  'symbol' : [] | [string],
}
export type ExchangeError = { 'InvalidSignPsbtArgs' : string } |
  { 'InvalidNumeric' : null } |
  { 'ParseUtxoRuneBalanceError' : string } |
  { 'Overflow' : null } |
  { 'InvalidInput' : null } |
  { 'PoolAddressNotFound' : null } |
  { 'NatConvertError' : bigint } |
  { 'PoolNotFound' : string } |
  { 'RuneNotFound' : string } |
  { 'CookieBalanceInsufficient' : bigint } |
  { 'GameEnd' : null } |
  { 'GamerAlreadyExist' : string } |
  { 'DuplicateBlock' : [number, string] } |
  { 'PoolStateExpired' : bigint } |
  { 'GamerNotFound' : string } |
  { 'GameStatusNotMatch' : [GameStatus, GameStatus] } |
  { 'GameNotEnd' : null } |
  { 'TooSmallFunds' : null } |
  { 'Unrecoverable' : null } |
  { 'LastStateNotFound' : null } |
  { 'InvalidRuneId' : null } |
  { 'InvalidPool' : null } |
  { 'InvalidPsbt' : string } |
  { 'GameNotFound' : string } |
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
  { 'RuneIdNotMatch' : [string, string] } |
  { 'PoolAddressMismatch' : { 'actual' : string, 'expected' : string } };
export interface ExchangeState {
  'txid_game_map' : Array<[string, string]>,
  'games' : Array<[string, Game]>,
}
export interface ExecuteTxArgs {
  'zero_confirmed_tx_queue_length' : number,
  'txid' : string,
  'intention_set' : IntentionSet,
  'intention_index' : number,
  'psbt_hex' : string,
}
export interface Game {
  'creator' : Principal,
  'claimed_cookies' : bigint,
  'rune_premine_amount' : bigint,
  'creator_address' : string,
  'rune_info' : [] | [RuneInfo],
  'gamers' : Array<[string, Gamer]>,
  'claim_amount_per_click' : bigint,
  'game_id' : string,
  'game_status' : GameStatus,
  'game_name' : string,
  'etch_rune_commit_tx' : string,
  'pool_address' : [] | [string],
  'claim_cooling_down' : bigint,
  'gamer_register_fee' : bigint,
}
export interface GameAndPool {
  'game' : Game,
  'pool_state' : [] | [CookiePoolState],
  'pool_metadata' : [] | [Metadata],
}
export type GameStatus = { 'WaitAddedLiquidity' : null } |
  { 'Playing' : null } |
  { 'Withdrawing' : null } |
  { 'Etching' : null };
export interface Gamer {
  'is_withdrawn' : boolean,
  'last_click_time' : bigint,
  'address' : string,
  'cookies' : bigint,
}
export interface GetPoolInfoArgs { 'pool_address' : string }
export interface InputCoin { 'coin' : CoinBalance, 'from' : string }
export interface Intention {
  'input_coins' : Array<InputCoin>,
  'output_coins' : Array<OutputCoin>,
  'action' : string,
  'exchange_id' : string,
  'pool_utxo_spent' : Array<string>,
  'action_params' : string,
  'nonce' : bigint,
  'pool_address' : string,
  'pool_utxo_received' : Array<Utxo>,
}
export interface IntentionSet {
  'tx_fee_in_sats' : bigint,
  'initiator_address' : string,
  'intentions' : Array<Intention>,
}
export interface LogoParams {
  'content_type' : string,
  'content_base64' : string,
}
export interface Metadata {
  'key' : string,
  'name' : string,
  'key_derivation_path' : Array<Uint8Array | number[]>,
  'address' : string,
}
export interface NewBlockInfo {
  'block_hash' : string,
  'confirmed_txids' : Array<string>,
  'block_timestamp' : bigint,
  'block_height' : number,
}
export interface OrdinalsTerms {
  'cap' : bigint,
  'height' : [[] | [bigint], [] | [bigint]],
  'offset' : [[] | [bigint], [] | [bigint]],
  'amount' : bigint,
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
export type RejectionCode = { 'NoError' : null } |
  { 'CanisterError' : null } |
  { 'SysTransient' : null } |
  { 'DestinationInvalid' : null } |
  { 'Unknown' : null } |
  { 'SysFatal' : null } |
  { 'CanisterReject' : null };
export type Result = { 'Ok' : bigint } |
  { 'Err' : ExchangeError };
export type Result_1 = { 'Ok' : string } |
  { 'Err' : string };
export type Result_2 = { 'Ok' : null } |
  { 'Err' : string };
export interface RollbackTxArgs { 'txid' : string, 'reason_code' : string }
export interface RuneInfo { 'rune_name' : string, 'rune_id' : string }
export type UserAction = { 'Withdraw' : [string, string] } |
  { 'AddLiquidity' : null } |
  { 'Init' : null } |
  { 'Register' : [string, string] };
export interface Utxo {
  'coins' : Array<CoinBalance>,
  'sats' : bigint,
  'txid' : string,
  'vout' : number,
}
export interface _SERVICE {
  'claim' : ActorMethod<[string], Result>,
  'create_game' : ActorMethod<[CreateGameArgs], Result_1>,
  'etch' : ActorMethod<[EtchingArgs], Result_1>,
  'etch_rune' : ActorMethod<[string, string], Result_1>,
  'execute_tx' : ActorMethod<[ExecuteTxArgs], Result_1>,
  'finalize_etch' : ActorMethod<[string], Result_1>,
  'game_address' : ActorMethod<[string], Result_1>,
  'get_exchange_state' : ActorMethod<[], ExchangeState>,
  'get_game_info' : ActorMethod<[string], [] | [GameAndPool]>,
  'get_game_pool_address' : ActorMethod<[string], string>,
  'get_games_info' : ActorMethod<[], Array<GameAndPool>>,
  'get_pool_info' : ActorMethod<[GetPoolInfoArgs], [] | [PoolInfo]>,
  'get_pool_list' : ActorMethod<[], Array<PoolBasic>>,
  'new_block' : ActorMethod<[NewBlockInfo], Result_2>,
  'query_add_liquidity_info' : ActorMethod<[string], AddLiquidityInfo>,
  'query_etching_list' : ActorMethod<[string], Array<string>>,
  'rollback_tx' : ActorMethod<[RollbackTxArgs], Result_2>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
